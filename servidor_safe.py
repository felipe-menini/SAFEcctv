#!/usr/bin/env python3
"""SAFE single-service server: SQLite, private immutable media and server-side roles."""
from __future__ import annotations
import argparse
import base64
from collections import defaultdict, deque
from contextlib import contextmanager, closing
import getpass
import hashlib
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import tempfile
import time
from urllib.parse import parse_qs, unquote, urlsplit
import zipfile
import safe_access as access

MODULES = access.MODULES
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
MAX_REQUEST = 40 * 1024 * 1024
MAX_IMAGE = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 25_000_000
ROUNDS = 600_000
SCHEMA = '''
CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY, role TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, username TEXT NOT NULL, csrf TEXT NOT NULL, expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS plans(owner TEXT NOT NULL,id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(owner,id));
CREATE TABLE IF NOT EXISTS media(hash TEXT PRIMARY KEY,mime TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS media_acl(hash TEXT NOT NULL, owner TEXT NOT NULL,PRIMARY KEY(hash,owner));
CREATE TABLE IF NOT EXISTS pdfs(id TEXT PRIMARY KEY, payload BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY);
'''

class Problem(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ROUNDS).hex()


class Store:
    def __init__(self, directory, bootstrap=None):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.media_dir = self.directory / 'media'
        self.media_dir.mkdir(exist_ok=True)
        self.dbfile = self.directory / 'safe.sqlite3'
        with self.connect() as db:
            db.executescript(SCHEMA)
            if not db.execute('SELECT 1 FROM users LIMIT 1').fetchone():
                if not bootstrap or any(not bootstrap.get(name) for name in ('fmenini', 'smenini')):
                    raise ValueError('Base vacÃ­a: configure SAFE_ADMIN_PASSWORD y SAFE_CCTV_PASSWORD antes del primer inicio.')
                for name, role in [('fmenini', 'admin'), ('smenini', 'cctv')]:
                    salt = secrets.token_hex(16)
                    db.execute('INSERT INTO users VALUES(?,?,?,?)', (name, role, salt, password_hash(bootstrap[name], salt)))
            access.migrate(db)
            db.execute('INSERT OR IGNORE INTO workspace VALUES(1,0,?)', (json.dumps({'settings':{}, 'catalog':[], 'saved':[], 'packages':[], 'suppliers':[], 'draft':None}),))

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.dbfile, timeout=20)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('PRAGMA foreign_keys=ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    def password(self, name, password):
        if not access.password_valid(password):
            raise ValueError('Use al menos 15 caracteres, o un PIN de 6+ dígitos, y como máximo 1024 bytes UTF-8.')
        with self.connect() as db:
            salt = secrets.token_hex(16)
            if not db.execute('UPDATE users SET salt=?,hash=?,must_change=0 WHERE name=?', (salt, password_hash(password,salt), name)).rowcount:
                raise ValueError('Usuario desconocido')
            db.execute('DELETE FROM sessions WHERE username=?', (name,))

    def image(self, value, owner, db):
        if value.startswith('/media/'):
            digest = value.removeprefix('/media/')
            if not re.fullmatch('[a-f0-9]{64}', digest) or not self.media_access(digest, owner, db):
                raise Problem(422, 'Referencia de imagen invÃ¡lida o sin permiso')
            return value
        if not value.startswith('data:image/'):
            raise Problem(422, 'Solo se admiten imÃ¡genes subidas a SAFE (PNG, JPEG, WebP)')
        match = re.fullmatch(r'data:image/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)', value)
        if not match or len(value) > MAX_IMAGE * 1.4:
            raise Problem(422, 'Formato de imagen no permitido o imagen mayor a 12 MB')
        try:
            raw = base64.b64decode(match[1], validate=True)
            if len(raw) > MAX_IMAGE:
                raise ValueError()
            with Image.open(io.BytesIO(raw)) as source:
                if source.format not in ('PNG','JPEG','WEBP') or source.width * source.height > Image.MAX_IMAGE_PIXELS:
                    raise ValueError()
                source.load()
                image = ImageOps.exif_transpose(source)
                image.thumbnail((4096,4096), Image.Resampling.LANCZOS)
                out = io.BytesIO()
                # Strip EXIF/GPS; PNG keeps fine plan text/alpha lossless, photos use high-quality WebP.
                alpha = 'A' in image.getbands() or 'transparency' in image.info
                if alpha or source.format == 'PNG':
                    image.convert('RGBA' if alpha else 'RGB').save(out, format='PNG', optimize=True)
                    mime = 'image/png'
                else:
                    image.convert('RGB').save(out, format='WEBP', quality=90, method=4)
                    mime = 'image/webp'
                content = out.getvalue()
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
            raise Problem(422, 'La imagen no se puede decodificar o excede los lÃ­mites') from exc
        digest = hashlib.sha256(content).hexdigest()
        target = self.media_dir / digest
        if not target.exists():
            temp = self.media_dir / (digest + '.' + secrets.token_hex(8) + '.tmp')
            temp.write_bytes(content)
            os.replace(temp, target)
        db.execute('INSERT OR IGNORE INTO media VALUES(?,?)', (digest,mime))
        db.execute('INSERT OR IGNORE INTO media_acl VALUES(?,?)', (digest,owner))
        return '/media/' + digest

    def media_access(self, digest, owner, db):
        return access.media_access(self,digest,owner,db)

    def dehydrate(self, value, owner, db, depth=0):
        if depth > 70:
            raise Problem(422, 'Documento demasiado anidado')
        if isinstance(value, str):
            if value.startswith(('data:image/', '/media/')):
                return self.image(value,owner,db)
            return value
        if isinstance(value, list):
            return [self.dehydrate(v,owner,db,depth+1) for v in value]
        if isinstance(value, dict):
            return {k:self.dehydrate(v,owner,db,depth+1) for k,v in value.items()}
        return value

    def hydrate(self, value, db, portable=False, path=()):
        if isinstance(value,str) and value.startswith('/media/'):
            # Product thumbnails remain authenticated URLs; all plan/photo/logo/export contracts keep data URLs.
            if not portable and len(path)==3 and path[0]=='catalog' and path[2]=='image':
                return value
            row = db.execute('SELECT mime FROM media WHERE hash=?', (value[7:],)).fetchone()
            if not row:
                raise Problem(500, 'Imagen ausente; restaure el volumen completo')
            return 'data:'+row['mime']+';base64,'+base64.b64encode((self.media_dir/value[7:]).read_bytes()).decode()
        if isinstance(value,list):
            return [self.hydrate(v,db,portable,path+(str(i),)) for i,v in enumerate(value)]
        if isinstance(value,dict):
            return {k:self.hydrate(v,db,portable,path+(k,)) for k,v in value.items()}
        return value

    def workspace(self, portable=False):
        with self.connect() as db:
            row = db.execute('SELECT revision,payload FROM workspace WHERE id=1').fetchone()
            return {'revision':row['revision'], 'workspace':self.hydrate(json.loads(row['payload']),db,portable)}

    def validate_workspace(self, w):
        if not isinstance(w,dict) or not isinstance(w.get('settings'),dict):
            raise Problem(422,'ConfiguraciÃ³n invÃ¡lida')
        for key, limit in [('catalog',5000),('saved',10000),('suppliers',2000),('packages',2000)]:
            if not isinstance(w.get(key),list) or len(w[key])>limit or not all(isinstance(x,dict) for x in w[key]):
                raise Problem(422,'Lista invÃ¡lida: '+key)
        if w.get('draft') is not None and not isinstance(w['draft'],dict):
            raise Problem(422,'Borrador invÃ¡lido')
        return {k:w.get(k) for k in ('settings','catalog','saved','suppliers','packages','draft')}

    def save_workspace(self, w, revision, owner):
        w = self.validate_workspace(w)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            current=db.execute('SELECT revision FROM workspace WHERE id=1').fetchone()[0]
            if not isinstance(revision,int) or current != revision:
                raise Problem(409,'Hay cambios en otro navegador. Exporte sus cambios pendientes y recargue antes de continuar.')
            payload=json.dumps(self.dehydrate(w,owner,db),ensure_ascii=False,allow_nan=False)
            db.execute('UPDATE workspace SET revision=revision+1,payload=? WHERE id=1',(payload,))
        return {'ok':True,'revision':revision+1}

    def seeds(self, legacy):
        seeds={}
        for key, path in [('catalog','catalogo/catalogo.json'),('suppliers','proveedores/proveedores.json')]:
            file=Path(legacy)/path
            if file.exists():
                values=json.loads(file.read_text(encoding='utf-8-sig'))
                seeds[key]=values if isinstance(values,list) else values.get('products' if key=='catalog' else 'suppliers',[])
        return seeds

    def migrate(self, legacy):
        legacy = Path(legacy)
        if not legacy.is_dir(): raise ValueError('Directorio legado no encontrado')
        seeds=self.seeds(legacy)
        digest=hashlib.sha256(json.dumps(seeds,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        marker='seeds-'+digest
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if not seeds or db.execute('SELECT 1 FROM migrations WHERE name=?',(marker,)).fetchone():
                return False
            current=db.execute('SELECT revision FROM workspace WHERE id=1').fetchone()[0]
            if current == 0:
                w={'settings':{},'catalog':[],'saved':[],'packages':[],'suppliers':[],'draft':None}
                w['catalog']=seeds.get('catalog',[])
                w['suppliers']=seeds.get('suppliers',[])
                for file in sorted((legacy/'cotizaciones').glob('SAFE-*.json')):
                    record=json.loads(file.read_text(encoding='utf-8-sig'))
                    if isinstance(record.get('quote'),dict):
                        w['saved'].append(record['quote'])
                w=self.validate_workspace(w)
                payload=self.dehydrate(w,'fmenini',db)
                db.execute('UPDATE workspace SET revision=1,payload=? WHERE id=1',(json.dumps(payload,ensure_ascii=False),))
                for file in sorted((legacy/'cotizaciones').glob('SAFE-*.pdf')):
                    raw=file.read_bytes()
                    if raw.startswith(b'%PDF-'):
                        db.execute('INSERT OR IGNORE INTO pdfs VALUES(?,?)',(file.name,raw))
                db.execute("INSERT INTO migrations VALUES('legacy-v1')")
            else:
                # Workspace already in use: merge seeds by id so client data survives deployments.
                w=json.loads(db.execute('SELECT payload FROM workspace WHERE id=1').fetchone()[0])
                w=self.validate_workspace(w)
                catalog={p['id']:p for p in w['catalog']}
                for product in seeds.get('catalog',[]):
                    catalog[product['id']]=self.dehydrate(product,'fmenini',db)
                w['catalog']=list(catalog.values())
                suppliers={s.get('id') or s.get('name'):s for s in w['suppliers']}
                for supplier in seeds.get('suppliers',[]):
                    suppliers[supplier.get('id') or supplier.get('name')]=supplier
                w['suppliers']=list(suppliers.values())
                payload=json.dumps(w,ensure_ascii=False,allow_nan=False)
                if payload != db.execute('SELECT payload FROM workspace WHERE id=1').fetchone()[0]:
                    db.execute('UPDATE workspace SET revision=revision+1,payload=? WHERE id=1',(payload,))
            db.execute('INSERT INTO migrations VALUES(?)',(marker,))
        return True

    def backup(self, output):
        # SQLite online backup gives a consistent committed DB; immutable media are never garbage-collected.
        temp=self.directory / ('backup-'+secrets.token_hex(8)+'.sqlite3')
        try:
            with self.connect() as source, closing(sqlite3.connect(temp)) as target:
                source.backup(target)
            with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
                archive.write(temp,'safe.sqlite3')
                with closing(sqlite3.connect(temp)) as db:
                    for (digest,) in db.execute('SELECT hash FROM media'):
                        archive.write(self.media_dir/digest,'media/'+digest)
        finally:
            temp.unlink(missing_ok=True)


def restore_backup(archive_path, directory):
    directory=Path(directory).resolve()
    directory.parent.mkdir(parents=True,exist_ok=True)
    if directory.exists() and (not directory.is_dir() or any(directory.iterdir())):
        raise ValueError('Restaure únicamente en un directorio vacío y con el servicio detenido')
    with tempfile.TemporaryDirectory(prefix='safe-restore-',dir=directory.parent) as staging:
        stage=Path(staging)
        with zipfile.ZipFile(archive_path) as archive:
            files=archive.infolist()
            names=[i.filename for i in files]
            if len(names)!=len(set(names)) or 'safe.sqlite3' not in names or sum(i.file_size for i in files)>20*1024**3:
                raise ValueError('Respaldo inválido o demasiado grande')
            for item in files:
                if item.filename!='safe.sqlite3' and not re.fullmatch('media/[a-f0-9]{64}',item.filename):
                    raise ValueError('Ruta no admitida en respaldo')
            archive.extractall(stage)
        try:
            with closing(sqlite3.connect(stage/'safe.sqlite3')) as db:
                if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
                    raise ValueError('Base dañada')
                # Validate required schema before promoting staged data.
                db.execute('SELECT name,role,salt,hash FROM users LIMIT 1').fetchone()
                db.execute('SELECT revision,payload FROM workspace WHERE id=1').fetchone()
                db.execute('SELECT owner,id,revision,payload FROM plans LIMIT 1').fetchone()
                for (digest,) in db.execute('SELECT hash FROM media'):
                    file=stage/'media'/digest
                    if not re.fullmatch('[a-f0-9]{64}',digest) or not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=digest:
                        raise ValueError('Respaldo incompleto o imagen dañada')
                db.execute('DELETE FROM sessions')
                db.commit()
        except sqlite3.DatabaseError as exc:
            raise ValueError('Base de respaldo inválida') from exc
        (stage/'media').mkdir(exist_ok=True)
        if directory.exists(): directory.rmdir()  # Only succeeds if still empty.
        os.replace(stage,directory)


PUBLIC={'/password':'password.html','/password.js':'password.js','/login':'login.html','/login.js':'login.js','/auth.css':'auth.css'}
ADMIN_FILES={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/technical.js':'technical.js','/pdf.js':'pdf.js','/planner-integration.js':'planner-integration.js','/styles.css':'styles.css','/dark-theme.css':'dark-theme.css','/planner-integration.css':'planner-integration.css'}
SHARED={'/uuid.js':'uuid.js','/access.js':'access.js','/cctv':'cctv.html','/cctv.js':'cctv.js','/safe-server.js':'safe-server.js','/theme.js':'theme.js','/planner-document.js':'planner-document.js','/auth.css':'auth.css'}
# Only immutable presentation assets, never directory listings or arbitrary source files.
for file in (ROOT/'assets').glob('*'):
    if file.is_file() and file.suffix.lower() in ('.png','.jpg','.jpeg','.webp','.svg','.ico','.js'):
        ADMIN_FILES['/assets/'+file.name]='assets/'+file.name


class Handler(BaseHTTPRequestHandler):
    server_version='SAFE'
    def log_message(self, fmt,*args):
        # No query strings, credentials, session tokens or payloads in logs.
        if len(args)>1:
            print(f'{self.client_address[0]} {self.command} {args[1]}',flush=True)

    def reply(self,status,data=b'',mime='application/json; charset=utf-8',headers=None):
        if isinstance(data,(dict,list)):
            data=json.dumps(data,ensure_ascii=False,allow_nan=False).encode()
        if isinstance(data,str): data=data.encode()
        self.send_response(status)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.send_header('X-Frame-Options','SAMEORIGIN')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://uy.dolarapi.com; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")
        for k,v in (headers or {}).items(): self.send_header(k,v)
        self.end_headers()
        if self.command!='HEAD': self.wfile.write(data)

    def json_body(self):
        if self.headers.get('Transfer-Encoding'):
            raise Problem(400,'Transfer-Encoding no admitido')
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':
            raise Problem(415,'Se esperaba application/json')
        try: size=int(self.headers.get('Content-Length','0'))
        except ValueError: raise Problem(400,'Content-Length invÃ¡lido')
        if not 0<size<=MAX_REQUEST: raise Problem(413,'Carga fuera de lÃ­mite (40 MB por peticiÃ³n)')
        try:
            data=json.loads(self.rfile.read(size),parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
            if not isinstance(data,dict): raise ValueError()
            return data
        except (ValueError,UnicodeDecodeError): raise Problem(400,'JSON invÃ¡lido')

    def user(self):
        cookie=SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: pass
        token=cookie.get('safe_session')
        if not token: return None
        digest=hashlib.sha256(token.value.encode()).hexdigest()
        with self.server.store.connect() as db:
            return db.execute('SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.name=s.username WHERE s.token=? AND s.expires>? AND u.active=1',(digest,time.time())).fetchone()

    def origin(self):
        origin=self.headers.get('Origin')
        if origin:
            parsed=urlsplit(origin)
            if parsed.scheme not in ('http','https') or parsed.netloc!=self.headers.get('Host'):
                raise Problem(403,'Origen no autorizado')
        if self.headers.get('Sec-Fetch-Site')=='cross-site': raise Problem(403,'PeticiÃ³n entre sitios no admitida')

    def do_HEAD(self): self.dispatch()
    def do_GET(self): self.dispatch()
    def do_POST(self): self.dispatch()
    def dispatch(self):
        try: self.route()
        except Problem as error: self.reply(error.code,{'error':error.message})
        except (BrokenPipeError,ConnectionResetError): pass
        except Exception as error:
            print('SAFE request failed:',type(error).__name__,flush=True)
            self.reply(500,{'error':'Error interno; revise los registros del servidor'})

    def route(self):
        path=unquote(urlsplit(self.path).path)
        if '\\' in path or any(p in ('.','..') for p in path.split('/')): raise Problem(403,'Ruta protegida')
        if path=='/healthz' and self.command in ('GET','HEAD'):
            with self.server.store.connect() as db: db.execute('SELECT 1').fetchone()
            return self.reply(200,{'ok':True})
        if path in PUBLIC and self.command in ('GET','HEAD'):
            return self.static(PUBLIC[path])
        if path=='/api/login' and self.command=='POST': return self.login()
        user=self.user()
        if not user:
            if not path.startswith(('/api/','/media/')) and self.command in ('GET','HEAD'):
                return self.reply(303,b'',headers={'Location':'/login'})
            raise Problem(401,'Inicie sesiÃ³n')
        name,role=user['name'],user['role']
        admin=role=='admin'
        allowed=set(access.modules(user))
        if self.command=='POST':
            self.throttle('write:'+name,180,60)
            self.origin()
            if not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),user['csrf']): raise Problem(403,'Token CSRF invÃ¡lido')
        if path=='/api/me' and self.command in ('GET','HEAD'):
            return self.reply(200,dict(access.info(user),csrf=user['csrf']))
        if path=='/api/logout' and self.command=='POST':
            with self.server.store.connect() as db: db.execute('DELETE FROM sessions WHERE username=? AND csrf=?',(name,user['csrf']))
            return self.reply(200,{'ok':True},headers={'Set-Cookie':self.cookie('',0)})
        if path=='/api/password' and self.command=='POST':
            data=self.json_body()
            self.reauthenticate(user,data.get('current'))
            try: self.server.store.password(name,data.get('password'))
            except ValueError as e: raise Problem(422,str(e))
            return self.reply(200,{'ok':True},headers={'Set-Cookie':self.cookie('',0)})
        if user['must_change']:
            raise Problem(403,'Debe cambiar la contraseña antes de acceder a los datos')
        if path in ('/api/users','/users','/users.js') or path.startswith('/api/users/'):
            if not admin: raise Problem(403,'Se requiere acceso administrador')
            if path in ('/users','/users.js') and self.command in ('GET','HEAD'):
                return self.static('users.html' if path=='/users' else 'users.js')
            return self.users(path,user)
        if path=='/session.js' and self.command in ('GET','HEAD'):
            boot=dict(access.info(user),csrf=user['csrf'])
            if admin or allowed & access.WORKSPACE_MODULES: boot.update(access.workspace(self.server.store,user))
            elif 'ayuda' in allowed: boot.update(revision=0,workspace={})
            raw=json.dumps(boot,ensure_ascii=False).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
            return self.reply(200,'window.__SAFE_BOOT='+raw+';', 'text/javascript; charset=utf-8')
        if path.startswith('/media/') and self.command in ('GET','HEAD'):
            digest=path[7:]
            if not re.fullmatch('[a-f0-9]{64}',digest): raise Problem(404,'Imagen desconocida')
            with self.server.store.connect() as db:
                if not self.server.store.media_access(digest,name,db): raise Problem(403,'Imagen sin permiso')
                mime=db.execute('SELECT mime FROM media WHERE hash=?',(digest,)).fetchone()[0]
            return self.reply(200,(self.server.store.media_dir/digest).read_bytes(),mime)
        if path=='/api/media' and self.command=='POST':
            data=self.json_body()
            module=data.get('module','plano')
            if module not in allowed: raise Problem(403,'Módulo no autorizado')
            if not isinstance(data.get('image'),str): raise Problem(422,'Imagen inválida')
            with self.server.store.connect() as db:
                url=self.server.store.image(data['image'],name,db)
                db.execute('INSERT OR IGNORE INTO media_modules VALUES(?,?,?)',(url[7:],name,module))
            return self.reply(200,{'url':url})
        if path=='/api/plans' or path.startswith('/api/plans/'):
            if 'plano' not in allowed: raise Problem(403,'Módulo no autorizado')
            return self.plans(path,name,admin)
        if path in ('/cctv','/cctv.js','/planner-document.js') and 'plano' not in allowed:
            raise Problem(403,'Módulo no autorizado')
        if path in ADMIN_FILES:
            if not admin and not allowed & access.WORKSPACE_MODULES and 'ayuda' not in allowed:
                raise Problem(403,'Módulo no autorizado')
            if self.command in ('GET','HEAD'): return self.static(ADMIN_FILES[path])
        if path in SHARED and self.command in ('GET','HEAD'): return self.static(SHARED[path])
        endpoint_modules={'/api/catalogo':'catalogo','/api/proveedores':'proveedores','/api/presupuestos':'presupuestos','/api/pdf':'presupuestos'}
        required=endpoint_modules.get(path)
        if required and required not in allowed: raise Problem(403,'Módulo no autorizado')
        if path in ('/api/import','/api/export','/api/guardar','/api/eliminar') and not admin:
            raise Problem(403,'Se requiere acceso administrador')
        if path=='/api/workspace':
            if not admin and not allowed & access.WORKSPACE_MODULES: raise Problem(403,'Módulo no autorizado')
            if self.command in ('GET','HEAD'): return self.reply(200,access.workspace(self.server.store,user))
            data=self.json_body()
            return self.reply(200,access.save_workspace(self.server.store,user,data.get('workspace'),data.get('revision'),Problem))
        if path=='/api/import' and self.command=='POST':
            data=self.json_body(); backup=data.get('backup',{})
            if backup.get('format')!='safe-security-cotizador-v1': raise Problem(422,'Formato incompatible')
            return self.reply(200,self.server.store.save_workspace(backup,data.get('revision'),name))
        if path=='/api/export' and self.command in ('GET','HEAD'):
            w=self.server.store.workspace(True)['workspace']
            return self.reply(200,dict(w,format='safe-security-cotizador-v1'))
        if path=='/api/status' and self.command in ('GET','HEAD'): return self.reply(200,{'safeCotizador':True,'modo':'servidor','authenticated':True})
        legacy={'/api/catalogo':('catalog','products'),'/api/proveedores':('suppliers','suppliers'),'/api/presupuestos':('saved','quotes')}
        if path in legacy and self.command in ('GET','HEAD'):
            key,out=legacy[path]
            return self.reply(200,{out:access.workspace(self.server.store,user)['workspace'][key]})
        if path in legacy or path in ('/api/guardar','/api/eliminar'):
            raise Problem(410,'Use workspace con revisiÃ³n para evitar pÃ©rdida de cambios')
        if path=='/api/pdf' and self.command=='POST':
            data=self.json_body()
            try: pdf=base64.b64decode(data.get('pdfBase64',''),validate=True)
            except ValueError: raise Problem(422,'PDF invÃ¡lido')
            key=str(data.get('id',''))
            if not re.fullmatch(r'[\w-]{1,120}',key) or data.get('currency') not in ('USD','UYU') or not pdf.startswith(b'%PDF-') or len(pdf)>12*1024*1024: raise Problem(422,'PDF invÃ¡lido')
            with self.server.store.connect() as db: db.execute('INSERT OR REPLACE INTO pdfs VALUES(?,?)',((key if admin else name+':'+key)+'-'+data['currency'],pdf))
            return self.reply(200,{'ok':True})
        raise Problem(404,'Ruta desconocida')

    def static(self,file):
        import mimetypes
        return self.reply(200,(ROOT/file).read_bytes(),mimetypes.guess_type(file)[0] or 'application/octet-stream')

    def cookie(self,token,age):
        return f'safe_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={age}'+('; Secure' if self.server.secure_cookie else '')

    def login(self):
        self.origin(); data=self.json_body()
        username=data.get('username',''); password=data.get('password','')
        if not isinstance(username,str) or len(username)>100 or not access.password_input(password): raise Problem(401,'Usuario o contraseña incorrectos')
        now=time.time()
        self.throttle('login',15,300)
        with self.server.store.connect() as db:
            account=db.execute('SELECT * FROM users WHERE name=?',(username,)).fetchone()
            calculated=password_hash(password,account['salt'] if account else '00'*16)
            if not account or not account['active'] or (account['role']!='admin' and not access.modules(account)) or not secrets.compare_digest(calculated,account['hash']): raise Problem(401,'Usuario o contraseÃ±a incorrectos')
            token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32);age=8*3600
            db.execute('DELETE FROM sessions WHERE expires<?',(now,))
            db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),username,csrf,now+age))
        return self.reply(200,dict(access.info(account),csrf=csrf),headers={'Set-Cookie':self.cookie(token,age)})

    def throttle(self,scope,limit=60,seconds=300):
        now=time.time(); key=(scope,self.client_address[0])
        with self.server.attempt_lock:
            attempts=self.server.attempts[key]
            while attempts and attempts[0]<now-seconds: attempts.popleft()
            if len(attempts)>=limit: raise Problem(429,'Demasiados intentos. Espere antes de reintentar.')
            attempts.append(now)

    def reauthenticate(self,user,password):
        if not self.server.secure_cookie and self.client_address[0] not in ('127.0.0.1','::1'):
            raise Problem(403,'Configure HTTPS para las operaciones sensibles fuera de localhost')
        self.throttle('reauth:'+user['name'],8)
        if not access.password_input(password): raise Problem(403,'No se pudo verificar la identidad')
        if not secrets.compare_digest(password_hash(password,user['salt']),user['hash']):
            raise Problem(403,'No se pudo verificar la identidad')
        with self.server.attempt_lock: self.server.attempts.pop(('reauth:'+user['name'],self.client_address[0]),None)

    def users(self,path,user):
        if self.command in ('GET','HEAD') and path=='/api/users':
            with self.server.store.connect() as db:
                accounts=[access.info(r) for r in db.execute('SELECT * FROM users ORDER BY name')]
            return self.reply(200,{'users':accounts,'modules':list(MODULES)})
        if self.command!='POST': raise Problem(405,'Método no admitido')
        data=self.json_body()
        self.throttle('users:'+user['name'],50)
        self.reauthenticate(user,data.get('current'))
        creating=path=='/api/users'
        name=data.get('name') if creating else path.removeprefix('/api/users/')
        if not isinstance(name,str) or not re.fullmatch('[a-z][a-z0-9_.-]{2,63}',name): raise Problem(422,'Usuario inválido (3–64 caracteres)')
        if set(data)-{'name','modules','password','current','active','role'}: raise Problem(422,'Campo no admitido')
        with self.server.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            target=db.execute('SELECT * FROM users WHERE name=?',(name,)).fetchone()
            if creating and target: raise Problem(422,'No se puede crear esta cuenta')
            if not creating and not target: raise Problem(422,'No se puede actualizar esta cuenta')
            role=data.get('role','user' if creating else target['role'])
            if role not in ('user','admin','cctv'): raise Problem(422,'Rol inválido')
            active=data.get('active',True if creating else bool(target['active']))
            if type(active) is not bool: raise Problem(422,'Estado inválido')
            granted=data.get('modules',[] if creating else json.loads(target['modules']))
            if not isinstance(granted,list) or any(not isinstance(m,str) or m not in MODULES for m in granted) or len(granted)!=len(set(granted)):
                raise Problem(422,'Módulos inválidos')
            granted=[m for m in MODULES if m in granted]
            if name==user['name'] and (not active or role!='admin' or 'modules' in data):
                raise Problem(422,'No puede desactivar ni limitar su propia cuenta administrativa')
            if name=='fmenini' and (not active or role!='admin'): raise Problem(422,'La cuenta principal debe conservar acceso administrador')
            if target and target['role']=='admin' and (role!='admin' or not active):
                if db.execute("SELECT count(*) FROM users WHERE role='admin' AND active=1").fetchone()[0]<=1:
                    raise Problem(422,'Debe conservar al menos un administrador activo')
            password=data.get('password')
            if creating or password is not None:
                if not access.password_valid(password): raise Problem(422,'Use al menos 15 caracteres, o un PIN de 6+ dígitos, y como máximo 1024 bytes UTF-8')
                salt=secrets.token_hex(16); hashed=password_hash(password,salt)
            if creating:
                db.execute('INSERT INTO users(name,role,salt,hash,active,modules,must_change) VALUES(?,?,?,?,?,?,1)',(name,role,salt,hashed,int(active),json.dumps(granted)))
            else:
                db.execute('UPDATE users SET role=?,active=?,modules=? WHERE name=?',(role,int(active),json.dumps(granted),name))
                if password is not None: db.execute('UPDATE users SET salt=?,hash=?,must_change=1 WHERE name=?',(salt,hashed,name))
            db.execute('DELETE FROM sessions WHERE username=?',(name,))
            result=access.info(db.execute('SELECT * FROM users WHERE name=?',(name,)).fetchone())
        return self.reply(200,{'ok':True,'user':result})

    def plans(self,path,username,admin=False):
        store=self.server.store
        owner=parse_qs(urlsplit(self.path).query).get("owner",[username])[0]
        if owner!=username and not admin: raise Problem(403,"No puede acceder a planos de otro usuario")
        with store.connect() as db:
            if not db.execute('SELECT 1 FROM users WHERE name=?',(owner,)).fetchone(): raise Problem(422,'Propietario desconocido')
        if path=='/api/plans':
            if self.command not in ('GET','HEAD'): raise Problem(405,'MÃ©todo no admitido')
            with store.connect() as db:
                rows=db.execute('SELECT * FROM plans ORDER BY owner,id') if admin else db.execute('SELECT * FROM plans WHERE owner=? ORDER BY id',(owner,))
                plans=[{'id':r['id'],'owner':r['owner'],'name':json.loads(r['payload']).get('name','Plano'),'revision':r['revision']} for r in rows]
            return self.reply(200,{'plans':plans})
        plan_id=path.removeprefix('/api/plans/')
        if not re.fullmatch(r'[\w-]{1,100}',plan_id): raise Problem(422,'Identificador de plano invÃ¡lido')
        with store.connect() as db:
            if self.command=='POST': db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT * FROM plans WHERE owner=? AND id=?',(owner,plan_id)).fetchone()
            if self.command in ('GET','HEAD'):
                if not row: raise Problem(404,'Plano no encontrado')
                return self.reply(200,{'revision':row['revision'],'plan':store.hydrate(json.loads(row['payload']),db,True)})
            data=self.json_body()
            revision=row['revision'] if row else 0
            if data.get('revision')!=revision: raise Problem(409,'Plano modificado en otro navegador; exporte y recargue')
            plan=data.get('plan')
            if not isinstance(plan,dict) or not isinstance(plan.get('name'),str) or not all(isinstance(plan.get(k,[]),list) for k in ('cameras','shapes')): raise Problem(422,'Plano invÃ¡lido')
            payload=store.dehydrate(plan,username,db)
            def grant(value):
                if isinstance(value,str) and value.startswith('/media/'):
                    db.execute('INSERT OR IGNORE INTO media_acl VALUES(?,?)',(value[7:],owner))
                elif isinstance(value,dict):
                    for item in value.values(): grant(item)
                elif isinstance(value,list):
                    for item in value: grant(item)
            grant(payload)
            db.execute('INSERT OR REPLACE INTO plans VALUES(?,?,?,?)',(owner,plan_id,revision+1,json.dumps(payload,ensure_ascii=False,allow_nan=False)))
        return self.reply(200,{'ok':True,'revision':revision+1})


def create_server(host, port, directory, bootstrap=None, secure_cookie=False):
    server=ThreadingHTTPServer((host,port),Handler)
    try: server.store=Store(directory,bootstrap)
    except Exception: server.server_close();raise
    server.secure_cookie=secure_cookie
    server.attempts=defaultdict(deque)
    server.attempt_lock=threading.Lock()
    server.daemon_threads=True
    return server


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',nargs='?',default='serve',choices=('serve','password','backup','restore','migrate'))
    parser.add_argument('argument',nargs='?')
    parser.add_argument('--data-dir',default=os.environ.get('SAFE_DATA_DIR',str(ROOT/'data')))
    args=parser.parse_args()
    bootstrap={'fmenini':os.environ.get('SAFE_ADMIN_PASSWORD'),'smenini':os.environ.get('SAFE_CCTV_PASSWORD')}
    if args.command=='restore':
        if not args.argument: parser.error('Indique archivo ZIP')
        restore_backup(args.argument,args.data_dir);print('Restaurado; sesiones revocadas.');return
    store=Store(args.data_dir,bootstrap)
    if args.command=='password':
        if not args.argument: parser.error('Indique usuario')
        password=getpass.getpass('Nueva contraseña (15+ caracteres o PIN 6+ dígitos): ')
        if password!=getpass.getpass('Repetir contraseÃ±a: '): parser.error('Las contraseÃ±as no coinciden')
        store.password(args.argument,password);print('ContraseÃ±a actualizada y sesiones revocadas.');return
    if args.command=='backup':
        if not args.argument: parser.error('Indique ZIP de destino')
        store.backup(args.argument);print('Respaldo completo creado.');return
    if args.command=='migrate':
        if not args.argument: parser.error('Indique directorio legado')
        print('MigraciÃ³n importada.' if store.migrate(args.argument) else 'MigraciÃ³n ya aplicada, sin cambios.');return
    legacy=os.environ.get('SAFE_LEGACY_DIR')
    if legacy: store.migrate(legacy)
    host=os.environ.get('SAFE_HOST','127.0.0.1');port=int(os.environ.get('SAFE_PORT','8787'))
    with create_server(host,port,args.data_dir,secure_cookie=os.environ.get('SAFE_SECURE_COOKIE','0')=='1') as server:
        print(f'SAFE http://{host}:{port} â€” datos: {store.directory}',flush=True)
        server.serve_forever()

if __name__=='__main__':
    try: main()
    except (ValueError,OSError) as exc:
        raise SystemExit(str(exc))
