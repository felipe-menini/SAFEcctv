from playwright.sync_api import sync_playwright
from pathlib import Path
import re, os

root = Path(__file__).resolve().parents[1]
html = re.sub(r'<link rel="stylesheet" href="styles.css"\s*/>', '', (root / 'index.html').read_text())
html = re.sub(r'<script src="(?:assets/logo-data.js|pdf.js|app.js|technical.js)"></script>', '', html)
fail = []


def ck(name, pred, notes=''):
    print(('PASS' if pred else 'FAIL'), name, notes)
    if not pred:
        fail.append((name, notes))


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('SAFE_CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 940})
    page.on('pageerror', lambda e: fail.append(('PAGEERROR', str(e))))
    page.set_content(html)
    page.add_style_tag(content=(root / 'styles.css').read_text())
    page.evaluate("""()=>{let d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=v,removeItem:k=>delete d[k],clear:()=>d={}}})}""")
    for path in ['assets/logo-data.js', 'pdf.js', 'app.js', 'technical.js']:
        page.add_script_tag(content=(root / path).read_text())
    page.wait_for_timeout(250)

    total = page.evaluate('SAFE_APP.state.catalog.length')
    cards = page.locator('#productPicker .product-card')
    layout = page.evaluate("""()=>{const g=document.querySelector('#productPicker'),s=document.querySelector('.picker-selection');return{cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,sticky:getComputedStyle(s).position,cw:Math.round(document.querySelector('.picker-catalog').getBoundingClientRect().width),sw:Math.round(s.getBoundingClientRect().width)}}""")
    ck('catálogo en dos paneles con grilla de tarjetas', cards.count() == total and layout['cols'] >= 2 and layout['sticky'] == 'sticky' and layout['sw'] >= 300, str(layout))
    ck('cada tarjeta muestra imagen o marcador', page.locator('#productPicker .product-card .picker-thumb').count() == total)
    ck('resumen de selección inicia vacío', page.locator('#itemsEmpty').is_visible() and page.locator('#selectionSale').inner_text() == 'USD 0,00')

    page.locator('#productSearch').fill('microsd')
    page.wait_for_timeout(120)
    filtered = cards.count()
    ck('búsqueda filtra y cuenta resultados', 0 < filtered < total and 'producto' in page.locator('#pickerCount').inner_text(), str(filtered))
    ck('limpiar filtros visible y funcional', page.locator('#clearFilters').is_visible())
    page.locator('#clearFilters').click()
    page.wait_for_timeout(120)
    ck('limpiar filtros restaura el catálogo', cards.count() == total)

    page.locator('#brandFilter').select_option(index=1)
    page.wait_for_timeout(120)
    by_brand = cards.count()
    ck('filtro por marca reduce el catálogo', 0 < by_brand < total, str(by_brand))
    page.locator('#clearFilters').click()
    page.locator('#toggleAdvancedFilters').click()
    page.locator('#filterPriceMin').fill('60')
    page.wait_for_timeout(140)
    by_price = cards.count()
    ck('filtro avanzado por precio', 0 < by_price < total, str(by_price))
    page.locator('#clearFilters').click()
    page.wait_for_timeout(120)

    page.locator('#productPicker [data-favorite]').first.click()
    page.wait_for_timeout(120)
    fav = page.evaluate("JSON.parse(localStorage.getItem('safe.catalogFavorites')||'[]')")
    page.locator('[data-picker-quick="favorites"]').click()
    page.wait_for_timeout(140)
    ck('favoritos se guardan y filtran', len(fav) == 1 and cards.count() == 1, str(fav))
    page.locator('[data-picker-quick="all"]').click()
    page.wait_for_timeout(120)

    page.locator('#productPicker .product-card', has_text='EZVIZ H1C').click()
    page.wait_for_timeout(160)
    state = page.evaluate("({items:SAFE_APP.quote.items.length,qty:SAFE_APP.quote.items[0]?.quantity,stepper:!!document.querySelector('.product-card.in-quote .qty-stepper')})")
    ck('agregar suma una línea y muestra stepper', state['items'] == 1 and state['qty'] == 1 and state['stepper'], str(state))
    ck('tarjeta ya no duplica al tocarla de nuevo', page.locator('#productPicker .product-card', has_text='EZVIZ H1C').locator('.qty-stepper').count() == 1)
    ck('avisa que falta grabador o microSD', page.locator('#selectionChecks .selection-check.warn').count() >= 1)
    ck('sugerencias aparecen sin agregarse solas', page.locator('#selectionSuggestions .suggest-chip').count() > 0 and page.evaluate('SAFE_APP.quote.items.length') == 1)

    page.locator('.product-card.in-quote .qty-btn[data-card-step="1"]').click()
    page.wait_for_timeout(120)
    ck('stepper de la tarjeta suma cantidad', page.evaluate("SAFE_APP.quote.items.length===1&&SAFE_APP.quote.items[0].quantity===2"))
    page.locator('#quoteItems .qty-btn[data-line-step="-1"]').click()
    page.wait_for_timeout(120)
    ck('stepper de la tabla resta cantidad', page.evaluate("SAFE_APP.quote.items[0].quantity===1"))

    page.locator('#quoteItems input[data-line-field="sale"]').first.fill('100')
    page.wait_for_timeout(160)
    sale = page.evaluate("SAFE_APP.quote.items[0].sale")
    total_after = page.locator('#selectionSale').inner_text()
    ck('editar venta recalcula el resumen', abs(sale - 100 / 1.22) < .01 and total_after.strip() == 'USD 100,00', f'{sale:.2f} {total_after}')

    page.locator('#selectionSuggestions .suggest-chip').first.click()
    page.wait_for_timeout(160)
    ck('sugerencia se agrega sólo al tocarla', page.evaluate('SAFE_APP.quote.items.length') == 2)

    page.locator('[data-picker-quick="kits"]').click()
    page.wait_for_timeout(180)
    kits = page.locator('#productPicker .kit-card').count()
    qty_of = 'SAFE_APP.quote.items.reduce((a,x)=>a+Number(x.quantity),0)'
    before = page.evaluate(qty_of)
    page.locator('#productPicker [data-package-add="safe-ip-4"]').click()
    page.wait_for_timeout(260)
    after = page.evaluate(qty_of)
    ck('paquetes visibles y agregables desde el catálogo', kits > 0 and after > before, f'kits={kits} {before}->{after}')
    page.locator('[data-picker-quick="all"]').click()

    page.locator('#selectionShoppingList').click()
    page.wait_for_timeout(180)
    groups = page.locator('.shopping-table .shopping-group').count()
    ck('lista de compras agrupada por proveedor', page.locator('#modalBackdrop').is_visible() and groups >= 1, f'grupos={groups}')
    page.locator('#modalClose').click()

    page.locator('#quoteItems [data-delete-line]').first.click()
    page.wait_for_timeout(160)
    ck('eliminar línea actualiza la tabla', page.locator('#quoteItems tr').count() == page.evaluate('SAFE_APP.quote.items.length'))

    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mobile.set_content(html)
    mobile.add_style_tag(content=(root / 'styles.css').read_text())
    mobile.evaluate("""()=>{let d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=v,removeItem:k=>delete d[k],clear:()=>d={}}})}""")
    for path in ['assets/logo-data.js', 'pdf.js', 'app.js', 'technical.js']:
        mobile.add_script_tag(content=(root / path).read_text())
    mobile.wait_for_timeout(250)
    mob = mobile.evaluate("""()=>{const g=document.querySelector('#productPicker');return{cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,sticky:getComputedStyle(document.querySelector('.picker-selection')).position,cards:g.children.length,overflow:document.documentElement.scrollWidth-innerWidth}}""")
    ck('mobile apilado en dos columnas sin desborde', mob['sticky'] == 'static' and mob['cols'] == 2 and mob['cards'] == total and mob['overflow'] <= 0, str(mob))

    browser.close()

print('FAILURES:', fail)
raise SystemExit(1 if fail else 0)
