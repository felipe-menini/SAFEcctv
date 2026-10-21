from playwright.sync_api import sync_playwright
from pathlib import Path
import re,base64,os
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();html=re.sub(r'<link rel="stylesheet" href="styles.css"\s*/>','',html);html=re.sub(r'<script src="(?:assets/logo-data.js|pdf.js|app.js|technical.js)"></script>','',html)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('SAFE_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 pg=browser.new_page();pg.set_content(html);pg.add_style_tag(content=(root/'styles.css').read_text())
 pg.evaluate('''()=>{let d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=v,removeItem:k=>delete d[k]}})}''')
 for path in ['assets/logo-data.js','pdf.js','app.js','technical.js']:pg.add_script_tag(content=(root/path).read_text())
 pg.evaluate('''()=>{const q=SAFE_APP.quote;q.clientName='Cliente QA v1.8';q.fxRate=40;q.items=[{id:'item-pdf',productId:'ip-tiandy',name:'Tiandy IP kit 4 cámaras',description:'Kit IP',category:'ip',quantity:1,cost:190,sale:320,sourceCost:190,sourceCurrency:'USD'}];q.storagePlan={mode:'nvr',cameraCountMode:'manual',manualCameras:4,codec:'h265',resolution:'2',bitrate:2,diskGB:500,daysWanted:14,recordMode:'continuous',calcMode:'days',motionShare:30,reservePercent:10,includeInPdf:true};}''')
 result=pg.evaluate('''async()=>{const q=SAFE_APP.quote;const b=await SafePDF.makePdf({quote:SAFE_APP.deep(q),settings:SAFE_APP.deep(SAFE_APP.state.settings),totals:SAFE_APP.totals(q),currency:'USD',rate:40,fxDate:new Date().toISOString(),fxSource:'Prueba',fxManual:true});return await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result.split(',')[1]);f.onerror=rej;f.readAsDataURL(b)})}''')
 dest=root/'examples'/'Presupuesto-demostracion-v1.8.pdf';dest.write_bytes(base64.b64decode(result))
 browser.close()
import fitz
pdf=fitz.open(dest);txt='\n'.join(page.get_text() for page in pdf)
assert 'GRABACIÓN ESTIMADA' in txt, txt[:1200]
assert '1344' in txt or '1.344' in txt,txt[-1500:]
assert '14 días solicitados' in txt
assert 'reserva técnica 10%' in txt
assert '190' not in txt or '190' in txt and 'Costo proveedor' not in txt # no internal cost table
assert 'Costo interno' not in txt
print('PDF_OK',dest,len(pdf),'pages',len(dest.read_bytes()),'bytes')
