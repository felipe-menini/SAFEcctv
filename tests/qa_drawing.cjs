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
const tests=[];
for(const type of ['house','terrain'])for(const gesture of ['drag','clicks','enter','close','double'])tests.push([`${type} ${gesture}`,async(page,mode)=>{
 await fixture(page,mode);await page.evaluate(()=>{state.shapes=[];state.cameras=[];selected=null;refresh()});
 await page.locator(`[data-tool="${type}"]`).click();
 const polygon=!['drag','clicks'].includes(gesture);if(polygon)await page.locator('#shapePolygon').click();
 const box=await page.locator('#canvas').boundingBox();const a={x:box.x+box.width*.35,y:box.y+box.height*.35},b={x:box.x+box.width*.55,y:box.y+box.height*.55},c={x:a.x,y:b.y};
 if(gesture==='drag'){await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up()}
 else {await page.mouse.click(a.x,a.y);await page.mouse.click(b.x,b.y);if(polygon){if(gesture==='double')await page.mouse.dblclick(c.x,c.y);else {await page.mouse.click(c.x,c.y);if(gesture==='enter')await page.keyboard.press('Enter');else await page.mouse.click(a.x,a.y)}}}
 const snap=await snapshot(page);assert.equal(snap.shapes.length,1,JSON.stringify(await page.evaluate(()=>({tool,draft,active:document.activeElement.outerHTML}))));assert.equal(snap.shapes[0].type,type);assert.equal(snap.shapes[0].points.length,polygon?3:4);assert.equal(await page.evaluate(()=>tool),'select');
}]);
tests.push(['wall two clicks',async(page,mode)=>{await fixture(page,mode);await page.evaluate(()=>{state.shapes=[];state.cameras=[];selected=null;refresh()});await page.locator('[data-tool="wall"]').click();const box=await page.locator('#canvas').boundingBox();await page.mouse.click(box.x+box.width*.35,box.y+box.height*.35);await page.mouse.click(box.x+box.width*.55,box.y+box.height*.55);assert.equal((await snapshot(page)).shapes.length,1);assert.equal(await page.evaluate(()=>tool),'select')}]);
(async()=>{const browser=await chromium.launch({executablePath:process.env.SAFE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let failed=0;for(const mode of ['standalone','embedded'])for(const [name,test]of tests){const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(4000);const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await test(page,mode);assert.deepEqual(errors,[]);console.log('PASS',mode,name)}catch(e){failed++;console.error('FAIL',mode,name,e.message,errors)}finally{await page.close()}}await browser.close();if(failed)process.exitCode=1})();