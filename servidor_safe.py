#!/usr/bin/env python3
"""Servidor local de SAFE Security. Sin dependencias externas.
Escucha exclusivamente 127.0.0.1:8787. Guarda PDFs y JSON en ./cotizaciones.
"""
from __future__ import annotations
import base64
from datetime import datetime, timezone
import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re
from urllib.parse import urlsplit
import webbrowser
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / 'cotizaciones'
ARCHIVE.mkdir(exist_ok=True)
SUPPLIERS = ROOT / 'proveedores'
SUPPLIERS.mkdir(exist_ok=True)
SUPPLIERS_FILE = SUPPLIERS / 'proveedores.json'
HOST, PORT = '127.0.0.1', 8787
MAX_REQUEST = 12_000_000

def safe_name(text: str, limit: int = 42) -> str:
    text = re.sub(r'[^a-zA-Z0-9_-]+', '-', str(text or 'cliente'))
    return text.strip('-')[:limit] or 'cliente'

class SafeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def json_response(self, value, code=200):
        blob = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(blob)))
        self.end_headers()
        self.wfile.write(blob)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/status':
            return self.json_response({'safeCotizador': True, 'modo': 'carpeta-local', 'carpeta': 'cotizaciones/'})
        if path == '/api/proveedores':
            try:
                data = json.loads(SUPPLIERS_FILE.read_text(encoding='utf-8')) if SUPPLIERS_FILE.exists() else []
                return self.json_response({'suppliers': data if isinstance(data,list) else []})
            except (ValueError, OSError):
                return self.json_response({'error': 'No se pudieron leer los proveedores'}, 500)
        if path == '/api/presupuestos':
            records = []
            for file in sorted(ARCHIVE.glob('SAFE-*.json')):
                try:
                    data = json.loads(file.read_text(encoding='utf-8'))
                    if isinstance(data.get('quote'), dict):
                        records.append(data['quote'])
                except Exception:
                    pass
            return self.json_response({'quotes': records})
        if path.startswith('/api/'):
            return self.json_response({'error': 'Ruta desconocida'}, 404)
        # Bloquear exposición HTTP de archivos de cotizaciones y copias internas.
        if unquote(path).lower().startswith(('/cotizaciones', '/proveedores')) or '/../' in unquote(path):
            return self.json_response({'error': 'Ruta protegida'}, 403)
        return super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path not in ('/api/guardar', '/api/eliminar', '/api/proveedores'):
            return self.json_response({'error': 'Ruta desconocida'}, 404)
        origin = self.headers.get('Origin', '')
        if origin not in ('', f'http://{HOST}:{PORT}'):
            return self.json_response({'error': 'Origen no autorizado'}, 403)
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.json_response({'error': 'Se esperaba JSON'}, 415)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > MAX_REQUEST:
                return self.json_response({'error': 'Tamaño inválido'}, 413)
            data = json.loads(self.rfile.read(size).decode('utf-8'))
            if urlsplit(self.path).path == '/api/proveedores':
                items = data.get('suppliers')
                if not isinstance(items, list) or len(items) > 2000:
                    return self.json_response({'error': 'Lista de proveedores inválida'}, 422)
                clean = []
                for item in items:
                    if not isinstance(item, dict):
                        return self.json_response({'error':'Proveedor inválido'}, 422)
                    name = str(item.get('name','')).strip()[:120]
                    if not name:
                        return self.json_response({'error':'Nombre de proveedor obligatorio'}, 422)
                    clean.append({k:str(item.get(k, ''))[:limit] for k,limit in {
                        'id':100,'name':120,'website':350,'contact':120,'phone':75,
                        'email':120,'address':200,'brands':200,'notes':1200,'updatedAt':40
                    }.items()})
                tmp = SUPPLIERS_FILE.with_suffix('.json.tmp')
                tmp.write_text(json.dumps(clean, indent=2, ensure_ascii=False), encoding='utf-8')
                tmp.replace(SUPPLIERS_FILE)
                return self.json_response({'ok':True, 'count':len(clean)})
            if urlsplit(self.path).path == '/api/eliminar':
                number = str(data.get('number',''))
                if not re.fullmatch(r'SAFE-[0-9]{1,8}', number):
                    return self.json_response({'error':'Número inválido'}, 422)
                deleted = 0
                for file in ARCHIVE.glob(f'{number}-*'):
                    if file.is_file() and file.suffix in ('.pdf','.json'):
                        file.unlink()
                        deleted += 1
                return self.json_response({'ok':True,'filesRemoved':deleted})
            quote = data.get('quote')
            if not isinstance(quote, dict) or not quote.get('id'):
                return self.json_response({'error': 'Presupuesto inválido'}, 422)
            number = str(quote.get('number', 'SAFE-0001'))
            if not re.fullmatch(r'SAFE-[0-9]{1,8}', number):
                return self.json_response({'error': 'Número inválido'}, 422)
            client = safe_name(quote.get('clientName', 'cliente'))
            # El JSON siempre se actualiza conservando el estado editable y costos internos.
            jfile = ARCHIVE / f'{number}-{client}.json'
            for previous in ARCHIVE.glob(f'{number}-*.json'):
                if previous != jfile:
                    previous.unlink(missing_ok=True)
            obj = {'format': 'safe-security-quote-v1', 'savedAt': datetime.now(timezone.utc).isoformat(), 'quote': quote}
            tmp = jfile.with_suffix('.json.tmp')
            tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding='utf-8')
            tmp.replace(jfile)
            currency = data.get('currency')
            pdf_b64 = data.get('pdfBase64')
            pdf_filename = None
            if pdf_b64 is not None:
                if currency not in ('USD', 'UYU') or not isinstance(pdf_b64, str):
                    return self.json_response({'error': 'Moneda o PDF inválido'}, 422)
                content = base64.b64decode(pdf_b64, validate=True)
                if not content.startswith(b'%PDF-') or len(content) > 7_000_000:
                    return self.json_response({'error': 'PDF inválido'}, 422)
                pfile = ARCHIVE / f'{number}-{client}-{currency}.pdf'
                tmp = pfile.with_suffix('.pdf.tmp')
                tmp.write_bytes(content)
                tmp.replace(pfile)
                pdf_filename = pfile.name
            return self.json_response({'ok': True, 'json': jfile.name, 'pdf': pdf_filename})
        except Exception as error:
            return self.json_response({'error': str(error)[:180]}, 400)

    def log_message(self, fmt, *args):
        if not str(args[1] if len(args) > 1 else '').startswith('200'):
            super().log_message(fmt, *args)

if __name__ == '__main__':
    address = f'http://{HOST}:{PORT}/'
    try:
        with ThreadingHTTPServer((HOST, PORT), SafeHandler) as server:
            print('SAFE Security — Manager v1.7 — Técnico y proveedores')
            print('Abrí en el navegador:', address)
            print('Cotizaciones guardadas en:', ARCHIVE)
            print('Cerrá esta ventana para detener el servidor. Los archivos se conservan.')
            webbrowser.open(address)
            server.serve_forever()
    except OSError as exc:
        print('No se pudo iniciar el servidor local:', exc)
        print('Si el puerto 8787 ya está en uso, probá abrir', address)
        input('Presioná Enter para cerrar...')
