/* SAFE parent + real srcdoc bridge, isolated from the user's stored information. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let html=read('index.html').replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?\s*>/g,(_,file)=>'<style>'+read(file)+'</style>')
  .replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace('<head>','<head><script>(()=>{let store={};Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k],clear:()=>store={}}});const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.__qaBlob=blob;return original.call(this,blob)}})();</script>');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.SAFE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true}),errors=[];
    await page.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html);
    // The checks in qa_v19.py, using its inline fixture pattern and bundled Node Playwright.
    async function view(name,count,gap){
      await page.evaluate(name=>SAFE_APP.showView(name),name);
      const panels=page.locator(`#view-${name} > section.panel`);assert.equal(await panels.count(),count);
      const bounds=await panels.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{y:r.y,height:r.height}}));
      for(let i=1;i<bounds.length;i++)assert.ok(Math.abs(bounds[i].y-bounds[i-1].y-bounds[i-1].height-gap)<1);
      assert.equal(await page.locator(`#view-${name} .collapse-toggle`).count(),count);
    }
    for(const [name,count]of [['relevamiento',3],['paquetes',2],['almacenamiento',4],['proveedores',2]])await view(name,count,20);
    await page.locator('#addSupplier').click();await page.locator('#supplierName').fill('Proveedor QA Demo');await page.locator('#supplierWeb').fill('https://proveedor.example.uy');await page.locator('#modalConfirm').click();
    assert.equal(await page.locator('.supplier-card').count(),1);
    await page.locator('#supplierBackupNow').click();const backup=JSON.parse(await page.evaluate(()=>window.__qaBlob.text()));
    assert.equal(backup.suppliers[0].name,'Proveedor QA Demo');assert.equal(backup.format,'safe-security-cotizador-v1');
    await page.setViewportSize({width:390,height:844});for(const [name,count]of [['relevamiento',3],['paquetes',2],['almacenamiento',4],['proveedores',2]])await view(name,count,15);
    console.log('PASS qa_v19 scenarios: desktop/mobile panels, supplier creation and full backup');
    await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>SAFE_APP.showView('plano'));
    const frame=page.frameLocator('#safePlannerFrame');await frame.locator('#canvas').waitFor();
    await page.waitForFunction(()=>document.getElementById('safePlannerFrame').contentWindow.SAFE_PLANNER);
    await page.locator('#safePlannerFrame').evaluate(el=>{const w=el.contentWindow;const p=w.SAFE_PLANNER.snapshot();p.shapes=[{id:'integration-wall',type:'wall',points:[[100,100],[300,100]]}];p.cameras=[];w.SAFE_PLANNER.load(p,parent.SAFE_APP.quote.id)});
    await frame.locator('[data-dimension="integration-wall"]').dblclick();await frame.locator('#dimensionMeters').fill('12,5');await frame.locator('#applyDimension').click();
    assert.deepEqual(await page.evaluate(()=>SAFE_APP.quote.cctvPlan.shapes[0].points),[[100,100],[350,100]]);
    const image=Buffer.from(await page.locator('#safePlannerFrame').evaluate(el=>{const c=el.contentDocument.createElement('canvas');c.width=20;c.height=10;return c.toDataURL().split(',')[1]}),'base64');
    await frame.locator('#backgroundMenu').click();await frame.locator('#backgroundFile').setInputFiles({name:'plano.png',mimeType:'image/png',buffer:image});
    await page.waitForFunction(()=>!!SAFE_APP.quote.cctvPlan?.background);
    await frame.locator('#backgroundOpacity').focus();await page.keyboard.press('Home');await frame.locator('#backgroundOpacity').blur();
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.cctvPlan.background.opacity),0);
    await page.evaluate(()=>document.getElementById('exportBackup').click());const full=JSON.parse(await page.evaluate(()=>window.__qaBlob.text()));
    assert.equal(full.draft.cctvPlan.background.opacity,0);assert.deepEqual(full.draft.cctvPlan.shapes[0].points,[[100,100],[350,100]]);
    await frame.locator('#removeBackground').click();assert.equal(await page.evaluate(()=>SAFE_APP.quote.cctvPlan.background),null);
    await page.locator('#importBackup').setInputFiles({name:'safe-qa.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(full))});await page.locator('#safeConfirmAccept').click();
    await page.evaluate(()=>SAFE_APP.showView('plano'));
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.cctvPlan.background.opacity),0);
    await frame.locator('#backgroundMenu').click();assert.equal(await frame.locator('#backgroundOpacity').inputValue(),'0');
    assert.equal(await frame.locator('[data-dimension="integration-wall"]').textContent(),'12.5 m');
    // Compact view: no page heading and the editor frame fills most of the viewport.
    const layout=await page.evaluate(()=>{const v=document.getElementById('view-plano'),f=document.getElementById('safePlannerFrame');return{heading:!!v.querySelector('.page-heading'),frameH:f.getBoundingClientRect().height,vh:innerHeight}});
    assert.equal(layout.heading,false);assert.ok(layout.frameH>layout.vh*0.6,'iframe height '+layout.frameH+' vs viewport '+layout.vh);
    assert.deepEqual(errors,[]);
    await page.evaluate(()=>SAFE_APP.showView('cotizador'));
    await page.locator('#clientName').fill('Cliente QA');
    await page.evaluate(()=>{SAFE_APP.quote.items=[{id:'qa-item',productId:'',name:'Cámara QA',description:'',category:'Cámaras',quantity:1,cost:10,sale:20}]});
    await page.locator('#attachPlanSchematic').check();
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.attachPlanSchematic),true);
    // saveArchive also writes through createObjectURL during the click; wait for the PDF blob, not the backup flash.
    await page.evaluate(()=>{window.__qaBlob=null});
    await page.locator('#generatePdf').click();
    await page.waitForFunction(()=>window.__qaBlob&&window.__qaBlob.type==='application/pdf');
    const withScheme=await page.evaluate(async()=>await window.__qaBlob.text());
    assert.match(withScheme,/ESQUEMA DE INSTALAC/);assert.match(withScheme,/\/Im1 /);
    await page.evaluate(()=>{window.__qaBlob=null});
    await page.locator('#attachPlanSchematic').uncheck();
    await page.locator('#generatePdf').click();
    await page.waitForFunction(()=>window.__qaBlob&&window.__qaBlob.type==='application/pdf');
    const withoutScheme=await page.evaluate(async()=>await window.__qaBlob.text());
    assert.doesNotMatch(withoutScheme,/ESQUEMA DE INSTALAC/);
    assert.deepEqual(errors,[]);
    console.log('PASS real SAFE integration: quote draft, geometry, image, zero opacity, backup/import round trip, iframe refresh, PDF schematic annex');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
