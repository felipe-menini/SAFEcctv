from playwright.sync_api import sync_playwright
from pathlib import Path
import re, os
root=Path(__file__).resolve().parents[1]
html=re.sub(r'<link rel="stylesheet" href="styles.css"\s*/>','', (root/'index.html').read_text());html=re.sub(r'<script src="(?:assets/logo-data.js|pdf.js|app.js|technical.js)"></script>','',html)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('SAFE_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=(root/'styles.css').read_text())
 page.evaluate('''()=>{let d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=v,removeItem:k=>delete d[k]}})}''')
 for src in ['assets/logo-data.js','pdf.js','app.js','technical.js']:page.add_script_tag(content=(root/src).read_text())
 page.locator('#menuToggle').click();page.locator('.nav-item[data-view="relevamiento"]').click()
 page.locator('#surveyAddPoint').click();page.locator('.survey-point-accordion summary').click()
 page.locator('#surveyAddPoint').click()
 page.locator('[data-point-delete]').last.click()
 assert page.locator('#safeConfirmBackdrop').is_visible()
 page.locator('#safeConfirmAccept').click()
 assert page.locator('.survey-point').count()==1
 page.locator('#menuToggle').click();page.locator('.nav-item[data-view="paquetes"]').click()
 page.locator('[data-package-edit="safe-ip-4"]').click()
 assert page.locator('#modalBackdrop').is_visible()
 page.locator('#pkgAddItem').click()
 assert page.locator('.package-edit-row').count()==2
 assert page.evaluate('document.querySelector("#modalBackdrop .modal").getBoundingClientRect().width <= innerWidth')
 page.locator('#modalCancel').click()
 assert page.locator('#packageCards [data-package-delete]').count()==5
 assert page.locator('#packageNew').is_visible() and page.locator('#packageRestoreDefaults').is_hidden()
 assert page.evaluate('''()=>{const h=document.getElementById('packageNew').closest('.panel-head'),a=h.querySelector('.package-head-actions');const hr=h.getBoundingClientRect(),ar=a.getBoundingClientRect();return ar.right<=hr.right+.5&&ar.left>=hr.left-.5}'''),'package header actions must stay inside the panel head'
 assert page.evaluate('document.getElementById("packageNew").closest(".panel-head").getBoundingClientRect().right<=innerWidth')
 page.evaluate("document.getElementById('toastWrap').replaceChildren()")
 page.screenshot(path=str(root/'docs/paquetes-movil-v1.8.png'),full_page=True)
 assert not errors,errors
 print('MOBILE PASS: accordion, confirmation, package editor, modal viewport')
 browser.close()
