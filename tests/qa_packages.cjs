/* Paquetes comerciales: crear desde cero, editar, eliminar y restaurar. Fixture aislado, sin datos del usuario. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let html=read('index.html').replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?\s*>/g,(_,file)=>'<style>'+read(file)+'</style>')
  .replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace('<head>','<head><script>(()=>{let store={};Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]},clear:()=>{store={}}}})})();</script>');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.SAFE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
    await page.route('**/*',route=>/^https?:/.test(route.request().url())?route.abort():route.continue());
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html);
    const cards=()=>page.locator('#packageCards .tech-package');
    const stored=()=>page.evaluate(()=>SAFE_APP.state.packages.map(x=>({id:x.id,deleted:!!x.deleted})));
    const confirm=async()=>{await page.locator('#safeConfirmAccept').click();await page.waitForFunction(()=>document.getElementById('safeConfirmBackdrop').hidden)};
    // A.modal enfoca el primer campo 20 ms despues de abrir: esperar ese foco evita que fill escriba en otro campo.
    const focusReady=id=>page.waitForFunction(wanted=>document.activeElement&&document.activeElement.id===wanted,id);
    const open=await page.evaluate(()=>SAFE_APP.showView('paquetes'));
    void open;
    await page.locator('.nav-item[data-view="paquetes"]').click();

    assert.equal(await cards().count(),5,'los 5 paquetes predeterminados deben listarse');
    assert.equal(await page.locator('#view-paquetes .collapse-toggle').count(),2,'los 2 paneles siguen siendo plegables');
    assert.equal(await page.locator('#packageCards [data-package-delete]').count(),5,'cada paquete ofrece Eliminar, incluidos los predeterminados');
    assert.equal(await page.locator('#packageCards [data-package-reset]').count(),0,'sin ediciones no se ofrece Restaurar original');
    assert.ok(await page.locator('#packageRestoreDefaults').isHidden(),'Restaurar predeterminados se oculta sin paquetes eliminados');

    // Crear desde cero
    await page.locator('#packageNew').click();
    await focusReady('pkgName');
    assert.equal(await page.locator('#pkgName').inputValue(),'');
    assert.equal(await page.locator('.package-edit-row').count(),1,'el editor nuevo arranca con un artículo del catálogo');
    await page.locator('#pkgName').fill('Local comercial 6 cámaras');
    await page.locator('#pkgType').selectOption('Personalizado');
    await page.locator('#pkgDescription').fill('Seis cámaras IP, NVR y HDD. Sin canalización.');
    await page.locator('#pkgAddItem').click();
    await page.locator('[data-pkg-qty="1"]').fill('3');
    await page.locator('#modalConfirm').click();
    assert.equal(await cards().count(),6,'el paquete creado se agrega a la grilla');
    assert.equal(await page.locator('#packageCards .tech-package', {hasText:'Local comercial 6 cámaras'}).count(),1);
    const created=await page.evaluate(()=>{const p=SAFE_APP.state.packages.find(x=>x.name==='Local comercial 6 cámaras');return{id:p.id,type:p.type,qty:p.products[1].qty,items:p.products.length}});
    assert.match(created.id,/^user-/);assert.equal(created.type,'Personalizado');assert.equal(created.qty,3);assert.equal(created.items,2);

    // Nombre obligatorio
    await page.locator('#packageNew').click();
    await focusReady('pkgName');
    await page.locator('#pkgName').fill('   ');
    await page.locator('#modalConfirm').click();
    assert.equal(await page.locator('#modalBackdrop').isVisible(),true,'sin nombre el editor no cierra');
    await page.locator('#modalClose').click();

    // Crear desde el presupuesto (flujo existente)
    const baseId=await page.evaluate(()=>SAFE_APP.state.catalog[0].id);
    await page.evaluate(()=>{const p=SAFE_APP.state.catalog[0];SAFE_APP.quote.items=[{id:SAFE_APP.makeId(),productId:p.id,name:p.name,description:p.description,category:p.category,quantity:2,cost:p.cost,sourceCost:p.cost,sourceCurrency:p.currency||'USD',sourceTaxIncluded:!!p.taxIncluded,sale:Number(p.salePrice)||SAFE_APP.suggestSale(p.cost)}]});
    await page.locator('.nav-item[data-view="paquetes"]').click();
    await page.locator('#packageNewName').fill('Plantilla desde presupuesto');
    await page.locator('#packageSave').click();
    assert.equal(await cards().count(),7,'se conserva el alta desde los equipos del presupuesto');

    // Editar y restaurar un predeterminado
    await page.locator('[data-package-edit="safe-ip-4"]').click();
    await page.locator('#pkgName').fill('Tiandy editado QA');
    await page.locator('[data-pkg-qty="0"]').fill('2');
    await page.locator('#modalConfirm').click();
    const edited=page.locator('#packageCards .tech-package',{hasText:'Tiandy editado QA'});
    assert.equal(await edited.count(),1);
    assert.equal(await edited.locator('h3').textContent(),'Tiandy editado QA');
    assert.equal(await page.evaluate(()=>SAFE_APP.state.packages.find(x=>x.id==='safe-ip-4').products[0].qty),2,'la edición de una plantilla queda persistida como reemplazo');
    assert.equal(await edited.locator('.tech-pill',{hasText:'EDITADO'}).count(),1,'una plantilla editada se marca como EDITADO');
    assert.equal(await edited.locator('[data-package-reset]').count(),1,'una plantilla editada ofrece Restaurar original');
    // Agregar un paquete suma al final sin borrar lo cargado
    await edited.locator('[data-package-apply]').click();
    await page.waitForFunction(()=>SAFE_APP.quote.items.some(x=>x.productId==='ip-tiandy'));
    const applied=await page.evaluate(()=>SAFE_APP.quote.items.map(x=>({productId:x.productId,qty:x.quantity})));
    assert.equal(applied.length,2,'el paquete se suma a los equipos que ya estaban en el presupuesto');
    assert.equal(applied[0].productId,baseId,'lo cargado antes del paquete queda intacto y en su lugar');
    assert.equal(applied[1].productId,'ip-tiandy');
    assert.equal(applied[1].qty,2,'el paquete editado se agrega con la cantidad guardada');
    await page.evaluate(()=>{SAFE_APP.quote.items=[]});
    await page.locator('.nav-item[data-view="paquetes"]').click();
    await page.locator('#packageCards .tech-package',{hasText:'Tiandy editado QA'}).locator('[data-package-reset]').click();await confirm();
    assert.equal(await page.locator('#packageCards .tech-package',{hasText:'Tiandy editado QA'}).count(),0,'Restaurar original descarta la edición');
    assert.equal(await page.evaluate(()=>SAFE_APP.state.packages.some(x=>x.id==='safe-ip-4')),false);

    // Eliminar un paquete creado
    const customId=await page.evaluate(()=>SAFE_APP.state.packages.find(x=>x.name==='Plantilla desde presupuesto').id);
    const custom=page.locator('#packageCards .tech-package',{hasText:'Plantilla desde presupuesto'});
    await custom.locator('[data-package-delete]').click();await confirm();
    assert.equal(await page.locator('#packageCards .tech-package',{hasText:'Plantilla desde presupuesto'}).count(),0);
    assert.equal((await stored()).some(x=>x.id===customId),false,'un paquete propio se elimina del estado, no se marca como baja');
    assert.equal(await page.locator('#'+'packageRestoreDefaults').isHidden(),true,'eliminar un paquete propio no habilita restaurar predeterminados');

    // Eliminar un predeterminado, cancelar y confirmar
    const byName=name=>page.locator('#packageCards .tech-package',{hasText:name});
    await byName('Hogar WiFi').locator('[data-package-delete]').click();
    await page.locator('#safeConfirmCancel').click();await page.waitForFunction(()=>document.getElementById('safeConfirmBackdrop').hidden);
    assert.equal(await byName('Hogar WiFi').count(),1,'cancelar conserva el paquete');
    await byName('Hogar WiFi').locator('[data-package-delete]').click();await confirm();
    assert.equal(await byName('Hogar WiFi').count(),0,'el predeterminado se elimina de la grilla');
    assert.deepEqual((await stored()).filter(x=>x.deleted),[{id:'safe-basic-wifi',deleted:true}],'la baja queda persistida como marca, no como borrado del código');
    assert.equal(await page.locator('#packageRestoreDefaults').isVisible(),true,'aparece Restaurar predeterminados');

    // Un paquete eliminado no se puede aplicar
    assert.equal(await page.locator('[data-package-apply="safe-basic-wifi"]').count(),0);

    // Restaurar predeterminados
    await page.locator('#packageRestoreDefaults').click();await confirm();
    assert.equal(await byName('Hogar WiFi').count(),1,'Restaurar predeterminados recupera la plantilla');
    assert.equal(await page.locator('#packageRestoreDefaults').isHidden(),true);
    assert.deepEqual((await stored()).filter(x=>x.deleted),[]);
    assert.equal(await cards().count(),6,'quedan los 5 predeterminados y el paquete propio');
    assert.equal(await page.locator('#view-paquetes .collapse-toggle').count(),2);

    // Aplicar sigue funcionando
    await page.evaluate(()=>{SAFE_APP.quote.items=[]});
    await page.locator('[data-package-apply="safe-ip-4"]').click();
    await page.waitForFunction(()=>SAFE_APP.quote.items.length===1);
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.items.length),1);
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.items[0].quantity),1,'tras restaurar la plantilla vuelve la cantidad original');

    // Paquete con precio propio, sin artículos del catálogo
    await page.locator('.nav-item[data-view="paquetes"]').click();
    await page.locator('#packageNew').click();
    await focusReady('pkgName');
    await page.locator('[data-pkg-remove="0"]').click();
    await page.locator('#pkgName').fill('Mantenimiento anual');
    await page.locator('#pkgType').selectOption('Personalizado');
    await page.locator('#pkgDescription').fill('Visita semestral, limpieza de lentes y ajuste de encuadres.');
    await page.locator('#pkgPrice').fill('480');
    await page.locator('#pkgCost').fill('120');
    await page.locator('#modalConfirm').click();
    const priced=page.locator('#packageCards .tech-package',{hasText:'Mantenimiento anual'});
    assert.equal(await priced.count(),1,'un paquete sin artículos del catálogo se guarda con su precio propio');
    assert.match(await priced.locator('.package-price').textContent(),/Precio de venta USD 480,00/,'la tarjeta muestra el precio propio');
    assert.match(await priced.locator('.package-price').textContent(),/costo estimado USD 120,00/,'la tarjeta muestra el costo estimado opcional');
    assert.match(await priced.locator('.package-price + small').textContent(),/Sin artículos del catálogo/);

    // Sin precio y sin artículos no se guarda
    await page.locator('#packageNew').click();
    await focusReady('pkgName');
    await page.locator('[data-pkg-remove="0"]').click();
    await page.locator('#pkgName').fill('Paquete vacío QA');
    await page.locator('#modalConfirm').click();
    assert.equal(await page.locator('#modalBackdrop').isVisible(),true,'sin precio ni artículos el editor no cierra');
    await page.locator('#modalClose').click();

    // El paquete con precio entra como una línea al final y no reemplaza lo cargado
    await page.evaluate(()=>{SAFE_APP.quote.items=[];SAFE_APP.addProduct(SAFE_APP.state.catalog[0].id)});
    const before=await page.evaluate(()=>SAFE_APP.quote.items.length);
    await priced.locator('[data-package-apply]').click();
    await page.waitForFunction(()=>SAFE_APP.quote.items.some(x=>x.name==='paquete (Mantenimiento anual)'));
    const line=await page.evaluate(()=>{const items=SAFE_APP.quote.items,x=items.find(i=>i.name==='paquete (Mantenimiento anual)');return{total:items.length,index:items.indexOf(x),productId:x.productId,category:x.category,quantity:x.quantity,description:x.description,shown:SAFE_APP.gross(x.sale)}});
    assert.equal(line.total,before+1,'el paquete se suma al presupuesto en vez de reemplazarlo');
    assert.equal(line.index,before,'la línea del paquete se agrega después de lo que ya estaba cargado');
    assert.equal(line.productId,'','la línea del paquete no depende de un artículo del catálogo');
    assert.equal(line.category,'other');
    assert.equal(line.quantity,1);
    assert.match(line.description,/Visita semestral/);
    assert.ok(Math.abs(line.shown-480)<0.01,'el precio del paquete se respeta tal como se cargó');

    // Línea de paquete manual desde el cotizador
    await page.locator('.nav-item[data-view="cotizador"]').click();
    await page.locator('#addPackageLine').click();
    await focusReady('pkgLineTitle');
    await page.locator('#pkgLineTitle').fill('Instalación express');
    await page.locator('#pkgLineDesc').fill('Mano de obra de una jornada para dos cámaras.');
    await page.locator('#pkgLinePrice').fill('350');
    await page.locator('#pkgLineCost').fill('90');
    await page.locator('#modalConfirm').click();
    await page.waitForFunction(()=>SAFE_APP.quote.items.some(x=>x.name==='paquete (Instalación express)'));
    const manual=page.locator('#quoteItems tr',{hasText:'paquete (Instalación express)'});
    assert.equal(await manual.count(),1,'la línea manual aparece en la tabla del presupuesto');
    assert.equal(await manual.locator('input[data-line-field="sale"]').inputValue(),'350.00','el precio de venta se muestra como precio final');
    assert.ok(await page.evaluate(()=>SAFE_APP.quote.items.length)>1,'la línea manual se suma a lo que ya estaba cargado');

    assert.deepEqual(errors,[]);
    console.log('PASS paquetes comerciales: alta desde cero, con precio propio sin artículos, alta desde presupuesto, edición, restaurar original, baja de predeterminados y propios, restaurar predeterminados, agregar sin reemplazar y línea manual desde el cotizador');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
