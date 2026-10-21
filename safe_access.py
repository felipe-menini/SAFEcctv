"""SAFE access contract. All projection/merge decisions live here, not in UI buttons."""
import hashlib
import json
import math
import re
import secrets

MODULES = ('cotizador','plano','relevamiento','paquetes','almacenamiento','presupuestos','catalogo','proveedores','configuracion','ayuda')
SHARED_FIELDS = {'settings':'configuracion','catalog':'catalogo','packages':'paquetes','suppliers':'proveedores'}
TECH_FIELDS = {'survey':'relevamiento','storagePlan':'almacenamiento','cctvPlan':'plano'}
PUBLIC_SETTINGS = {'companyName','companyPhone','companyEmail','companyWeb','companyAddress','logoData','saleTaxRate','purchaseTaxRate','serviceTaxRate','taxMode','currencyDecimals'}
PRODUCT_FIELDS = {'id','name','category','currency','taxIncluded','image','description'}
QUOTE_FIELDS = set('id number clientName clientPhone clientAddress issueDate validDays pdfCurrency attachPlanSchematic fxRate fxUpdatedAt fxSource fxManual items installMode installDifficulty installWifiRate installAnalogRate installIpRate installRecorderRate analogCamerasPerKit installPercent installFixed installTasks helperQty helperPayEach helperSaleEach helperAutoSaleEnabled transportCost transportSell perDiemCost perDiemSell otherCost otherSell warrantyReserve overhead discountType discountValue paymentTerms leadTime scopeIncluded scopeExcluded warrantyText internalNotes updatedAt'.split())
DRAFT_MODULES = {'cotizador','relevamiento','almacenamiento','plano','paquetes'}
WORKSPACE_MODULES = set(MODULES) - {'plano','ayuda'}


def migrate(db):
    columns={r[1] for r in db.execute('PRAGMA table_info(users)')}
    for name,definition in [('active','INTEGER NOT NULL DEFAULT 1'),('modules',"TEXT NOT NULL DEFAULT '[]'"),('must_change','INTEGER NOT NULL DEFAULT 1')]:
        if name not in columns: db.execute('ALTER TABLE users ADD COLUMN '+name+' '+definition)
    if 'modules' not in columns:
        db.execute('UPDATE users SET modules=? WHERE role=?',(json.dumps(['plano']),'cctv'))
        db.execute('DELETE FROM sessions')  # Legacy cookies must not bypass the new first-change requirement.
    db.execute('CREATE TABLE IF NOT EXISTS user_workspaces(owner TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS media_modules(hash TEXT NOT NULL,owner TEXT NOT NULL,module TEXT NOT NULL,PRIMARY KEY(hash,owner,module))')
    if not db.execute("SELECT 1 FROM migrations WHERE name='access-media-modules-v1'").fetchone():
        # Only the pre-module schema has unambiguous legacy CCTV ownership.
        # Replaying this inference on later starts would regrant revoked photos.
        if 'modules' not in columns:
            db.execute("INSERT OR IGNORE INTO media_modules SELECT hash,owner,'plano' FROM media_acl WHERE owner IN (SELECT name FROM users WHERE role='cctv')")
        db.execute("INSERT INTO migrations VALUES('access-media-modules-v1')")


def modules(user):
    return list(MODULES) if user['role']=='admin' else json.loads(user['modules'])


def info(user):
    return {'username':user['name'],'role':user['role'],'active':bool(user['active']), 'modules':modules(user),'mustChangePassword':bool(user['must_change'])}


def password_valid(value):
    if not isinstance(value,str) or len(value.encode('utf-8')) > 1024:
        return False
    # PIN numérico de 6+ dígitos o contraseña convencional de 15+ caracteres.
    return (value.isdecimal() and len(value) >= 6) or len(value) >= 15


def password_input(value):
    # Never silently truncate. Bound UTF-8 bytes before entering PBKDF2.
    return isinstance(value,str) and len(value.encode('utf-8')) <= 1024


def quote_projection(value, allowed, history=False):
    if not isinstance(value,dict): return None
    keys={'id'}
    if 'cotizador' in allowed or history: keys |= QUOTE_FIELDS
    # Packages can build a private selection, never a customer's commercial fields.
    if 'paquetes' in allowed: keys |= {'items'}
    keys |= {field for field,module in TECH_FIELDS.items() if module in allowed}
    return {k:v for k,v in value.items() if k in keys}


def quote_merge(previous, incoming, allowed, problem, history=False):
    if not isinstance(incoming,dict): raise problem(422,'Borrador inválido')
    visible=quote_projection(incoming,allowed,history)
    if set(incoming)-set(visible): raise problem(403,'Campo de módulo no autorizado')
    merged=dict(previous or {})
    merged.update(incoming)
    # Missing fields are intentionally preserved, especially hidden module data.
    return merged


def sales_catalog(catalog, settings):
    margin=max(.05,1-float(settings.get('defaultMargin',35))/100)
    tax=max(0,float(settings.get('purchaseTaxRate',22)))/100
    result=[]
    for p in catalog:
        product={k:v for k,v in p.items() if k in PRODUCT_FIELDS}
        # Native-currency net selling price: clients never receive purchase cost/margin/supplier.
        price=max(0,float(p.get('cost',0))) / (1+tax if p.get('taxIncluded') else 1) / margin
        product['salePrice']=price if math.isfinite(price) else 0
        product['taxIncluded']=False
        result.append(product)
    return result


def raw_workspace(store, db, user):
    globalrow=db.execute('SELECT revision,payload FROM workspace WHERE id=1').fetchone()
    globalw=json.loads(globalrow['payload'])
    if user['role']=='admin': return globalrow['revision'],globalw
    allowed=set(modules(user))
    personal=db.execute('SELECT revision,payload FROM user_workspaces WHERE owner=?',(user['name'],)).fetchone()
    own=json.loads(personal['payload']) if personal else {'draft':None,'saved':[]}
    result={}
    for key,module in SHARED_FIELDS.items():
        if module in allowed: result[key]=globalw[key]
    if allowed & {'cotizador','paquetes','presupuestos'}:
        result.setdefault('settings',{k:v for k,v in globalw['settings'].items() if k in PUBLIC_SETTINGS})
    if allowed & {'cotizador','paquetes'}:
        result.setdefault('catalog',sales_catalog(globalw['catalog'],globalw['settings']))
    if allowed & DRAFT_MODULES:
        result['draft']=quote_projection(own.get('draft'),allowed)
    if 'presupuestos' in allowed:
        result['saved']=[quote_projection(q,allowed,history=True) for q in own.get('saved',[])]
    # One monotonic revision covers both private and shared changes; no hidden snapshot overwrites.
    return globalrow['revision'],result


def workspace(store,user,portable=False):
    with store.connect() as db:
        revision,w=raw_workspace(store,db,user)
        return {'revision':revision,'workspace':store.hydrate(w,db,portable)}


def save_workspace(store,user,w,revision,problem):
    if user['role']=='admin': return store.save_workspace(w,revision,user['name'])
    if not isinstance(w,dict): raise problem(422,'Workspace inválido')
    allowed=set(modules(user))
    writable={key for key,module in SHARED_FIELDS.items() if module in allowed}
    if allowed & DRAFT_MODULES: writable.add('draft')
    if 'presupuestos' in allowed: writable.add('saved')
    if set(w)-writable: raise problem(403,'Campo de módulo no autorizado')
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT revision,payload FROM workspace WHERE id=1').fetchone()
        if type(revision) is not int or revision!=row['revision']: raise problem(409,'Hay cambios en otro navegador. Recargue antes de continuar.')
        shared=json.loads(row['payload'])
        ownrow=db.execute('SELECT payload FROM user_workspaces WHERE owner=?',(user['name'],)).fetchone()
        own=json.loads(ownrow['payload']) if ownrow else {'draft':None,'saved':[]}
        for key in SHARED_FIELDS:
            if key in w: shared[key]=store.dehydrate(w[key],user['name'],db)
        shared=store.validate_workspace(shared)
        if 'draft' in w:
            if w['draft'] is None: raise problem(422,'Use un borrador vacío con identificador')
            own['draft']=quote_merge(own.get('draft'),store.dehydrate(w['draft'],user['name'],db),allowed,problem)
        if 'saved' in w:
            if not isinstance(w['saved'],list) or len(w['saved'])>10000: raise problem(422,'Historial inválido')
            previous={q.get('id'):q for q in own['saved']}
            records=[]
            for q in w['saved']:
                if not isinstance(q,dict): raise problem(422,'Presupuesto inválido')
                records.append(quote_merge(previous.get(q.get('id')),store.dehydrate(q,user['name'],db),allowed,problem,history=True))
            own['saved']=records
        payload=shared
        personal=own
        db.execute('UPDATE workspace SET revision=revision+1,payload=? WHERE id=1',(json.dumps(payload,ensure_ascii=False,allow_nan=False),))
        db.execute('INSERT OR REPLACE INTO user_workspaces VALUES(?,?,?)',(user['name'],revision+1,json.dumps(personal,ensure_ascii=False,allow_nan=False)))
    return {'ok':True,'revision':revision+1}


def contains_media(value,url):
    if isinstance(value,str): return value==url
    if isinstance(value,dict): return any(contains_media(v,url) for v in value.values())
    if isinstance(value,list): return any(contains_media(v,url) for v in value)
    return False


def media_access(store,digest,owner,db):
    user=db.execute('SELECT * FROM users WHERE name=?',(owner,)).fetchone()
    if not user or not user['active'] or user['must_change'] or not db.execute('SELECT 1 FROM media WHERE hash=?',(digest,)).fetchone(): return False
    if user['role']=='admin': return True
    allowed=set(modules(user))
    grants=db.execute('SELECT module FROM media_modules WHERE hash=? AND owner=?',(digest,owner))
    if any(r['module'] in allowed for r in grants): return True
    _,visible=raw_workspace(store,db,user)
    if contains_media(visible,'/media/'+digest): return True
    if 'plano' in allowed:
        return any(contains_media(json.loads(r[0]),'/media/'+digest) for r in db.execute('SELECT payload FROM plans WHERE owner=?',(owner,)))
    return False
