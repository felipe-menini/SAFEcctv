"""QA del directorio de proveedores y compatibilidad de respaldos (datos sintéticos)."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, re, base64, tempfile, shutil, subprocess, time, urllib.request, urllib.error
P=Path(__file__).resolve().parents[1]
failures=[]
def ck(label,condition):
 print(('PASS' if condition else 'FAIL'),label)
 if not condition: failures.append(label)

with sync_playwright() as pl:
 browser=pl.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1500,'height':920},accept_downloads=True)
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 # Same standalone injection as technical QA; avoids external network and browser-policy limitations
 html=re.sub(r'<link rel="stylesheet" href="styles.css"\s*/>','',(P/'index.html').read_text())
 html=re.sub(r'<script src="(?:assets/logo-data.js|pdf.js|app.js|technical.js)"></script>','',html)
 page.set_content(html);page.add_style_tag(content=(P/'styles.css').read_text())
 page.evaluate('''()=>{let store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k],clear:()=>store={}}})}''')
 for js in ('assets/logo-data.js','pdf.js','app.js','technical.js'):page.add_script_tag(content=(P/js).read_text())
 page.locator('.nav-item[data-view="proveedores"]').click()
 ck('Proveedores visible',page.locator('#view-proveedores.active-view').count()==1)
 ck('Estado inicial vacío',page.locator('#supplierEmpty').is_visible())
 page.locator('#addSupplier').click()
 page.locator('#supplierName').fill('Proveedor QA - TIANDY')
 page.locator('#supplierWeb').fill('javascript:alert(1)')
 page.locator('#modalConfirm').click()
 ck('Enlace peligroso rechazado',page.evaluate('SAFE_APP.state.suppliers.length')==0 and page.locator('#modalBackdrop').is_visible())
 page.locator('#supplierWeb').fill('proveedor-ejemplo.test/catalogo')
 page.locator('#supplierContact').fill('Contacto QA')
 page.locator('#supplierPhone').fill('099 999 999')
 page.locator('#supplierEmail').fill('test@example.com')
 page.locator('#supplierAddress').fill('Montevideo, Uruguay')
 page.locator('#supplierBrands').fill('Tiandy, HiLook')
 page.locator('#supplierNotes').fill('Pago a 30 días. No compartir con cliente.')
 page.locator('#modalConfirm').click()
 ck('Alta y guardado',page.evaluate('SAFE_APP.state.suppliers.length')==1)
 ck('URL normalizada',page.evaluate('SAFE_APP.state.suppliers[0].website')=='https://proveedor-ejemplo.test/catalogo')
 ck('Botón sitio seguro',page.locator('.supplier-card a').get_attribute('rel')=='noopener noreferrer' and page.locator('.supplier-card a').get_attribute('target')=='_blank')
 ck('Estado guardado en localStorage',page.evaluate("JSON.parse(localStorage.getItem('safe-security-cotizador-v1')).suppliers.length") == 1)
 page.locator('.supplier-card [data-supplier-action="edit"]').click()
 page.locator('#supplierName').fill('Proveedor QA actualizado')
 page.locator('#supplierWeb').fill('https://catalogo.ejemplo.test')
 page.locator('#modalConfirm').click()
 page.locator('.supplier-card h3').filter(has_text='Proveedor QA actualizado').wait_for(timeout=3000)
 ck('Edición',page.locator('.supplier-card h3').inner_text()=='Proveedor QA actualizado')
 page.locator('#supplierSearch').fill('sin-coincidencias')
 ck('Búsqueda',page.locator('#supplierEmpty').is_visible())
 page.locator('#supplierSearch').fill('tiandy')
 ck('Busca marcas',page.locator('.supplier-card').count()==1)
 page.locator('#supplierSearch').fill('')
 # Captura sin mensajes de prueba ni favicon roto (set_content no resuelve rutas relativas).
 svg64=base64.b64encode((P/'assets/favicon.svg').read_bytes()).decode()
 page.locator('.side-symbol img').evaluate('(img,uri)=>img.src=uri','data:image/svg+xml;base64,'+svg64)
 page.wait_for_timeout(4300)
 page.screenshot(path=str(P/'docs/proveedores-v1.7.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(500)
 page.screenshot(path=str(P/'docs/proveedores-movil-v1.7.png'),full_page=True)
 ck('Tarjeta móvil sin desbordamiento',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'))
 page.set_viewport_size({'width':1500,'height':920})
 # Vínculo proveedor-producto (no sale en PDF)
 page.locator('.nav-item[data-view="catalogo"]').click()
 page.locator('[data-catalog-action="edit"]').first.click()
 ck('Asignación proveedor disponible',page.locator('#modalSupplier option').count()==2)
 page.locator('#modalSupplier').select_option(page.evaluate('SAFE_APP.state.suppliers[0].id'))
 page.locator('#modalConfirm').click()
 ck('Asociación persistente',page.evaluate("SAFE_APP.state.catalog[0].supplierId === SAFE_APP.state.suppliers[0].id"))
 ck('Catálogo muestra proveedor',page.locator('#catalogTable').inner_text().find('Proveedor QA actualizado')>=0)
 # Full backup
 with page.expect_download() as dl:page.locator('#exportBackup').click() if page.locator('#exportBackup').is_visible() else page.locator('.nav-item[data-view="configuracion"]').click() or page.locator('#exportBackup').click()
 d=dl.value
 back=json.loads(Path(d.path()).read_text())
 ck('Respaldo contiene proveedor',back['suppliers'][0]['name']=='Proveedor QA actualizado')
 ck('Respaldo contiene asociación a catálogo',back['catalog'][0]['supplierId']==back['suppliers'][0]['id'])
 # PDF privacy with linked supplier
 page.evaluate('SAFE_APP.addProduct("wifi-h1c")')
 pdf=page.evaluate('''async()=>{let b=await SafePDF.makePdf({quote:SAFE_APP.quote,settings:SAFE_APP.state.settings,totals:SAFE_APP.totals(),currency:'USD',rate:0});let a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=16000)s+=String.fromCharCode(...a.slice(i,i+16000));return btoa(s)}''')
 import fitz
 doc=fitz.open(stream=base64.b64decode(pdf),filetype='pdf'); txt=' '.join(x.get_text() for x in doc)
 ck('Proveedor ausente del PDF',not any(x in txt for x in ('Proveedor QA actualizado','test@example.com','Pago a 30 días')))
 # Delete and unlink
 page.locator('.nav-item[data-view="proveedores"]').click();page.locator('[data-supplier-action="delete"]').click();page.locator('#safeConfirmAccept').click()
 ck('Baja confirmada',not page.evaluate('SAFE_APP.state.suppliers') and not page.evaluate('SAFE_APP.state.catalog[0].supplierId'))
 ck('Ningún error JS',not errors)
 browser.close()

# Test HTTP archive in temp copy so packaged data stays empty
with tempfile.TemporaryDirectory(prefix='safe-proveedores-') as td:
 tmp=Path(td)
 for f in ('servidor_safe.py','index.html','app.js','technical.js','pdf.js','styles.css'):shutil.copy2(P/f,tmp/f)
 (tmp/'servidor_safe.py').write_text((tmp/'servidor_safe.py').read_text().replace("HOST, PORT = '127.0.0.1', 8787","HOST, PORT = '127.0.0.1', 8877"))
 (tmp/'assets').mkdir(); shutil.copy2(P/'assets/favicon.svg',tmp/'assets/favicon.svg')
 proc=subprocess.Popen(['python',str(tmp/'servidor_safe.py')],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  url='http://127.0.0.1:8877'
  for _ in range(35):
   try:
    with urllib.request.urlopen(url+'/api/status',timeout=.4) as r:
     if r.status==200:break
   except Exception:time.sleep(.1)
  else:raise RuntimeError('Servidor no inició')
  example={'id':'qa-1','name':'Proveedor QA carpeta','website':'https://example.com/','contact':'QA','phone':'','email':'','address':'','brands':'','notes':'Privado','updatedAt':'2026-10-14T00:00:00Z'}
  request=urllib.request.Request(url+'/api/proveedores',data=json.dumps({'suppliers':[example]}).encode(),headers={'Content-Type':'application/json','Origin':url},method='POST')
  with urllib.request.urlopen(request) as r:ck('API POST proveedores',r.status==200)
  with urllib.request.urlopen(url+'/api/proveedores') as r:got=json.load(r)
  ck('API GET proveedores',got['suppliers'][0]['name']==example['name'])
  ck('Archivo privado existe',(tmp/'proveedores/proveedores.json').exists())
  try:urllib.request.urlopen(url+'/proveedores/proveedores.json');ck('HTTP impide leer carpeta privada',False)
  except urllib.error.HTTPError as e:ck('HTTP impide leer carpeta privada',e.code==403)
  try:
   x=urllib.request.Request(url+'/api/proveedores',data=json.dumps({'suppliers':[]}).encode(),headers={'Content-Type':'application/json','Origin':'https://otro-origen.test'},method='POST')
   urllib.request.urlopen(x);ck('Rechaza escrituras desde otros orígenes',False)
  except urllib.error.HTTPError as e:ck('Rechaza escrituras desde otros orígenes',e.code==403)
 finally:proc.terminate();proc.wait(timeout=5)
print('\nFINAL:',len(failures),'FAILURES',failures)
if failures:raise SystemExit(1)
