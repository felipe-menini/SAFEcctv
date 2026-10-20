/* Real HTTP, fresh browser contexts, temporary data only. Credentials from test runner env. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.SAFE_TEST_URL || 'http://127.0.0.1:18787';
const password = process.env.SAFE_TEST_PASSWORD;
if (!password) throw Error('Set SAFE_TEST_PASSWORD to a generated test secret');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SAFE_CHROMIUM||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const username of ['fmenini','smenini']){
   const context=await browser.newContext(),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/login');
   await page.locator('#username').fill(username);await page.locator('#password').fill(password);await page.locator('button[type=submit]').click();
   await page.waitForURL(username==='fmenini'?base+'/':base+'/cctv');
   if(username==='fmenini'){
    await page.waitForFunction(()=>!!window.SAFE_APP);
    await page.evaluate(()=>{SAFE_APP.state.settings.companyPhone='QA phone';SAFE_APP.state.packages=[{id:'qa-kit',name:'QA kit'}];SAFE_APP.quote.clientName='QA client';SAFE_APP.persist();SAFE_APP.draftSave()});
    await page.evaluate(()=>SafeServer.flush());await page.reload();await page.waitForFunction(()=>!!window.SAFE_APP);
    assert.equal(await page.evaluate(()=>SAFE_APP.state.settings.companyPhone),'QA phone');assert.equal(await page.evaluate(()=>SAFE_APP.quote.clientName),'QA client');
    // Regression: immediate logout must capture edits before any debounce timer runs.
    await page.evaluate(()=>{const el=document.getElementById('clientName');el.value='Immediate last input';el.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('safeLogout').click()});
    await page.waitForURL(base+'/login');await page.locator('#username').fill(username);await page.locator('#password').fill(password);await page.locator('button[type=submit]').click();await page.waitForURL(base+'/');await page.waitForFunction(()=>!!window.SAFE_APP);
    assert.equal(await page.evaluate(()=>SAFE_APP.quote.clientName),'Immediate last input');
    // Broken bootstrap must never silently switch into browser/localStorage mode.
    for(const asset of ['session.js','safe-server.js']){
     await page.evaluate(()=>localStorage.setItem('safe-security-cotizador-v1',JSON.stringify({settings:{companyName:'STALE_LOCAL'}})));
     await page.route('**/'+asset,r=>r.abort());await page.reload();await page.getByRole('heading',{name:'No se pudo cargar la sesión'}).waitFor();assert.equal(await page.evaluate(()=>!!window.SAFE_APP),false);await page.unroute('**/'+asset);await page.reload();await page.waitForFunction(()=>!!window.SAFE_APP);
    }
    assert.notEqual(await page.evaluate(()=>SAFE_APP.state.settings.companyName),'STALE_LOCAL');
    await page.evaluate(()=>SAFE_APP.showView('plano'));await page.frameLocator('#safePlannerFrame').locator('#canvas').waitFor();
   }else{
    assert.equal((await page.request.get(base+'/api/workspace')).status(),403);
    await page.locator('#newPlan').click();await page.frameLocator('#safePlannerFrame').locator('#canvas').waitFor();
    await page.waitForFunction(()=>document.getElementById('safePlannerFrame').contentWindow.SAFE_PLANNER);
    await page.evaluate(()=>{const w=document.getElementById('safePlannerFrame').contentWindow,p=w.SAFE_PLANNER.snapshot();p.name='QA saved plan';w.SAFE_PLANNER.load(p,SAFE_APP.quote.id);SafePlanner.accept(p,SAFE_APP.quote.id)});
    await page.evaluate(()=>SafeCctv.flush());await page.reload();await page.locator('#plans button').first().click();await page.waitForFunction(()=>document.getElementById('safePlannerFrame').contentWindow.SAFE_PLANNER);
    assert.equal(await page.evaluate(()=>document.getElementById('safePlannerFrame').contentWindow.SAFE_PLANNER.snapshot().name),'QA saved plan');
   }
   assert.deepEqual(errors,[]);await page.locator('#safeLogout').click();await page.waitForURL(base+'/login');await context.close();
  }
  console.log('PASS real HTTP login, role ACL, admin settings/packages/draft reload, CCTV owner plan reload, logout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
