from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="styles.css"\s*/>','',html)
html=re.sub(r'<script src="(?:assets/logo-data.js|pdf.js|app.js|technical.js)"></script>','',html)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.set_content(html)
    page.add_style_tag(content=(root/'styles.css').read_text())
    page.evaluate('''() => {let obj={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>obj[k]??null,setItem:(k,v)=>obj[k]=v,removeItem:k=>delete obj[k],clear:()=>obj={}}})}''')
    for name in ('assets/logo-data.js','pdf.js','app.js','technical.js'):
        page.add_script_tag(content=(root/name).read_text())
    def check_view(tab, count):
        page.evaluate('name => SAFE_APP.showView(name)',tab)
        panels=page.locator(f'#view-{tab} > section.panel')
        assert panels.count()==count, (tab,panels.count(),count)
        rects=panels.evaluate_all('(els)=>els.map(el=>{let r=el.getBoundingClientRect();return {y:r.y,height:r.height}})')
        gaps=[round(rects[i]['y']-rects[i-1]['y']-rects[i-1]['height'],1) for i in range(1,len(rects))]
        assert all(abs(g-20)<1 for g in gaps),(tab,gaps)
        assert page.locator(f'#view-{tab} .collapse-toggle').count()==count
        if count>1:
            btn=panels.nth(1).locator('.collapse-toggle')
            btn.evaluate('(el)=>el.click()')
            assert panels.nth(1).locator('.panel-body').is_hidden()
            btn.evaluate('(el)=>el.click()')
            assert panels.nth(1).locator('.panel-body').is_visible()
        print('PASS Desktop',tab,'gaps',gaps)
    check_view('relevamiento',3)

    check_view('paquetes',2)

    check_view('almacenamiento',4)

    # Proveedores: archivo y respaldo en un panel independiente, mismo espaciado.
    check_view('proveedores',2)
    assert 'proveedores/proveedores.json' in page.locator('#view-proveedores').inner_text()
    page.locator('#addSupplier').click()
    page.locator('#supplierName').fill('Proveedor QA Demo')
    page.locator('#supplierWeb').fill('https://proveedor.example.uy')
    page.locator('#modalConfirm').click()
    assert page.locator('.supplier-card').count()==1
    with page.expect_download(timeout=10000) as d:
        page.locator('#supplierBackupNow').click()
    download=d.value
    payload=json.loads(Path(download.path()).read_text())
    assert payload['suppliers'][0]['name']=='Proveedor QA Demo',payload.get('suppliers')
    assert payload['format']=='safe-security-cotizador-v1'
    print('PASS backup suppliers in JSON',download.suggested_filename)

    # Visual móvil, nuevo gap 15 px
    page.set_viewport_size({'width':390,'height':844})
    for tab, n in [('relevamiento',3),('paquetes',2),('almacenamiento',4),('proveedores',2)]:
        page.evaluate('name => SAFE_APP.showView(name)',tab)
        panels=page.locator(f'#view-{tab} > section.panel')
        rects=panels.evaluate_all('(els)=>els.map(el=>{let r=el.getBoundingClientRect();return {y:r.y,height:r.height}})')
        gaps=[round(rects[i]['y']-rects[i-1]['y']-rects[i-1]['height'],1) for i in range(1,len(rects))]
        assert all(abs(g-15)<1 for g in gaps),(tab,gaps)
        print('PASS Mobile',tab,'gaps',gaps)

    assert not errors,errors
    browser.close()
print('QA v1.9 ALL PASS')
