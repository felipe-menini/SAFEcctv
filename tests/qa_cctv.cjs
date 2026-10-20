/* Deterministic Chromium regression harness, following qa_v19.py's inline fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
function standalone() {
  return fs.readFileSync(path.join(root, 'planner/index.html'), 'utf8')
    .replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?\s*>/g, (_, file) => `<style>${fs.readFileSync(path.resolve(root, 'planner', file), 'utf8')}</style>`)
    .replace(/<script src="([^"]+)"><\/script>/g, (_, file) => `<script>${fs.readFileSync(path.resolve(root, 'planner', file), 'utf8')}</script>`);
}
function embedded() {
  const ctx = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'planner-document.js'), 'utf8'), ctx);
  return ctx.window.SAFE_PLANNER_DOCUMENT;
}
const prelude = `<script>
window.__SAFE_EMBEDDED=EMBEDDED;window.__SAFE_QUOTE_ID='qa';window.savedPlans=[];
window.SafePlanner={accept(p,id){savedPlans.push({plan:p,id})},ready(){}};
window.SAFE_APP={quote:{number:'QA-01',clientName:'Prueba'},state:{settings:{}},showView(){}};
let store={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v}});
if(!crypto.randomUUID)crypto.randomUUID=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]%16;return(c==='x'?r:(r&3|8)).toString(16)});
</script>`;
async function fixture(page, mode, points=[[100,100],[300,100]], type='wall', extra={}) {
  await page.goto('about:blank');
  await page.setContent((mode==='embedded'?embedded():standalone()).replace('<head>', '<head>'+prelude.replace('EMBEDDED;', String(mode==='embedded')+';')));
  await page.evaluate(({points,type,extra})=>{
    const plan=initial(); plan.shapes=[{id:'qa-shape',type,points}]; plan.cameras=[];plan.pixelsPerMeter=20;Object.assign(plan,extra);
    if(window.SAFE_PLANNER)SAFE_PLANNER.load(plan,'qa');else {state=normalizeProject(plan);selected=null;history=[];setTool('select');refresh();$('fit').click()}
  },{points,type,extra});
}
async function edit(page, index, value) {
  await page.locator(`[data-dimension="qa-shape"][data-segment="${index}"]`).dblclick();
  await page.locator('#dimensionMeters').fill(value);
  await page.locator('#applyDimension').click();
}
async function snapshot(page) {return page.evaluate(()=>JSON.parse(JSON.stringify(state)))}
const tests = [
  ['wall: double click changes real geometry, save, undo', async(page,mode)=>{
    await fixture(page,mode);await edit(page,0,'15,5');
    assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,100],[410,100]]);
    assert.equal(await page.locator('[data-dimension]').first().textContent(),'15.5 m');
    if(mode==='embedded')assert.deepEqual(await page.evaluate(()=>savedPlans.at(-1).plan.shapes[0].points),[[100,100],[410,100]]);
    else assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).shapes[0].points[1][0]),410);
    await page.locator('#undo').click();assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,100],[300,100]]);
  }],
  ['rectangle: preserve right angles and other axis', async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100],[300,220],[100,220]],'house');await edit(page,0,'15');
    assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,100],[400,100],[400,220],[100,220]]);
    await edit(page,3,'3');assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,160],[400,160],[400,220],[100,220]]);
  }],
  ['polygon: change endpoint, reject crossing, cancel without history', async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100],[200,300]],'terrain');await edit(page,0,'15');
    assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,100],[400,100],[200,300]]);
    await fixture(page,mode,[[100,100],[300,100],[300,300],[200,300],[200,200],[100,200]],'house');
    const before=await snapshot(page);await edit(page,3,'15');
    assert.deepEqual(await snapshot(page),before);assert.equal(await page.locator('#dimensionDialog').evaluate(n=>n.open),true);
    await page.locator('#dimensionMeters').fill('0');await page.locator('#applyDimension').click();assert.deepEqual(await snapshot(page),before);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>history.length),0);
  }],
  ['background: discoverable controls, image upload and zero opacity, keyboard undo, export', async(page,mode)=>{
    await fixture(page,mode);await page.locator('#backgroundMenu').click();
    assert.equal(await page.locator('#backgroundBtn').isVisible(),true);
    const image=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=10;c.getContext('2d').fillRect(0,0,20,10);return c.toDataURL('image/png').split(',')[1]}),'base64');
    await page.locator('#backgroundFile').setInputFiles({name:'plano.png',mimeType:'image/png',buffer:image});
    await page.waitForFunction(()=>!!state.background);
    const opacity=page.locator('#backgroundOpacity');await opacity.focus();await page.keyboard.press('Home');
    assert.equal((await snapshot(page)).background.opacity,0);assert.equal(await opacity.inputValue(),'0');
    assert.equal(await page.locator('#backgroundOpacityValue').textContent(),'0%');
    assert.equal(await page.locator('#scene image').getAttribute('opacity'),'0');
    await opacity.blur();await page.locator('#undo').click();assert.equal((await snapshot(page)).background.opacity,.65);
    const report=await page.evaluate(()=>reportHtml());assert.match(report,/<image/);assert.match(report,/data:image\/jpeg;base64/);
    await page.locator('#removeBackground').click();assert.equal((await snapshot(page)).background,null);
    await page.locator('#undo').click();assert.equal((await snapshot(page)).background.opacity,.65);
  }],
  ['legacy plans, calibrated diagonals, precision and unrelated content survive',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[160,180]],'wall',{pixelsPerMeter:10,customLegacy:{keep:true}});
    await edit(page,0,'20');const plan=await snapshot(page);
    assert.deepEqual(plan.shapes[0].points,[[100,100],[220,260]]);assert.deepEqual(plan.customLegacy,{keep:true});assert.equal(plan.pixelsPerMeter,10);
    await page.locator('[data-dimension]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#dimensionMeters').inputValue(),'20');await page.locator('#cancelDimension').click();
    const legacy=await page.evaluate(()=>{const p=initial();normalizeProject(p);return {background:p.background,scale:p.pixelsPerMeter}});assert.deepEqual(legacy,{background:null,scale:20});
  }],
  ['modal Escape wins over inspector shortcuts',async(page,mode)=>{
    await fixture(page,mode);
    const center=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=200;p.y=100;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});await page.mouse.click(center.x,center.y);
    assert.equal(await page.evaluate(()=>SAFE_WORKSPACE_UI.inspectorOpen),true);
    await page.locator('[data-dimension]').dblclick();await page.keyboard.press('Escape');
    assert.equal(await page.locator('#dimensionDialog').evaluate(n=>n.open),false);
  }],
  ['background decode cannot write into a different project',async(page,mode)=>{
    await fixture(page,mode);
    const image=await page.evaluate(()=>{
      const original=createImageBitmap;
      window.createImageBitmap=file=>original(file).then(bitmap=>new Promise(resolve=>window.finishDecode=()=>resolve(bitmap)));
      const c=document.createElement('canvas');c.width=20;c.height=10;return c.toDataURL().split(',')[1];
    });
    await page.locator('#backgroundFile').setInputFiles({name:'plano.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
    await page.waitForFunction(()=>!!window.finishDecode);
    await page.evaluate(()=>{const p=initial();p.name='Otro presupuesto';if(window.SAFE_PLANNER)SAFE_PLANNER.load(p,'other');else{state=normalizeProject(p);refresh()}window.finishDecode()});
    await page.waitForTimeout(100);
    assert.equal((await snapshot(page)).background,null);
  }],
  ['background: maneuver image — select, move, stretch and size in meters',async(page,mode)=>{
    await fixture(page,mode);
    const image=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=10;c.getContext('2d').fillRect(0,0,20,10);return c.toDataURL('image/png').split(',')[1]}),'base64');
    await page.locator('#backgroundFile').setInputFiles({name:'plano.png',mimeType:'image/png',buffer:image});
    await page.waitForFunction(()=>!!state.background);
    await page.locator('#fit').click();
    const before=await snapshot(page);
    // Click the imported image away from the sample shapes and the right-side inspector overlay.
    const spot=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=600;p.y=300;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(spot.x,spot.y);
    assert.equal(await page.evaluate(()=>selected),'background');
    await page.mouse.move(spot.x,spot.y);await page.mouse.down();await page.mouse.move(spot.x+40,spot.y+30,{steps:4});await page.mouse.up();
    const moved=await snapshot(page);
    assert.notEqual(moved.background.x,before.background.x);assert.notEqual(moved.background.y,before.background.y);
    const handle=await page.locator('[data-bg-handle="w"]').boundingBox();assert.ok(handle,'west handle visible');
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2-50,handle.y+handle.height/2,{steps:4});await page.mouse.up();
    const stretched=await snapshot(page);assert.ok(stretched.background.width>before.background.width);
    await page.locator('#bgWidthMeters').fill('12');await page.locator('#bgWidthMeters').blur();
    const sized=await snapshot(page);assert.equal(Math.round(sized.background.width),Math.round(12*20));
    if(mode==='embedded')assert.equal(await page.evaluate(()=>savedPlans.at(-1).plan.background.width),sized.background.width);
    else assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).background.width),sized.background.width);
    await page.locator('#undo').click();assert.equal((await snapshot(page)).background.width,stretched.background.width);
  }],
  ['camera colors persist and the icon scales with zoom within clamps',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100]],'wall',{cameras:[{id:'qa-cam',model:0,name:'QA',x:500,y:400,angle:0,fov:100,range:14,price:65}]});
    const spot=await page.evaluate(()=>{const c=state.cameras[0];const p=$('canvas').createSVGPoint();p.x=c.x;p.y=c.y;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(spot.x,spot.y);
    assert.equal(await page.evaluate(()=>selected),await page.evaluate(()=>state.cameras[0].id));
    await page.locator('#camIconColor').fill('#ef4444');
    await page.locator('#camVisionColor').fill('#22c55e');
    const cam0=await page.evaluate(()=>state.cameras[0]);
    assert.equal(cam0.color,'#ef4444');assert.equal(cam0.visionColor,'#22c55e');
    assert.ok((await page.locator('#scene').innerHTML()).includes('#ef4444'));
    const swatches=page.locator('[data-cam-color]');assert.equal(await swatches.count(),8);
    for(let i=0;i<8;i++){const b=await swatches.nth(i).boundingBox();assert.ok(Math.abs(b.width-b.height)<.5,'swatch '+i+' ovalada');assert.ok(Math.abs(b.width-28)<1,'swatch width '+b.width)}
    if(mode==='embedded')assert.equal(await page.evaluate(()=>savedPlans.at(-1).plan.cameras[0].color),'#ef4444');
    else assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).cameras[0].color),'#ef4444');
    const measure=()=>page.evaluate(()=>{const g=document.querySelector('.camera-node [data-camera-marker]');const k=Number((g.getAttribute('transform').match(/scale\(([^)]+)\)/)||[0,1])[1]);return 23*k*Math.abs($('canvas').getScreenCTM().a)});
    await page.evaluate(()=>SAFE_VIEWPORT.zoomAt(0.1));const small=await measure();
    await page.evaluate(()=>SAFE_VIEWPORT.zoomAt(4));const big=await measure();
    assert.ok(small>=8&&small<=12,'zoomed-out screen radius '+small);assert.ok(big>=8&&big<=32,'zoomed-in screen radius '+big);assert.ok(big>small);
    const report=await page.evaluate(()=>reportHtml());assert.match(report,/scale\(1\)[^>]*data-camera-marker/);
  }],
  ['space navigation over a dimension does not edit; focused Space does edit',async(page,mode)=>{
    await fixture(page,mode);const label=page.locator('[data-dimension]');
    const position=await label.boundingBox(),before=await page.evaluate(()=>SAFE_VIEWPORT.view);
    await page.keyboard.down('Space');await page.mouse.move(position.x+position.width/2,position.y+position.height/2);await page.mouse.down();await page.mouse.move(position.x+position.width/2+50,position.y+position.height/2+20);await page.mouse.up();await page.keyboard.up('Space');
    const after=await page.evaluate(()=>SAFE_VIEWPORT.view);assert.notEqual(after.cx,before.cx);assert.equal(await page.locator('#dimensionDialog').evaluate(n=>n.open),false);
    await label.focus();await page.keyboard.press('Space');assert.equal(await page.locator('#dimensionDialog').evaluate(n=>n.open),true);
  }],
  ['free drag: 7px moves camera and wall vertex without grid snap',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100]],'wall',{cameras:[{id:'qa-cam',model:0,name:'QA',x:500,y:400,angle:0,fov:100,range:14,price:65}]});
    assert.equal(await page.locator('#snap').isChecked(),true);
    const scale=await page.evaluate(()=>Math.abs($('canvas').getScreenCTM().a));
    const cam=await page.evaluate(()=>{const c=state.cameras[0];const p=$('canvas').createSVGPoint();p.x=c.x;p.y=c.y;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(cam.x,cam.y);
    assert.equal(await page.evaluate(()=>selected),await page.evaluate(()=>state.cameras[0].id));
    await page.mouse.move(cam.x,cam.y);await page.mouse.down();await page.mouse.move(cam.x+7,cam.y,{steps:2});await page.mouse.up();
    const movedCam=(await snapshot(page)).cameras[0];
    assert.ok(Math.abs(movedCam.x-(500+7/scale))<.5,'cámara x='+movedCam.x+' esperada '+(500+7/scale));assert.equal(movedCam.y,400);
    const wallSpot=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=200;p.y=100;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(wallSpot.x,wallSpot.y);
    assert.equal(await page.evaluate(()=>selected),'qa-shape');
    const vert=await page.locator('[data-vertex="1"]').boundingBox();assert.ok(vert,'vertex handle visible');
    await page.mouse.click(vert.x+vert.width/2,vert.y+vert.height/2);
    assert.equal(await page.evaluate(()=>selected),'qa-shape');
    await page.mouse.move(vert.x+vert.width/2,vert.y+vert.height/2);await page.mouse.down();await page.mouse.move(vert.x+vert.width/2+7,vert.y+vert.height/2,{steps:2});await page.mouse.up();
    const wall=(await snapshot(page)).shapes[0];
    assert.ok(Math.abs(wall.points[1][0]-(300+7/scale))<.5,'vértice x='+wall.points[1][0]+' esperada '+(300+7/scale));assert.equal(wall.points[1][1],100);
  }],
  ['numeric shortcuts switch tools',async(page,mode)=>{
    await fixture(page,mode);
    for(const [key,expected]of [['1','pan'],['2','select'],['3','terrain'],['4','house'],['5','wall'],['v','select'],['t','terrain'],['h','house'],['w','wall']]){await page.keyboard.press(key);assert.equal(await page.evaluate(()=>tool),expected,'tecla '+key)}
  }],
  ['rectangle edge handles move a side and keep right angles',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100],[300,220],[100,220]],'house');
    const scale=await page.evaluate(()=>Math.abs($('canvas').getScreenCTM().a));
    const center=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=200;p.y=160;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(center.x,center.y);
    assert.equal(await page.evaluate(()=>selected),'qa-shape');
    assert.equal(await page.locator('[data-edge]').count(),4);
    const handle=await page.locator('[data-edge="1"]').boundingBox();assert.ok(handle,'east edge handle visible');
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+40,handle.y+handle.height/2,{steps:4});await page.mouse.up();
    const pts=(await snapshot(page)).shapes[0].points,dx=40/scale;
    assert.ok(Math.abs(pts[1][0]-(300+dx))<.5,'p1 '+JSON.stringify(pts[1]));assert.equal(pts[1][1],100);
    assert.ok(Math.abs(pts[2][0]-(300+dx))<.5,'p2 '+JSON.stringify(pts[2]));assert.equal(pts[2][1],220);
    assert.equal(pts[0][0],100);assert.equal(pts[3][0],100);
    await page.locator('#undo').click();assert.deepEqual((await snapshot(page)).shapes[0].points,[[100,100],[300,100],[300,220],[100,220]]);
    await fixture(page,mode,[[100,100],[200,80],[300,140],[250,260],[120,220]],'terrain');
    const poly=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=190;p.y=160;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(poly.x,poly.y);
    assert.equal(await page.evaluate(()=>selected),'qa-shape');
    assert.equal(await page.locator('[data-edge]').count(),0);
  }],
  ['layers panel: groups collapse, visibility persists, locks block selection',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100]],'wall',{shapes:[{id:'qa-shape',type:'wall',points:[[400,100],[600,100]]},{id:'qa-terrain',type:'terrain',points:[[80,60],[320,60],[320,220],[80,220]]}],cameras:[{id:'qa-cam',model:0,name:'QA',x:500,y:400,angle:0,fov:100,range:14,price:65}],cables:[{id:'qa-cable',cameraId:'qa-cam',points:[[420,420],[380,470]]}],nvr:{x:380,y:470}});
    assert.equal(await page.locator('#scene .camera-node').count(),1);
    await page.locator('#layersMenu').click();
    assert.equal(await page.locator('#layerPanel').isVisible(),true);
    assert.equal(await page.evaluate(()=>SAFE_WORKSPACE_UI.layersOpen),true);
    // Groups start collapsed; the caret expands them.
    assert.equal(await page.locator('[data-layer-caret="cameras"]').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('[data-layer-item="camera"][data-id="qa-cam"]').isVisible(),false);
    await page.locator('[data-layer-caret="cameras"]').click();
    assert.equal(await page.locator('[data-layer-caret="cameras"]').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('[data-layer-item="camera"][data-id="qa-cam"]').isVisible(),true);
    // Per-element: hide the camera without touching the wall.
    await page.locator('[data-layer-item="camera"][data-id="qa-cam"]').click();
    assert.equal(await page.locator('#scene .camera-node').count(),0);
    assert.equal(await page.locator('#scene [data-id="qa-shape"]').count(),1);
    assert.equal(await page.evaluate(()=>state.cameras[0].visible),false);
    // Groups: walls, NVR, cables, grid; coverage syncs the legacy checkbox.
    await page.locator('[data-layer-group="walls"]').click();
    assert.equal(await page.locator('#scene [data-id="qa-shape"]').count(),0);
    await page.locator('[data-layer-group="nvr"]').click();
    assert.equal(await page.locator('#scene [data-nvr]').count(),0);
    await page.locator('[data-layer-group="cables"]').click();
    assert.equal(await page.locator('#scene [data-cable]').count(),0);
    await page.locator('[data-layer-group="grid"]').click();
    assert.equal(await page.locator('#gridBg').evaluate(n=>n.style.display),'none');
    await page.locator('[data-layer-group="coverage"]').click();
    assert.equal(await page.locator('#showCoverage').isChecked(),false);
    // Visibility is persisted with the plan in both modes.
    assert.equal(await page.evaluate(()=>state.layers.walls),false);
    assert.equal(await page.evaluate(()=>state.layers.grid),false);
    if(mode==='embedded'){
      assert.equal(await page.evaluate(()=>savedPlans.at(-1).plan.cameras[0].visible),false);
      assert.equal(await page.evaluate(()=>savedPlans.at(-1).plan.layers.walls),false);
    }else{
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).cameras[0].visible),false);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).layers.walls),false);
    }
    // Re-show the camera from the same panel.
    await page.locator('[data-layer-item="camera"][data-id="qa-cam"]').click();
    assert.equal(await page.locator('#scene .camera-node').count(),1);
    assert.equal(await page.evaluate(()=>state.cameras[0].visible),true);
    // Collapsing hides the items again.
    await page.locator('[data-layer-caret="cameras"]').click();
    assert.equal(await page.locator('[data-layer-item="camera"][data-id="qa-cam"]').isVisible(),false);
    // Lock: a locked terrain cannot be selected but is never deleted.
    await page.locator('[data-layer-lock="terrain"]').click();
    assert.equal(await page.locator('[data-layer-lock="terrain"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>state.locks.terrain),true);
    // Re-show walls so the next clicks can reach them.
    await page.locator('[data-layer-group="walls"]').click();
    const terrainPoint=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=200;p.y=140;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(terrainPoint.x,terrainPoint.y);
    assert.equal(await page.evaluate(()=>selected),null);
    assert.equal(await page.evaluate(()=>state.shapes.some(s=>s.id==='qa-terrain')),true);
    if(mode==='embedded')assert.equal(await page.evaluate(()=>savedPlans.at(-1).plan.locks.terrain),true);
    else assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vigia-project-v1')).locks.terrain),true);
    // The unlocked wall group still selects (away from the dimension label).
    const wallPoint=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=430;p.y=100;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(wallPoint.x,wallPoint.y);
    assert.equal(await page.evaluate(()=>selected),'qa-shape');
    // Unlocking restores selection; selecting closes the panel, so reopen it.
    await page.locator('#layersMenu').click();
    await page.locator('[data-layer-lock="terrain"]').click();
    assert.equal(await page.evaluate(()=>state.locks.terrain),false);
    await page.mouse.click(terrainPoint.x,terrainPoint.y);
    assert.equal(await page.evaluate(()=>selected),'qa-terrain');
    // Locked cameras cannot be selected or dragged.
    await page.locator('#layersMenu').click();
    await page.locator('[data-layer-lock="cameras"]').click();
    const cameraPoint=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=500;p.y=400;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(cameraPoint.x,cameraPoint.y);
    assert.equal(await page.evaluate(()=>selected),null);
    assert.equal(await page.evaluate(()=>state.cameras[0].x),500);
    await page.locator('[data-layer-lock="cameras"]').click();
    // Locked background cannot be selected either.
    await page.evaluate(()=>{state.background={src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',x:50,y:40,width:400,height:300,opacity:.65};refresh()});
    await page.locator('[data-layer-lock="background"]').click();
    const bgPoint=await page.evaluate(()=>{const p=$('canvas').createSVGPoint();p.x=350;p.y=250;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}});
    await page.mouse.click(bgPoint.x,bgPoint.y);
    assert.equal(await page.evaluate(()=>selected),null);
    await page.locator('[data-layer-lock="background"]').click();
    await page.mouse.click(bgPoint.x,bgPoint.y);
    assert.equal(await page.evaluate(()=>selected),'background');
    // Illustrated shortcuts live on the dock.
    assert.match(await page.locator('.dock-tool[data-tool=wall]').innerText(),/W/);
    assert.match(await page.locator('.dock-tool[data-tool=wall]').innerText(),/5/);
    assert.match(await page.locator('#panTool').innerText(),/1/);
    // Escape closes the panel.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#layerPanel').isVisible(),false);
    assert.equal(await page.evaluate(()=>SAFE_WORKSPACE_UI.layersOpen),false);
  }],
  ['wall tool: rubber-band projects to the cursor until the next click',async(page,mode)=>{
    await fixture(page,mode,[[100,100],[300,100],[300,220],[100,220]],'house');
    await page.keyboard.press('5');
    assert.equal(await page.evaluate(()=>tool),'wall');
    const toScreen=(x,y)=>page.evaluate(([x,y])=>{const p=$('canvas').createSVGPoint();p.x=x;p.y=y;const r=p.matrixTransform($('canvas').getScreenCTM());return{x:r.x,y:r.y}},[x,y]);
    const a=await toScreen(200,100),b=await toScreen(200,300);
    await page.mouse.click(a.x,a.y);
    assert.equal(await page.evaluate(()=>draft.length),1);
    await page.mouse.move(b.x,b.y,{steps:2});
    const preview=page.locator('#scene .wall-preview');
    assert.equal(await preview.count(),1);
    const pts=(await preview.getAttribute('points')).trim().split(/\s+/);
    assert.equal(pts.length,2);
    assert.equal(pts[1],'200,300');
    await page.mouse.click(b.x,b.y);
    assert.equal(await page.locator('#scene .wall-preview').count(),0);
    const walls=(await snapshot(page)).shapes.filter(s=>s.type==='wall');
    assert.equal(walls.length,1);
    assert.deepEqual(walls[0].points,[[200,100],[200,300]]);
    assert.equal(await page.evaluate(()=>tool),'select');
    // Enter with a single point keeps the draft; Escape cancels it.
    await page.keyboard.press('5');
    const c=await toScreen(400,100);
    await page.mouse.click(c.x,c.y);
    await page.keyboard.press('Enter');
    assert.equal((await snapshot(page)).shapes.filter(s=>s.type==='wall').length,1);
    assert.equal(await page.evaluate(()=>tool),'wall');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>draft.length),0);
    assert.equal(await page.evaluate(()=>wallHover),null);
    assert.equal(await page.evaluate(()=>tool),'select');
  }]
];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.SAFE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  let failed=0;
  for(const mode of ['standalone','embedded'])for(const [name,test]of tests){
    const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(4000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {await test(page,mode);assert.deepEqual(errors,[]);console.log('PASS',mode,name)}catch(e){failed++;console.error('FAIL',mode,name,e.message)}finally{await page.close()}
  }
  await browser.close();if(failed)process.exitCode=1;
})();
