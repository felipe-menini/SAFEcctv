/* Shared UI contract; the server independently validates every field and request. */
(()=>{'use strict';const boot=window.__SAFE_BOOT;if(!boot)return;const all=['cotizador','plano','relevamiento','paquetes','almacenamiento','presupuestos','catalogo','proveedores','configuracion','ayuda'];
const allowed=new Set(boot.modules|| (boot.role==='admin'?all:['plano']));
const tech={survey:'relevamiento',storagePlan:'almacenamiento',cctvPlan:'plano'};
const quoteFields=new Set('id number clientName clientPhone clientAddress issueDate validDays pdfCurrency attachPlanSchematic fxRate fxUpdatedAt fxSource fxManual items installMode installDifficulty installWifiRate installAnalogRate installIpRate installRecorderRate analogCamerasPerKit installPercent installFixed installTasks helperQty helperPayEach helperSaleEach helperAutoSaleEnabled transportCost transportSell perDiemCost perDiemSell otherCost otherSell warrantyReserve overhead discountType discountValue paymentTerms leadTime scopeIncluded scopeExcluded warrantyText internalNotes updatedAt'.split(' '));
function project(q,history=false){if(!q)return {id:'draft'};return Object.fromEntries(Object.entries(q).filter(([k])=> k==='id'||(quoteFields.has(k)&&(allowed.has('cotizador')||history))||(k==='items'&&allowed.has('paquetes'))||allowed.has(tech[k])))}
function snapshot(w){if(boot.role==='admin')return w;const out={};for(const [key,module]of Object.entries({settings:'configuracion',catalog:'catalogo',suppliers:'proveedores',packages:'paquetes'}))if(allowed.has(module))out[key]=w[key];if(['cotizador','plano','relevamiento','almacenamiento','paquetes'].some(m=>allowed.has(m)))out.draft=project(w.draft);if(allowed.has('presupuestos'))out.saved=(w.saved||[]).map(q=>project(q,true));return out}
function apply(){for(const n of document.querySelectorAll('[data-view]'))n.hidden=!allowed.has(n.dataset.view);for(const n of document.querySelectorAll('.view'))if(!allowed.has(n.id.replace('view-','')))n.hidden=true;
const hide=(ids)=>{for(const id of ids){const n=document.getElementById(id);if(n)n.hidden=true}};
if(!allowed.has('cotizador')){hide(['newQuoteTop','saveQuoteTop','generatePdf','printQuote','resetQuote']);document.querySelectorAll('[data-action="new-quote"],[data-backquote]').forEach(n=>n.hidden=true)}
if(!allowed.has('presupuestos'))hide(['saveQuote','saveQuoteTop']);
if(boot.role!=='admin')hide(['exportBackup','backupFromSaved','importBackup','supplierBackupNow','safePending']);
if(!allowed.has('plano'))hide(['attachPlanSchematic']);
if(!allowed.has('cotizador'))document.querySelectorAll('[data-package-apply]').forEach(n=>n.hidden=true);
}
window.SafeAccess={can:m=>allowed.has(m),snapshot,project,apply,first:()=>all.find(m=>allowed.has(m))};document.addEventListener('DOMContentLoaded',()=>{apply();if(window.SAFE_APP){const first=window.SafeAccess.first();if(first)SAFE_APP.showView(first)}});
})();
