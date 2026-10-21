/* SAFE Security · Manager v1.9 · Sin librerías ni servicios externos */
(function(){
'use strict';
if(window.__SAFE_SERVER_REQUIRED&&(!window.__SAFE_BOOT||!window.SafeServer)){document.body.innerHTML='<main class="auth-card" style="margin:10vh auto"><h1>No se pudo cargar la sesión</h1><p>No se abrirán datos locales ni se guardarán cambios sin conexión.</p><a href="/">Reintentar</a> · <a href="/login">Iniciar sesión</a></main>';return}
const STORAGE_KEY='safe-security-cotizador-v1';
const DRAFT_KEY='safe-security-cotizador-draft-v1';
const CATEGORY_LABELS={wifi:'Cámaras WiFi',sd:'Memorias microSD',analog:'Kits analógicos (DVR)',ip:'Kits IP (NVR)',cable:'Cableado UTP',connector:'Conectores de red',accessory:'Accesorios e instalación',other:'Otros materiales'};
const initialCatalog=[
{id:'wifi-h1c',name:'EZVIZ H1C',category:'wifi',cost:26,description:'Solo cámara WiFi; sin microSD, enchufe/toma, caja estanca ni canalización.'},
{id:'wifi-h6c',name:'EZVIZ H6C',category:'wifi',cost:35,description:'Solo cámara WiFi; sin microSD, enchufe/toma, caja estanca ni canalización.'},
{id:'wifi-h3c',name:'EZVIZ H3C 3MP',category:'wifi',cost:45,description:'Solo cámara WiFi; sin microSD, enchufe/toma, caja estanca ni canalización.'},
{id:'wifi-h8c',name:'EZVIZ H8C',category:'wifi',cost:62,description:'Solo cámara WiFi; sin microSD, enchufe/toma, caja estanca ni canalización.'},
{id:'sd-64',name:'MicroSD 64 GB',category:'sd',cost:12,description:'Tarjeta de memoria; verificar compatibilidad y tipo recomendado para grabación.'},
{id:'sd-128',name:'MicroSD 128 GB',category:'sd',cost:24,description:'Tarjeta de memoria; verificar compatibilidad y tipo recomendado para grabación.'},
{id:'sd-256',name:'MicroSD 256 GB',category:'sd',cost:43,description:'Tarjeta de memoria; verificar compatibilidad y tipo recomendado para grabación.'},
{id:'analog-dahua',name:'Dahua analógico · DVR 4 canales',category:'analog',cost:177,description:'DVR 4 canales, 4 cajas estancas, fuente, balunes, disco 500 GB. Sin cable ni canalización. Confirmar cámaras incluidas.'},
{id:'analog-hilook',name:'HiLook analógico · DVR 4 canales',category:'analog',cost:170,description:'DVR 4 canales, 4 cajas estancas, fuente, balunes, disco 500 GB. Sin cable ni canalización. Confirmar cámaras incluidas.'},
{id:'analog-hilook-color',name:'HiLook ColorVu analógico · DVR 4 canales',category:'analog',cost:179,description:'DVR 4 canales, 4 cajas estancas, fuente, balunes, disco 500 GB. Sin cable ni canalización. Confirmar cámaras incluidas.'},
{id:'analog-hik-color',name:'Hikvision ColorVu analógico · DVR 4 canales',category:'analog',cost:220,description:'DVR 4 canales, 4 cajas estancas, fuente, balunes, disco 500 GB. Sin cable ni canalización. Confirmar cámaras incluidas.'},
{id:'ip-tiandy-color',name:'Tiandy IP Color · 4 cámaras + NVR',category:'ip',cost:210,description:'4 cámaras IP color, NVR, 4 cajas estancas, HDD 500 GB, 75 m de cable. Faltan canalización y fichas.'},
{id:'ip-tiandy',name:'Tiandy IP · 4 cámaras + NVR',category:'ip',cost:190,description:'4 cámaras IP, NVR, 4 cajas estancas, HDD 500 GB, 75 m de cable. Faltan canalización y fichas.'},
{id:'cable-150',name:'Cable UTP Cat 5e · rollo 150 m',category:'cable',cost:22,description:'Cable Cat 5e adicional: rollo de 150 metros.'},
{id:'cable-305',name:'Cable UTP Cat 5e · rollo 305 m',category:'cable',cost:46,description:'Cable Cat 5e adicional: rollo de 305 metros.'},
{id:'rj45-100',name:'Conectores RJ45 Cat 5e · 100 unidades',category:'connector',cost:10,description:'Paquete de 100 fichas RJ45 para cable categoría 5e.'},
{id:'accesorio-enchufe',name:'Enchufe / toma de corriente',category:'accessory',cost:90,currency:'UYU',taxIncluded:true,description:'Accesorio de alimentación. La instalación eléctrica adicional se presupuesta aparte.'},
{id:'accesorio-caja',name:'Caja estanca chica',category:'accessory',cost:85,currency:'UYU',taxIncluded:true,description:'Caja estanca pequeña para resguardar conexiones.'}
];
const initialSettings={companyName:'SAFE Security',companyPhone:'',companyEmail:'',companyWeb:'',companyAddress:'Montevideo, Uruguay',logoData:'',defaultMargin:35,saleTaxRate:22,purchaseTaxRate:22,taxMode:'iva',serviceTaxRate:0,currencyDecimals:2};
const makeId=()=> 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const dateLocal=()=> {const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return /^\d{4}-\d{2}-\d{2}$/.test(p)?p:new Date().toISOString().slice(0,10)};
const createQuote=(seq=1)=>({id:makeId(),number:'SAFE-'+String(seq).padStart(4,'0'),clientName:'',clientPhone:'',clientAddress:'',issueDate:dateLocal(),validDays:15,pdfCurrency:'USD',attachPlanSchematic:false,fxRate:0,fxUpdatedAt:'',fxSource:'',fxManual:false,items:[],installMode:'auto',installDifficulty:'normal',installWifiRate:25,installAnalogRate:30,installIpRate:35,installRecorderRate:35,analogCamerasPerKit:4,installPercent:30,installFixed:160,installTasks:[],helperQty:1,helperPayEach:35,helperSaleEach:55/1.22,helperAutoSaleEnabled:true,transportCost:12,transportSell:20,perDiemCost:0,perDiemSell:0,otherCost:0,otherSell:0,warrantyReserve:20,overhead:0,discountType:'amount',discountValue:0,paymentTerms:'50% de seña y 50% contra entrega',leadTime:'A coordinar tras relevamiento',scopeIncluded:'Suministro e instalación de los equipos detallados, fijaciones y configuración inicial, acceso desde celular cuando el equipo lo permita y pruebas de funcionamiento. Incluye desplazamiento ordinario.',scopeExcluded:'No incluye obra civil, canalización extraordinaria, elevadores, instalación eléctrica, servicio de internet ni adicionales no detallados. Sujeto a relevamiento.',warrantyText:'Garantía de equipos según condiciones del fabricante o proveedor. La instalación tiene garantía por defectos de montaje; no cubre daños por terceros, sobretensión o mal uso.',internalNotes:'',updatedAt:new Date().toISOString()});
const $=id=>document.getElementById(id);
const num=(v,def=0)=>{const n=Number(v);return Number.isFinite(n)?n:def};
const money=(v,dec=2)=>'USD '+num(v).toLocaleString('es-UY',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=(v)=>num(v).toFixed(1).replace('.0','')+'%';
const deep=val=>JSON.parse(JSON.stringify(val));
function safeSupplierUrl(raw){
 const rawString=String(raw||'').trim();if(!rawString)return '';
 try{const url=new URL(/^https?:\/\//i.test(rawString)?rawString:'https://'+rawString);if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)return '';return url.href}
 catch{return ''}
}
function cleanSupplier(s){return {id:String(s.id||makeId()).slice(0,100),name:String(s.name||'').trim().slice(0,120),website:safeSupplierUrl(s.website),contact:String(s.contact||'').trim().slice(0,120),phone:String(s.phone||'').trim().slice(0,75),email:String(s.email||'').trim().slice(0,120),address:String(s.address||'').trim().slice(0,200),brands:String(s.brands||'').trim().slice(0,200),notes:String(s.notes||'').trim().slice(0,1200),updatedAt:String(s.updatedAt||new Date().toISOString()).slice(0,40)}}
const cleanProduct=p=>({id:String(p.id||makeId()),name:String(p.name||'Producto sin nombre').slice(0,180),category:CATEGORY_LABELS[p.category]?p.category:'other',cost:Math.max(0,num(p.cost)),currency:p.currency==='UYU'?'UYU':'USD',taxIncluded:Boolean(p.taxIncluded),image:String(p.image||'').slice(0,1500000),description:String(p.description||'').slice(0,700),...(Number.isFinite(p.salePrice)?{salePrice:p.salePrice}:{}),supplierId:String(p.supplierId||'').slice(0,100)});
function migrateQuote(q){if(!q||typeof q!=='object')return createQuote();if(q.installMode){return {...createQuote(),...q,helperSaleEach:('helperSaleEach' in q)?Math.max(0,num(q.helperSaleEach)):55/(1+num(state.settings.saleTaxRate)/100),helperAutoSaleEnabled:('helperAutoSaleEnabled' in q)?Boolean(q.helperAutoSaleEnabled):false,installTasks:Array.isArray(q.installTasks)?q.installTasks:[]};}const legacyInstall=Math.max(0,num(q.laborHours)*num(q.laborRate)+num(q.helperQty)*num(q.helperDays)*num(q.helperSellDay)+num(q.transportSell)+num(q.perDiemSell));return {...createQuote(),...q,installMode:'fixed',installDifficulty:'normal',installFixed:Number(Math.max(0,legacyInstall-num(q.transportSell)-num(q.perDiemSell)).toFixed(2)),helperPayEach:num(q.helperDays)*num(q.helperCostDay),helperSaleEach:55/(1+num(state.settings.saleTaxRate)/100),helperAutoSaleEnabled:false,installTasks:[]};}
let state;
try{const loaded=window.__SAFE_BOOT?.workspace||JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');state={settings:{...initialSettings,...(loaded?.settings||{}),taxMode:'iva'},catalog:Array.isArray(loaded?.catalog)&&(!window.__SAFE_BOOT||window.__SAFE_BOOT.revision>0||window.__SAFE_BOOT.role!=='admin')?loaded.catalog.map(cleanProduct):deep(initialCatalog),saved:Array.isArray(loaded?.saved)?loaded.saved:[],packages:Array.isArray(loaded?.packages)?loaded.packages:[],suppliers:Array.isArray(loaded?.suppliers)?loaded.suppliers.map(cleanSupplier):[]};}catch(e){state={settings:deep(initialSettings),catalog:deep(initialCatalog),saved:[],packages:[],suppliers:[]};}
for(const p of initialCatalog.filter(p=>p.currency==='UYU'&&(!window.__SAFE_BOOT||(window.__SAFE_BOOT.role==='admin'&&window.__SAFE_BOOT.revision===0))))if(!state.catalog.some(x=>x.id===p.id))state.catalog.push(cleanProduct(p));
const seqNum=()=>1+state.saved.reduce((max,q)=>Math.max(max,Number(String(q.number||'').split('-').pop())||0),0);
let quote;
try{const draft=window.__SAFE_BOOT?window.__SAFE_BOOT.workspace.draft:JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');quote=draft?.items&&Array.isArray(draft.items)?migrateQuote(draft):createQuote(seqNum());}catch{quote=createQuote(seqNum())}state.saved=state.saved.map(migrateQuote);
let view='cotizador',autoSaveTimer,modalHandler=()=>{},modalOpen=false;
function serverSnapshot(){return {...state,draft:quote}}
function persist(){if(window.SafeServer)return window.SafeServer.schedule(serverSnapshot());try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch(e){toast('No se pudo guardar. Revisá el espacio disponible del navegador.',true);return false}}
let draftStorageWarned=false;function draftSave(){if(window.SafeServer)return window.SafeServer.schedule(serverSnapshot());try{localStorage.setItem(DRAFT_KEY,JSON.stringify(quote));draftStorageWarned=false;return true}catch(e){if(!draftStorageWarned){draftStorageWarned=true;toast('No se pudo guardar el borrador (posiblemente por demasiadas fotos). Usá el servidor local y Guardar presupuesto o exportá un respaldo.',true)}return false}}
function queueDraft(){if(window.SafeServer){draftSave();return}clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(draftSave,280)}
function safeConfirm(message,options={}){
 return new Promise(resolve=>{
  const backdrop=$('safeConfirmBackdrop'),accept=$('safeConfirmAccept'),cancel=$('safeConfirmCancel');
  if(!backdrop){resolve(false);return}
  const prior=document.activeElement;
  $('safeConfirmTitle').textContent=options.title||'¿Confirmar esta acción?';
  $('safeConfirmMessage').textContent=message;
  accept.textContent=options.accept||'Confirmar';
  accept.classList.toggle('danger-confirm',Boolean(options.danger));
  backdrop.hidden=false;
  function finish(result){backdrop.hidden=true;accept.removeEventListener('click',yes);cancel.removeEventListener('click',no);backdrop.removeEventListener('click',bg);document.removeEventListener('keydown',keyboard,true);if(prior?.focus)prior.focus();resolve(result)}
  const yes=()=>finish(true),no=()=>finish(false),bg=e=>{if(e.target===backdrop)finish(false)},keyboard=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false)}if(e.key==='Tab'){const t=e.shiftKey?cancel:accept;e.preventDefault();t.focus()}};
  accept.addEventListener('click',yes);cancel.addEventListener('click',no);backdrop.addEventListener('click',bg);document.addEventListener('keydown',keyboard,true);cancel.focus();
 });
}
const collapsedMemory=new Map();
function initializeCollapsible(root){
 if(!root)return;
 root.querySelectorAll('.panel').forEach((panel,i)=>{
  let head=panel.querySelector(':scope > .panel-head');const body=panel.querySelector(':scope > .panel-body');
  if(!body)return;
  if(!head){
   const labels={"view-presupuestos":['Lista de presupuestos','Abrí o administrá cotizaciones archivadas'],"view-catalogo":['Productos y precios','Consultá y editá tu catálogo'],"view-proveedores":['Directorio de proveedores','Contactos y enlaces comerciales']};
   const info=labels[root.id];if(!info||panel!==root.querySelector('.panel'))return;
   head=document.createElement('div');head.className='panel-head';head.innerHTML='<div class="panel-icon">01</div><div><h2>'+info[0]+'</h2><p>'+info[1]+'</p></div>';panel.insertBefore(head,body);
  }
  if(head.querySelector('.collapse-toggle'))return;
  panel.classList.add('collapsible-panel');head.classList.add('clickable-panel-head');
  const id=(root.id||'module')+'-body-'+i;body.id=id;
  const btn=document.createElement('button');btn.type='button';btn.className='collapse-toggle';btn.setAttribute('aria-controls',id);
  btn.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  head.append(btn);
  const set=collapsed=>{collapsedMemory.set(id,collapsed);panel.classList.toggle('collapsed',collapsed);btn.setAttribute('aria-expanded',String(!collapsed));btn.setAttribute('aria-label',collapsed?'Desplegar módulo':'Contraer módulo')};
  set(Boolean(collapsedMemory.get(id)));
  btn.addEventListener('click',e=>{e.stopPropagation();set(!panel.classList.contains('collapsed'))});
  head.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea,label'))return;set(!panel.classList.contains('collapsed'))});
 });
}
function showView(name){if(window.SafeAccess&&!SafeAccess.can(name))return;view=name;document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active-view',e.id==='view-'+name));document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('is-active',e.dataset.view===name));$('currentPageLabel').textContent={plano:'Plano CCTV',cotizador:'Cotizador',presupuestos:'Mis presupuestos',catalogo:'Catálogo y precios',proveedores:'Proveedores',configuracion:'Configuración',ayuda:'Guía de uso',relevamiento:'Relevamiento',paquetes:'Paquetes comerciales',almacenamiento:'Grabación y almacenamiento'}[name];$('sidebar').classList.remove('menu-open');if(name==='presupuestos')renderSaved();if(name==='catalogo')renderCatalog();if(name==='proveedores')renderSuppliers();if(name==='configuracion')fillSettings();if(window.SafeTechnical)window.SafeTechnical.onView(name);if(window.SafePlanner)window.SafePlanner.onView(name);initializeCollapsible($('view-'+name));window.scrollTo({top:0,behavior:'smooth'});}
function toast(message,error=false){const n=document.createElement('div');n.className='toast '+(error?'error':'success');n.textContent=message;$('toastWrap').append(n);setTimeout(()=>n.remove(),4200)}
const moneyShort=v=>money(v,state.settings.currencyDecimals);
function purchaseCost(cost){return num(cost)}
function suggestSale(raw){return purchaseCost(raw)/Math.max(.05,1-num(state.settings.defaultMargin)/100)}
const saleRate=()=>Math.max(0,num(state.settings.saleTaxRate))/100;
const gross=net=>num(net)*(1+saleRate());
const purchaseGross=net=>num(net)*(1+Math.max(0,num(state.settings.purchaseTaxRate))/100);
const netFromGross=v=>num(v)/(1+saleRate());
const uyumoney=v=>'UYU '+num(v).toLocaleString('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2});
const formatNative=p=>p.currency==='UYU'?uyumoney(p.taxIncluded?p.cost:p.cost*(1+num(state.settings.purchaseTaxRate)/100)):money(p.taxIncluded?p.cost:p.cost*(1+num(state.settings.purchaseTaxRate)/100));
function nativeNetUSD(p,q=quote){if(p.currency==='UYU'){if(num(q.fxRate)<=0)return null;return num(p.cost)/(p.taxIncluded?(1+num(state.settings.purchaseTaxRate)/100):1)/num(q.fxRate)}return num(p.cost)/(p.taxIncluded?(1+num(state.settings.purchaseTaxRate)/100):1)}
function refreshUYUCosts(q){for(const x of(q.items||[])){if(x.sourceCurrency==='UYU'&&num(q.fxRate)>0){x.cost=num(x.sourceCost)/(x.sourceTaxIncluded?(1+num(state.settings.purchaseTaxRate)/100):1)/num(q.fxRate);if(x.autoSale)x.sale=suggestSale(x.cost)}}}
const FX_URL='https://uy.dolarapi.com/v1/cotizaciones/usd';
const fxLocalDay=date=>{if(!date)return '';const d=new Date(date);if(!Number.isFinite(d.getTime()))return '';return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
const todayUYU=()=>fxLocalDay(new Date());
async function fetchRate(q=quote,{quiet=false}={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8500);
 try{const res=await fetch(FX_URL+'?t='+Date.now(),{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();const rate=num(data.venta);if(rate<10||rate>200||String(data.moneda||'').toUpperCase()!=='USD')throw Error('respuesta inválida');if(!data.fechaActualizacion)throw Error('sin fecha de actualización');
 q.fxRate=rate;q.fxUpdatedAt=data.fechaActualizacion;q.fxSource='BROU vía DolarAPI';q.fxManual=false;refreshUYUCosts(q);if(q===quote){updateExchangeUI();renderItems();refreshAll();renderPicker();queueDraft()}if(!quiet)toast('Dólar venta BROU actualizado: '+uyumoney(rate));return true;
 }catch(e){if(q===quote){updateExchangeUI('No se pudo consultar: '+e.message)}if(!quiet)toast('No se pudo obtener cotización. Podés ingresarla manualmente y quedará aclarado en el PDF.',true);return false}finally{clearTimeout(timeout)}
}
function updateExchangeUI(warn=''){const badge=$('exchangeStatus');if(!badge)return;const label=num(quote.fxRate)>0?'1 USD = '+uyumoney(quote.fxRate)+' · '+(quote.fxSource||'manual')+' · '+(quote.fxUpdatedAt?fxLocalDay(quote.fxUpdatedAt):'sin fecha'):'Sin cotización cargada';badge.textContent=(warn?warn+' · ':'')+label;badge.classList.toggle('fx-warning',!!warn||!quote.fxRate||quote.fxManual);$('fxRate').value=num(quote.fxRate)>0?Number(quote.fxRate).toFixed(2):'';$('pdfCurrency').value=quote.pdfCurrency||'USD';const attachScheme=$('attachPlanSchematic');if(attachScheme)attachScheme.checked=!!quote.attachPlanSchematic;}
function setManualFX(){const rate=num($('fxRate').value);if(rate<10||rate>200){toast('Ingresá una cotización USD/UYU válida.',true);return}quote.fxRate=rate;quote.fxUpdatedAt=new Date().toISOString();quote.fxSource='Cotización ingresada manualmente';quote.fxManual=true;refreshUYUCosts(quote);renderItems();refreshAll();renderPicker();updateExchangeUI();queueDraft();toast('Cotización manual aplicada; se identificará en el PDF.')}

function installDetail(q=quote){
 const counts={wifi:0,analog:0,ip:0,recorders:0};let eligibleSale=0;
 for(const item of(q.items||[])){const qty=Math.max(0,num(item.quantity));if(qty<=0)continue;
 if(item.category==='wifi'){counts.wifi+=qty;eligibleSale+=qty*num(item.sale)}
 if(item.category==='analog'){counts.analog+=qty*num(q.analogCamerasPerKit);counts.recorders+=qty;eligibleSale+=qty*num(item.sale)}
 if(item.category==='ip'){counts.ip+=qty*4;counts.recorders+=qty;eligibleSale+=qty*num(item.sale)}
 }
 const factor={simple:.85,normal:1,complex:1.30,veryComplex:1.55}[q.installDifficulty]??1;
 const automaticBase=counts.wifi*num(q.installWifiRate)+counts.analog*num(q.installAnalogRate)+counts.ip*num(q.installIpRate)+counts.recorders*num(q.installRecorderRate);
 const percentageBase=eligibleSale*num(q.installPercent)/100;
 const fixedBase=num(q.installFixed);
 const mode=['auto','percent','fixed'].includes(q.installMode)?q.installMode:'auto';
 const base=mode==='fixed'?fixedBase:mode==='percent'?percentageBase:automaticBase;
 const adjusted=base*factor;
 const extras=(Array.isArray(q.installTasks)?q.installTasks:[]).map(task=>({...task,qty:Math.max(0,num(task.qty)),price:Math.max(0,num(task.price)),cost:Math.max(0,num(task.cost))}));
 const extraSale=extras.reduce((a,x)=>a+x.qty*x.price,0);
 const extraCost=extras.reduce((a,x)=>a+x.qty*x.cost,0);
 const mobility=Math.max(0,num(q.transportSell))+Math.max(0,num(q.perDiemSell));
 const helperQty=Math.max(0,Math.floor(num(q.helperQty)));
 const helpersSale=q.helperAutoSaleEnabled===false?0:helperQty*Math.max(0,num(q.helperSaleEach));
 const sale=Math.max(0,adjusted+extraSale+mobility+helpersSale);
 return{counts,eligibleSale,factor,mode,base,adjusted,extraSale,extraCost,mobility,helperQty,helpersSale,sale,extras};
}
function totals(q=quote){
 refreshUYUCosts(q);const items=(q.items||[]).map(x=>({...x,quantity:Math.max(0,num(x.quantity)),cost:Math.max(0,num(x.cost)),sale:Math.max(0,num(x.sale))}));
 const goodsSale=items.reduce((a,x)=>a+x.quantity*x.sale,0),goodsCost=items.reduce((a,x)=>a+x.quantity*purchaseCost(x.cost),0);
 const installation=installDetail(q),installSale=installation.sale,otherSell=Math.max(0,num(q.otherSell));
 const servicesSale=installSale+otherSell,preDiscount=goodsSale+servicesSale;
 const discount=Math.min(preDiscount,Math.max(0,q.discountType==='percent'?preDiscount*num(q.discountValue)/100:num(q.discountValue)));
 // Los importes visibles ya son finales. Solo los equipos generan IVA
 // cuando la tasa de instalacion/servicios esta configurada en cero.
 // El descuento se prorratea para no gravar la parte no gravada.
 const goodsFinal=gross(goodsSale),servicesFinal=gross(servicesSale),beforeDiscount=goodsFinal+servicesFinal;
 const discountFinal=Math.min(beforeDiscount,Math.max(0,q.discountType==='percent'?beforeDiscount*num(q.discountValue)/100:gross(q.discountValue)));
 const factor=beforeDiscount>0?(beforeDiscount-discountFinal)/beforeDiscount:1;
 const goodsDiscounted=goodsFinal*factor,servicesDiscounted=servicesFinal*factor;
 const serviceTaxRate=Math.max(0,num(state.settings.serviceTaxRate))/100;
 const goodsVat=state.settings.taxMode==='iva'?goodsDiscounted-goodsDiscounted/(1+saleRate()):0;
 const serviceVat=state.settings.taxMode==='iva'?servicesDiscounted-servicesDiscounted/(1+serviceTaxRate):0;
 const vat=goodsVat+serviceVat,customerTotal=goodsDiscounted+servicesDiscounted;
 const subtotal=Math.max(0,customerTotal-vat);
 const helperCost=Math.max(0,Math.floor(num(q.helperQty)))*Math.max(0,num(q.helperPayEach));
 const servicesCost=helperCost+Math.max(0,num(q.transportCost))+Math.max(0,num(q.perDiemCost))+Math.max(0,num(q.otherCost))+Math.max(0,num(q.warrantyReserve))+Math.max(0,num(q.overhead))+installation.extraCost;
 const costs=goodsCost+servicesCost,profit=subtotal-costs,margin=subtotal>0?profit/subtotal*100:0;
 return{goodsSale,goodsCost,installSale,installation,otherSell,servicesSale,preDiscount,discount:discountFinal,discountFinal,beforeDiscount,goodsFinal,servicesFinal,goodsVat,serviceVat,subtotal,vat,customerTotal,helperCost,servicesCost,costs,profit,margin,items};
}
function fillQuoteForm(){updateExchangeUI();const names=['clientName','clientPhone','clientAddress','issueDate','validDays','installMode','installDifficulty','installWifiRate','installAnalogRate','installIpRate','installRecorderRate','analogCamerasPerKit','installPercent','installFixed','helperQty','helperPayEach','helperSaleEach','transportCost','transportSell','perDiemCost','perDiemSell','otherCost','otherSell','warrantyReserve','overhead','discountType','discountValue','paymentTerms','leadTime','scopeIncluded','scopeExcluded','warrantyText','internalNotes'];for(const name of names){if($(name))$(name).value=['installWifiRate','installAnalogRate','installIpRate','installRecorderRate','installFixed','helperSaleEach','transportSell','perDiemSell','otherSell'].includes(name)?gross(quote[name]).toFixed(2):(name==='discountValue'&&quote.discountType==='amount'?gross(quote[name]).toFixed(2):(quote[name]??''))}$('quoteIdChip').textContent=quote.number;renderInstallTasks();document.querySelectorAll('.collapsible-panel').forEach(p=>{p.classList.remove('module-dirty');const label=p.querySelector('.module-apply-status');if(label)label.textContent='Los cambios se reflejan en el resumen en tiempo real.'});refreshAll();}
function renderPicker(){const filter=$('categoryFilter').value,term=$('productSearch').value.toLocaleLowerCase('es-UY').trim();let selected=state.catalog.filter(p=>(!filter||p.category===filter)&&(!term||[p.name,p.description,CATEGORY_LABELS[p.category]].join(' ').toLocaleLowerCase('es-UY').includes(term)));$('productPicker').innerHTML=selected.length?selected.map(p=>{const net=nativeNetUSD(p);const suggested=net===null?'Consultar dólar venta':money(gross(Number.isFinite(p.salePrice)?(p.currency==='UYU'?p.salePrice/num(quote.fxRate):p.salePrice):suggestSale(net)));return `<button class="product-card" data-add-product="${esc(p.id)}" title="${esc(p.description)}">${p.image?`<img class="picker-thumb" src="${esc(p.image)}" alt="">`:''}<div class="product-info"><div class="product-title">${esc(p.name)}</div><div class="product-sub">${esc(CATEGORY_LABELS[p.category])} · PRECIO DE VENTA</div><span class="product-price">${esc(suggested)}</span></div><span class="product-add">+</span></button>`}).join(''):'<div class="empty-state" style="grid-column:1/-1">No hay productos con ese filtro.</div>'}
function renderItems(){const items=quote.items||[];$('itemCount').textContent=items.length+' ítem'+(items.length===1?'':'s');$('itemsEmpty').style.display=items.length?'none':'block';$('quoteItems').innerHTML=items.map((x,index)=>`<tr data-index="${index}"><td><div class="item-name" title="${esc(x.description)}">${esc(x.name)}</div><div class="item-detail">${esc(x.description).slice(0,105)}${(x.description||'').length>105?'…':''}</div>${x.sourceCurrency==='UYU'?``:''}</td><td><input aria-label="Cantidad ${esc(x.name)}" data-line-field="quantity" data-idx="${index}" class="qty-field" type="number" min="0.01" step="0.01" value="${num(x.quantity)}"></td><td><input aria-label="Costo final en USD ${esc(x.name)}" data-line-field="cost" data-idx="${index}" type="number" min="0" step="0.01" ${x.sourceCurrency==='UYU'?'readonly title="Calculado desde UYU usando la cotización"':''} value="${purchaseGross(x.cost).toFixed(2)}"></td><td><input aria-label="Precio final ${esc(x.name)}" data-line-field="sale" data-idx="${index}" type="number" min="0" step="0.01" value="${gross(x.sale).toFixed(2)}"></td><td class="item-total" data-total-for="${index}">${moneyShort(gross(num(x.quantity)*num(x.sale)))}</td><td><button title="Eliminar ítem" aria-label="Eliminar ${esc(x.name)}" class="delete-row" data-delete-line="${index}">×</button></td></tr>`).join('');}
function addProduct(id){const product=state.catalog.find(p=>p.id===id);if(!product)return;const net=nativeNetUSD(product);if(net===null){toast('Para agregar un material cotizado en pesos, consultá primero el dólar venta o ingresá la cotización manual.',true);$('currencyBox').scrollIntoView({behavior:'smooth',block:'center'});return}let existing=quote.items.find(x=>x.productId===id&&num(x.sourceCost||x.cost)===num(product.cost));if(existing)existing.quantity=num(existing.quantity)+1;else quote.items.push({id:makeId(),productId:id,name:product.name,description:product.description,category:product.category,quantity:1,cost:net,sourceCost:product.cost,sourceCurrency:product.currency||'USD',sourceTaxIncluded:Boolean(product.taxIncluded),autoSale:true,sale:Number((Number.isFinite(product.salePrice)?(product.currency==='UYU'?product.salePrice/num(quote.fxRate):product.salePrice):suggestSale(net)).toFixed(5)),autoSale:!Number.isFinite(product.salePrice)});renderItems();refreshAll();queueDraft();toast('Se agregó: '+product.name)}
const INSTALL_TASK_PRESETS={canal:{name:'Canalización adicional',qty:10,price:2.5,cost:0,unit:'m'},cable:{name:'Tendido adicional de cable',qty:10,price:1.5,cost:0,unit:'m'},altura:{name:'Montaje en altura / acceso difícil',qty:1,price:35,cost:0,unit:'servicio'},red:{name:'Punto de red adicional',qty:1,price:25,cost:0,unit:'punto'}};
function appendInstallTask(preset=''){const t=INSTALL_TASK_PRESETS[preset]||{name:'Trabajo adicional',qty:1,price:15,cost:0,unit:'servicio'};quote.installTasks.push({id:makeId(),...t});renderInstallTasks();refreshAll();queueDraft();}
function renderInstallTasks(){const list=$('installTasksList');const tasks=quote.installTasks||[];list.innerHTML=tasks.length?tasks.map((task,i)=>`<div class="install-task-row"><label class="field"><span>Trabajo</span><input aria-label="Trabajo ${i+1}" data-install-field="name" data-install-index="${i}" value="${esc(task.name)}" maxlength="100"/></label><label class="field"><span>Unidad</span><input aria-label="Unidad ${i+1}" data-install-field="unit" data-install-index="${i}" value="${esc(task.unit||'servicio')}" maxlength="18"/></label><label class="field"><span>Cantidad</span><input aria-label="Cantidad trabajo ${i+1}" data-install-field="qty" data-install-index="${i}" type="number" min="0" step="0.5" value="${num(task.qty)}"/></label><label class="field"><span>Venta unit. USD</span><input aria-label="Venta trabajo ${i+1}" data-install-field="price" data-install-index="${i}" type="number" min="0" step="0.5" value="${gross(task.price).toFixed(2)}"/></label><label class="field"><span>Costo unit. USD</span><input aria-label="Costo trabajo ${i+1}" data-install-field="cost" data-install-index="${i}" type="number" min="0" step="0.5" value="${num(task.cost)}"/></label><button class="delete-row" type="button" title="Eliminar trabajo" data-remove-install="${i}">×</button></div>`).join(''):'<div class="install-tasks-empty">Sin tareas adicionales. Agregalas solo si esta instalación las necesita.</div>'}
function refreshInstallation(t){const d=t.installation;const counts=d.counts;
 $('installAutomaticOptions').hidden=quote.installMode!=='auto';$('installPercentageOptions').hidden=quote.installMode!=='percent';$('installFixedOptions').hidden=quote.installMode!=='fixed';
 $('installModeExplanation').textContent={auto:'El importe crece al agregar cámaras IP, analógicas o WiFi. Sumá canalización y tareas extra solo cuando correspondan.',percent:'La instalación se calcula como porcentaje de los kits y cámaras, no de memorias ni accesorios.',fixed:'Ingresá el valor base directamente. La dificultad, los adicionales y la movilidad siguen contando.'}[quote.installMode]||'';
 $('installCounts').textContent=[counts.wifi?counts.wifi+' WiFi':null,counts.analog?counts.analog+' analógicas':null,counts.ip?counts.ip+' IP':null,counts.recorders?counts.recorders+' DVR/NVR':null].filter(Boolean).join(' · ')||'Todavía no seleccionaste cámaras o kits.';
 const modeDesc=quote.installMode==='auto'?'Cámaras + grabadores':quote.installMode==='percent'?'Porcentaje de sistemas':'Base manual';
 $('installCalculationDetail').textContent=modeDesc+' '+moneyShort(gross(d.base))+' × dificultad '+d.factor.toLocaleString('es-UY',{maximumFractionDigits:2})+' + trabajos extra '+moneyShort(gross(d.extraSale))+' + movilidad '+moneyShort(gross(d.mobility))+' + ayudantes '+moneyShort(gross(d.helpersSale));
 $('installSalePreview').textContent=moneyShort(gross(d.sale));$('helperLegacyNote').hidden=quote.helperAutoSaleEnabled!==false;
}
function refreshAll(){const t=totals();const m=moneyShort,count=quote.items.reduce((a,x)=>a+num(x.quantity),0),serviceExempt=num(state.settings.serviceTaxRate)===0;
 $('metrics').innerHTML=[['◈','Costo de productos',m(purchaseGross(t.goodsCost)),'Compra final de equipos y materiales'],['▣','Venta de equipamiento',m(gross(t.goodsSale)),'Precio final de los equipos'],['◷','Instalación y servicios',m(gross(t.servicesSale)),serviceExempt?'Movilidad y adicionales · sin IVA':'Movilidad y adicionales · IVA configurado'],['↗','Remanente operativo',m(t.profit),percent(t.margin)+' del subtotal · sin tu tiempo']].map(([ico,label,value,desc])=>`<div class="metric"><div class="metric-label"><span class="symbol">${ico}</span>${label}</div><div class="metric-number">${value}</div><div class="metric-foot">${esc(desc)}</div></div>`).join('');
 $('summaryClient').textContent=quote.clientName||'Cliente sin asignar';
 $('summaryLines').innerHTML='<div class="summary-lines">'+[['Equipamiento ('+count+' unidades)',gross(t.goodsSale)],['Instalación técnica (incluye movilidad)',gross(t.installSale)],['Otros servicios',gross(t.otherSell)]].filter(([label,n])=>n!==0).map(([label,n])=>`<div class="summary-row"><span>${esc(label)}</span><strong>${m(n)}</strong></div>`).join('')+(t.discount?`<div class="summary-row discount"><span>Descuento</span><strong>− ${m(t.discount)}</strong></div>`:'')+`<div class="summary-row subtotal"><span>Subtotal sin IVA</span><strong>${m(t.subtotal)}</strong></div>`+`<div class="summary-row"><span>IVA de equipos (${percent(state.settings.saleTaxRate)})</span><strong>${m(t.goodsVat)}</strong></div>`+(t.serviceVat>0.001?`<div class="summary-row"><span>IVA servicios (${percent(state.settings.serviceTaxRate)})</span><strong>${m(t.serviceVat)}</strong></div>`:'')+'</div>';
 $('grandTotal').textContent=m(t.customerTotal);$('taxModeCaption').textContent=serviceExempt?'IVA de equipos desglosado · Instalación sin IVA':'IVA de equipos y servicios desglosado';
 $('profitValue').textContent=m(t.profit);$('profitValue').classList.toggle('negative',t.profit<0);
 $('profitExplanation').textContent='Remanente antes de remunerar tu propio tiempo, impuestos y costos no cargados';
 $('profitBar').style.width=Math.min(100,Math.max(0,t.margin))+'%';$('profitBar').style.background=t.profit>=0?'var(--green)':'var(--red)';$('profitPercent').textContent=percent(t.margin);
 $('profitCosts').innerHTML=[['Equipos y materiales',purchaseGross(t.goodsCost)],['Pago a ayudantes',t.helperCost],['Transporte y viáticos',num(quote.transportCost)+num(quote.perDiemCost)],['Costos de trabajos extra',t.installation.extraCost],['Otros costos + previsiones',num(quote.otherCost)+num(quote.warrantyReserve)+num(quote.overhead)],['Total de costos conocidos',t.costs]].map(([label,value])=>`<div class="summary-row"><span>${esc(label)}</span><strong>${m(value)}</strong></div>`).join('');
 refreshInstallation(t);document.querySelectorAll('[data-total-for]').forEach(e=>{const x=quote.items[Number(e.dataset.totalFor)];if(x)e.textContent=m(gross(num(x.quantity)*num(x.sale)))});$('savedCounter').textContent=state.saved.length;
}
function saveQuote(){if(window.SafeAccess&&!SafeAccess.can('presupuestos')){toast('Se requiere permiso de presupuestos para archivar.',true);return false;}if(!quote.clientName.trim()){toast('Ingresá el nombre del cliente antes de guardar.',true);$('clientName').focus();return false}quote.updatedAt=new Date().toISOString();const index=state.saved.findIndex(q=>q.id===quote.id);if(index>=0)state.saved[index]=deep(quote);else state.saved.unshift(deep(quote));if(persist()){draftSave();refreshAll();void saveArchive(quote);toast('Presupuesto '+quote.number+' guardado.');return true}return false;}
async function newQuote(ask=true){if(ask&&(quote.items.length||quote.clientName||quote.cctvPlan)&&!await safeConfirm('¿Crear un nuevo presupuesto? El borrador actual queda en el historial solo si ya lo guardaste.'))return;const lastFx={fxRate:quote.fxRate,fxUpdatedAt:quote.fxUpdatedAt,fxSource:quote.fxSource,fxManual:quote.fxManual};quote={...createQuote(seqNum()),...lastFx};fillQuoteForm();draftSave();showView('cotizador');toast('Nuevo presupuesto listo.');}
function openQuote(id){const source=state.saved.find(q=>q.id===id);if(!source)return;quote=migrateQuote(deep(source));fillQuoteForm();draftSave();showView('cotizador')}
function duplicateQuote(id){const source=state.saved.find(q=>q.id===id);if(!source)return;quote={...migrateQuote(deep(source)),id:makeId(),number:'SAFE-'+String(seqNum()).padStart(4,'0'),issueDate:dateLocal(),updatedAt:new Date().toISOString()};fillQuoteForm();draftSave();showView('cotizador');toast('Copia creada; todavía no se guardó.');}
async function deleteQuote(id){const source=state.saved.find(q=>q.id===id);if(!source)return;if(!await safeConfirm('¿Eliminar definitivamente el presupuesto '+source.number+'? Si estás usando la carpeta local también se eliminarán su JSON y sus PDF.'))return;state.saved=state.saved.filter(q=>q.id!==id);persist();renderSaved();refreshAll();if(archiveMode==='server'&&!window.SafeServer){fetch('/api/eliminar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:source.number})}).then(r=>{if(!r.ok)throw Error('No se pudo borrar el archivo')}).catch(e=>toast('Borrado del historial, pero no de la carpeta: '+e.message,true))}toast('Presupuesto eliminado.');}
function formatDate(iso){if(!iso)return'—';const [y,m,d]=iso.split('-');return`${d||'??'}/${m||'??'}/${y||'????'}`}
function renderSaved(){const term=$('quoteSearch').value.toLowerCase();const arr=state.saved.filter(q=>[q.number,q.clientName,q.clientAddress].join(' ').toLowerCase().includes(term));$('savedQuotesList').innerHTML=arr.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Total actual*</th><th>Acciones</th></tr></thead><tbody>${arr.map(q=>`<tr><td><strong>${esc(q.number)}</strong><br><span class="quote-status">Guardado</span></td><td><b>${esc(q.clientName||'Sin cliente')}</b><small>${esc(q.clientAddress||'Sin dirección')}</small></td><td>${esc(formatDate(q.issueDate))}</td><td><b>${moneyShort(totals(q).customerTotal)}</b></td><td><div class="table-actions"><button class="action-mini" data-saved-action="open" data-id="${esc(q.id)}">Editar</button><button class="action-mini" data-saved-action="pdf" data-id="${esc(q.id)}">PDF</button><button class="action-mini" data-saved-action="duplicate" data-id="${esc(q.id)}">Duplicar</button><button class="action-mini danger" data-saved-action="delete" data-id="${esc(q.id)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div><p class="tiny-muted">* Se recalcula con la configuración fiscal actual. Los importes por producto incluidos en cada presupuesto se conservan.</p>`:'<div class="empty-state">Todavía no hay presupuestos que coincidan con tu búsqueda.</div>';}
function renderCatalog(){$('catalogTable').innerHTML=state.catalog.map(p=>`<tr><td><div class="catalog-product">${p.image?`<img class="catalog-thumb" data-view-image="${esc(p.image)}" src="${esc(p.image)}" alt="">`:''}<div><b>${esc(p.name)}</b><small>${p.supplierId&&supplierById(p.supplierId)?'Proveedor: '+esc(supplierById(p.supplierId).name)+' · ':''}ID: ${esc(p.id)}</small></div></div></td><td>${esc(CATEGORY_LABELS[p.category])}</td><td><strong>${formatNative(p)}</strong></td><td style="max-width:380px;color:var(--muted)">${esc(p.description)}</td><td><div class="table-actions"><button class="action-mini" data-catalog-action="edit" data-id="${esc(p.id)}">Editar</button><button class="action-mini danger" data-catalog-action="delete" data-id="${esc(p.id)}">×</button></div></td></tr>`).join('');}
function viewProductImage(src){modal('Imagen del producto',`<div class="product-image-view"><img src="${esc(src)}" alt=""></div>`,()=>closeModal(),'Cerrar')}

function supplierById(id){return (state.suppliers||[]).find(s=>s.id===id)}
function supplierSiteLabel(site){try{return new URL(site).hostname.replace(/^www\./,'')}catch{return ''}}
function supplierContact(label,value){return value?`<div class="supplier-contact-item"><b>${esc(label)}</b><span>${esc(value)}</span></div>`:''}
function renderSuppliers(){
 const term=($('supplierSearch')?.value||'').trim().toLocaleLowerCase('es-UY');let found=[...(state.suppliers||[])].filter(x=>[x.name,x.brands,x.contact,x.address,x.email,x.notes].join(' ').toLocaleLowerCase('es-UY').includes(term));
 if($('supplierSort')?.value==='recent')found.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 else found.sort((a,b)=>a.name.localeCompare(b.name,'es-UY'));
 $('supplierCount').textContent=`${found.length} proveedor${found.length===1?'':'es'}${term?' encontrados':''} · ${state.suppliers.length} registrados`;
 $('supplierList').innerHTML=found.map(s=>{const link=safeSupplierUrl(s.website),initial=s.name.trim().slice(0,2).toLocaleUpperCase('es-UY');return `<article class="supplier-card" data-supplier-id="${esc(s.id)}">
  <div class="supplier-card-header"><div class="supplier-avatar">${esc(initial)}</div><div><h3>${esc(s.name)}</h3><span class="supplier-meta">${link?esc(supplierSiteLabel(link)):'Sin sitio web registrado'}</span></div></div>
  ${s.brands?`<div class="supplier-tags">${s.brands.split(',').map(x=>x.trim()).filter(Boolean).slice(0,10).map(x=>`<span class="supplier-tag">${esc(x)}</span>`).join('')}</div>`:''}
  <div class="supplier-contact">${supplierContact('Contacto',s.contact)}${supplierContact('Teléfono',s.phone)}${supplierContact('Correo',s.email)}${supplierContact('Dirección',s.address)}</div>
  ${s.notes?`<div class="supplier-notes">${esc(s.notes)}</div>`:''}
  <div class="supplier-actions">${link?`<a class="btn btn-primary btn-sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir página de ${esc(s.name)}">↗ Ir al proveedor</a>`:'<span class="supplier-website-disabled">Agregá una página para abrirla</span>'}<button class="action-mini" type="button" data-supplier-action="edit" data-id="${esc(s.id)}">Editar</button><button class="action-mini danger" type="button" data-supplier-action="delete" data-id="${esc(s.id)}">Eliminar</button></div>
 </article>`}).join('');$('supplierEmpty').hidden=found.length>0;
}
function supplierModal(id=null){
 const s=id?supplierById(id):null;
 modal(s?'Editar proveedor':'Nuevo proveedor',`<p class="modal-description">Guardá datos básicos y el enlace al sitio web del distribuidor. La información es privada y no se imprime en presupuestos.</p><div class="field-grid">
 <label class="field field-wide"><span>Nombre comercial *</span><input id="supplierName" maxlength="120" required placeholder="Ej.: Distribuidor de seguridad" value="${esc(s?.name||'')}"></label>
 <label class="field field-wide"><span>Enlace a su página web</span><input id="supplierWeb" inputmode="url" maxlength="350" placeholder="https://ejemplo.com.uy/" value="${esc(s?.website||'')}"></label>
 <label class="field"><span>Contacto / vendedor</span><input id="supplierContact" maxlength="120" placeholder="Nombre de contacto" value="${esc(s?.contact||'')}"></label>
 <label class="field"><span>Teléfono / WhatsApp</span><input id="supplierPhone" maxlength="75" placeholder="+598 99 000 000" value="${esc(s?.phone||'')}"></label>
 <label class="field"><span>Correo electrónico</span><input id="supplierEmail" type="email" maxlength="120" value="${esc(s?.email||'')}"></label>
 <label class="field"><span>Marcas que distribuye</span><input id="supplierBrands" maxlength="200" placeholder="Tiandy, EZVIZ, HiLook" value="${esc(s?.brands||'')}"></label>
 <label class="field field-wide"><span>Dirección / ciudad</span><input id="supplierAddress" maxlength="200" value="${esc(s?.address||'')}"></label>
 <label class="field field-wide"><span>Notas internas</span><textarea id="supplierNotes" maxlength="1200" rows="3" placeholder="Horarios, condiciones comerciales, información útil...">${esc(s?.notes||'')}</textarea></label>
 </div>`,()=>{
 const name=$('supplierName').value.trim(), rawSite=$('supplierWeb').value.trim();if(!name){toast('El nombre del proveedor es obligatorio.',true);$('supplierName').focus();return}
 const site=safeSupplierUrl(rawSite);if(rawSite&&!site){toast('Ingresá una URL válida que comience con http:// o https:// (ej.: proveedor.com.uy).',true);$('supplierWeb').focus();return}
 const email=$('supplierEmail').value.trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Revisá el correo electrónico.',true);return}
 const info=cleanSupplier({id:id||makeId(),name,website:site,contact:$('supplierContact').value,phone:$('supplierPhone').value,email,address:$('supplierAddress').value,brands:$('supplierBrands').value,notes:$('supplierNotes').value,updatedAt:new Date().toISOString()});
 if(id){const idx=state.suppliers.findIndex(x=>x.id===id);if(idx<0)return;state.suppliers[idx]=info}else state.suppliers.push(info);
 persist();archiveSuppliers();renderSuppliers();closeModal();toast(id?'Proveedor actualizado.':'Proveedor agregado.');
 },s?'Guardar cambios':'Crear proveedor');
}
async function deleteSupplier(id){const s=supplierById(id);if(!s)return;const linked=state.catalog.filter(p=>p.supplierId===id).length;
 if(!await safeConfirm(`¿Eliminar al proveedor «${s.name}»?${linked?' Se desvinculará de '+linked+' producto(s) del catálogo.':''} No se modificarán los presupuestos guardados.`))return;
 state.suppliers=state.suppliers.filter(x=>x.id!==id);state.catalog.forEach(p=>{if(p.supplierId===id)p.supplierId=''});persist();archiveSuppliers();renderSuppliers();renderCatalog();toast('Proveedor eliminado.');
}
let supplierWriteQueue=Promise.resolve();
function archiveSuppliers(){
 if(window.SafeServer)return Promise.resolve(true);
 // Serializar escrituras para que una edición rápida no restaure una versión anterior.
 const snapshot=deep(state.suppliers||[]),mode=archiveMode,handle=archiveHandle;
 supplierWriteQueue=supplierWriteQueue.catch(()=>{}).then(async()=>{
  try{
   if(mode==='server'){
    const r=await fetch('/api/proveedores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({suppliers:snapshot})});if(!r.ok)throw Error('HTTP '+r.status);
   }else if(handle){
    if((await handle.queryPermission({mode:'readwrite'}))!=='granted')return;
    const target=await handle.getFileHandle('proveedores.json',{create:true});const writer=await target.createWritable();await writer.write(JSON.stringify({format:'safe-security-suppliers-v1',suppliers:snapshot},null,2));await writer.close();
   }
  }catch(e){console.warn('Archivo de proveedores:',e);toast('Los proveedores se guardaron en el navegador, pero no en la carpeta. Exportá un respaldo JSON.',true)}
 });return supplierWriteQueue;
}
async function restoreSuppliersFromFolder(){
 if(!archiveHandle)return;
 try{
  if((await archiveHandle.queryPermission({mode:'readwrite'}))!=='granted')return;
  const file=await archiveHandle.getFileHandle('proveedores.json',{create:false});const data=JSON.parse(await (await file.getFile()).text());
  if(!Array.isArray(data.suppliers))return;
  state.suppliers=data.suppliers.map(cleanSupplier).filter(x=>x.name);persist();renderSuppliers();
 }catch(e){if(e.name==='NotFoundError'&&state.suppliers.length)await archiveSuppliers();else if(e.name!=='NotFoundError')console.warn('No se pudo leer el directorio de proveedores:',e)}
}
async function restoreSuppliersFromServer(){
 try{const r=await fetch('/api/proveedores',{cache:'no-store'});if(!r.ok)return;const json=await r.json();if(!Array.isArray(json.suppliers))return;
 const serverSuppliers=json.suppliers.map(cleanSupplier).filter(s=>s.name);if(serverSuppliers.length){
  // El servidor local es la fuente de verdad si contiene registros.
  state.suppliers=serverSuppliers;persist();renderSuppliers();
 }else if(state.suppliers.length){await archiveSuppliers()}
 }catch(e){console.warn('Proveedores locales no recuperados:',e)}
}
async function restoreCatalogFromServer(){
 try{const r=await fetch('/api/catalogo',{cache:'no-store'});if(!r.ok)return;const json=await r.json();if(!Array.isArray(json.products))return;
 const serverProducts=json.products.map(cleanProduct).filter(p=>p.name);if(serverProducts.length){
  // El servidor local es la fuente de verdad si contiene productos.
  state.catalog=serverProducts;persist();renderCatalog();renderPicker();
 }else if(state.catalog.length){await archiveCatalog()}
 }catch(e){console.warn('Catálogo local no recuperado:',e)}
}
let catalogWriteQueue=Promise.resolve();
function archiveCatalog(){
 if(window.SafeServer)return Promise.resolve(true);
 // Serializar escrituras para que una edición rápida no restaure una versión anterior.
 const snapshot=deep(state.catalog||[]),mode=archiveMode;
 catalogWriteQueue=catalogWriteQueue.catch(()=>{}).then(async()=>{
  try{
   if(mode==='server'){
    const r=await fetch('/api/catalogo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({products:snapshot})});if(!r.ok)throw Error('HTTP '+r.status);
   }
  }catch(e){console.warn('Catálogo no sincronizado con la carpeta:',e)}
 });
 return catalogWriteQueue;
}
function modal(title,content,handler,label='Guardar'){modalHandler=handler;$('modalTitle').textContent=title;$('modalContent').innerHTML=content;$('modalConfirm').textContent=label;$('modalBackdrop').hidden=false;modalOpen=true;const first=$('modalContent').querySelector('input,select,textarea');if(first)setTimeout(()=>first.focus(),20)}
function closeModal(){$('modalBackdrop').hidden=true;modalOpen=false;modalHandler=()=>{}}
function productModal(id=null){const old=id?state.catalog.find(p=>p.id===id):null;modal(old?'Editar producto':'Nuevo producto',`<div class="field-grid"><label class="field field-wide"><span>Nombre del producto *</span><input id="modalProductName" maxlength="160" value="${esc(old?.name||'')}"></label><label class="field"><span>Categoría</span><select id="modalCategory">${Object.entries(CATEGORY_LABELS).map(([k,label])=>`<option value="${k}" ${old?.category===k?'selected':''}>${esc(label)}</option>`).join('')}</select></label><label class="field"><span>Moneda de compra</span><select id="modalCurrency"><option value="USD" ${old?.currency!=='UYU'?'selected':''}>USD</option><option value="UYU" ${old?.currency==='UYU'?'selected':''}>UYU</option></select></label><label class="field"><span>Costo unitario del proveedor</span><input id="modalCost" type="number" min="0" step="0.01" value="${old?.cost??0}"></label><label class="field"><span>IVA en ese costo</span><select id="modalTaxIncluded"><option value="false" ${!old?.taxIncluded?'selected':''}>Precio + IVA</option><option value="true" ${old?.taxIncluded?'selected':''}>IVA incluido</option></select></label><label class="field field-wide"><span>Proveedor (opcional, solo uso interno)</span><select id="modalSupplier"><option value="">Sin proveedor asignado</option>${state.suppliers.map(s=>`<option value="${esc(s.id)}" ${old?.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label class="field field-wide"><span>Incluye / faltantes / observaciones</span><textarea id="modalDescription" rows="4">${esc(old?.description||'')}</textarea></label><label class="field field-wide"><span>Imagen del producto (opcional)</span><div class="product-image-row"><img id="modalImagePreview" class="modal-image-preview" alt="" ${old?.image?`src="${esc(old.image)}"`:'hidden'}><div class="product-image-actions"><input type="file" id="modalProductImage" accept="image/*"><button type="button" class="btn btn-outline btn-sm" id="modalImageClear" ${old?.image?'':'hidden'}>Quitar imagen</button></div></div><input type="hidden" id="modalImageData" value="${esc(old?.image||'')}"></label></div>`,()=>{const name=$('modalProductName').value.trim();if(!name){toast('Ingresá un nombre de producto.',true);return}const p=cleanProduct({id:id||makeId(),name,category:$('modalCategory').value,cost:$('modalCost').value,currency:$('modalCurrency').value,taxIncluded:$('modalTaxIncluded').value==='true',supplierId:$('modalSupplier').value,description:$('modalDescription').value,image:$('modalImageData').value});if(id)state.catalog[state.catalog.findIndex(x=>x.id===id)]=p;else state.catalog.push(p);persist();archiveCatalog();renderCatalog();renderPicker();closeModal();toast('Catálogo actualizado.')});
$('modalProductImage').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>8*1024*1024){toast('La imagen debe pesar menos de 8 MB.',true);e.target.value='';return}try{const img=await normalizeProductImage(await fileToDataURL(file));$('modalImageData').value=img;$('modalImagePreview').src=img;$('modalImagePreview').hidden=false;$('modalImageClear').hidden=false}catch{toast('No se pudo leer la imagen.',true)}e.target.value=''});$('modalImageClear').onclick=()=>{$('modalImageData').value='';$('modalImagePreview').removeAttribute('src');$('modalImagePreview').hidden=true;$('modalImageClear').hidden=true};}
function customItemModal(){modal('Agregar material o servicio',`<p class="modal-description">Sumá cualquier material no incluido en la lista: canaletas, caños, accesorios, ficha individual, etc. Ingresá costos y precios finales; el sistema calcula el IVA de los equipos para el PDF.</p><div class="field-grid"><label class="field field-wide"><span>Descripción *</span><input id="customName" placeholder="Ej.: Caja estanca adicional"></label><label class="field"><span>Cantidad</span><input id="customQty" type="number" value="1" min="0.01" step="0.01"></label><label class="field"><span>Costo unitario USD</span><input id="customCost" type="number" value="0" min="0" step="0.01"></label><label class="field"><span>Venta unitaria USD</span><input id="customSale" type="number" value="0" min="0" step="0.01"></label><label class="field field-wide"><span>Notas / detalle</span><input id="customDetails" placeholder="Ej.: Canaleta exterior y accesorios"></label></div>`,()=>{const name=$('customName').value.trim(),quantity=num($('customQty').value);if(!name||quantity<=0){toast('Ingresá descripción y cantidad válida.',true);return}quote.items.push({id:makeId(),productId:'',name,description:$('customDetails').value,category:'other',quantity,cost:Math.max(0,num($('customCost').value))/(1+Math.max(0,num(state.settings.purchaseTaxRate))/100),sale:Math.max(0,netFromGross($('customSale').value))});renderItems();refreshAll();queueDraft();closeModal();toast('Ítem personalizado agregado.')});}
function fillSettings(){for(const name of ['companyName','companyPhone','companyEmail','companyWeb','companyAddress','defaultMargin','saleTaxRate','serviceTaxRate','purchaseTaxRate','taxMode','currencyDecimals'])if($(name))$(name).value=state.settings[name]??'';$('settingLogoPreview').src=state.settings.logoData||'assets/logo-safe-security.png'}
function saveSettings(){const keys=['companyName','companyPhone','companyEmail','companyWeb','companyAddress','defaultMargin','saleTaxRate','serviceTaxRate','purchaseTaxRate','taxMode','currencyDecimals'];for(const k of keys){let v=$(k).value;state.settings[k]=['defaultMargin','saleTaxRate','serviceTaxRate','purchaseTaxRate','currencyDecimals'].includes(k)?num(v):v;}state.settings.defaultMargin=Math.max(0,Math.min(95,state.settings.defaultMargin));state.settings.taxMode='iva';persist();refreshAll();renderPicker();toast('Configuración guardada.');}
function generateBackup(){if(window.SafeServer){window.SafeServer.backup().catch(e=>toast(e.message,true));return}const blob=new Blob([JSON.stringify({format:'safe-security-cotizador-v1',exportedAt:new Date().toISOString(),settings:state.settings,catalog:state.catalog,saved:state.saved,packages:state.packages||[],suppliers:state.suppliers||[],draft:quote},null,2)],{type:'application/json'});download(blob,'SAFE-Security-respaldo-'+dateLocal()+'.json');toast('Respaldo descargado.')}
function download(blob,name){const a=document.createElement('a'),href=URL.createObjectURL(blob);a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000)}

// Almacenamiento persistente en carpeta local: servidor Python opcional o permiso del usuario.
let archiveMode='downloads',archiveHandle=null;
function archiveStatus(message){
 if(window.SafeServer){message='Datos e imágenes guardados en servidor. Respaldo comercial JSON desde la interfaz; ZIP completo desde el servidor.'}
 const value=message||(archiveMode==='server'?'Carpeta cotizaciones/ activa: JSON y PDF se guardan automáticamente.':archiveHandle?'Carpeta seleccionada: se guardan JSON y PDF además de descargarlos.':'Modo navegador: se guarda el historial local y los PDF se descargan. Seleccioná carpeta para conservarlos juntos.');
 if($('storageStatus'))$('storageStatus').textContent=value;
 if($('storageSettingsStatus'))$('storageSettingsStatus').textContent=value;
 const sidebar=document.querySelector('.side-bottom');if(sidebar){const status=sidebar.querySelector('.storage-hint');if(status)status.textContent=window.SafeServer?'Datos e imágenes en servidor':archiveMode==='server'?'Guardado en carpeta cotizaciones/ y navegador':archiveHandle?'Guardado en carpeta elegida y navegador':'Historial en navegador · PDF descargable';}
}
function archiveFileStem(q){return String(q.number||'SAFE-0001')+'-'+String(q.clientName||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,42)}
async function archiveInit(){
 if(window.SafeServer){archiveMode='server';archiveStatus('Datos e imágenes guardados en el servidor.');return}
 archiveStatus();
 const local=(location.hostname==='127.0.0.1'||location.hostname==='localhost')&&location.port==='8787';
 if(local){try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);
  let result;try{result=await fetch('/api/status',{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
  const data=await result.json();if(result.ok&&data.safeCotizador===true){archiveMode='server';archiveStatus();await restoreSuppliersFromServer();await restoreCatalogFromServer();
   const response=await fetch('/api/presupuestos',{cache:'no-store'});
   if(response.ok){const {quotes=[]}=await response.json();let added=0;for(const q of quotes){if(!q?.id||!Array.isArray(q.items))continue;const old=state.saved.find(x=>x.id===q.id||x.number===q.number);if(!old){state.saved.push(migrateQuote(q));added++;}else if(String(q.updatedAt||'')>String(old.updatedAt||'')){Object.assign(old,migrateQuote(q));}}if(added){state.saved.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));}persist();refreshAll();if(view==='presupuestos')renderSaved();}
   return;
  }
 }catch(e){console.warn('Guardado automático no disponible:',e.message)}}
 try{if('indexedDB'in window){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('safe-security-archive-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const saved=await new Promise((resolve,reject)=>{const t=db.transaction('settings');const r=t.objectStore('settings').get('folder');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();if(saved){archiveHandle=saved;archiveMode='folder';}} }catch(e){console.warn('No se pudo recordar carpeta:',e.message)}
 archiveStatus();if(archiveMode==='folder')await restoreSuppliersFromFolder();
}
async function chooseArchiveFolder(){
 if(window.SafeServer){toast('El almacenamiento del servidor está activo. No se necesita carpeta local.');return}
 if(!window.showDirectoryPicker){toast('Este navegador no permite elegir una carpeta. Usá Chrome/Edge o iniciá el servidor local con Python 3.',true);return}
 try{const base=await window.showDirectoryPicker({mode:'readwrite'});archiveHandle=await base.getDirectoryHandle('cotizaciones',{create:true});archiveMode='folder';archiveStatus();
  try{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('safe-security-archive-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const t=db.transaction('settings','readwrite');t.objectStore('settings').put(archiveHandle,'folder');t.oncomplete=resolve;t.onerror=()=>reject(t.error)});db.close()}catch(e){console.warn('No se pudo guardar selección:',e.message)}
  await restoreSuppliersFromFolder();
  const found=[];for await(const [filename,handle] of archiveHandle.entries()){
   if(handle.kind!=='file'||!/^SAFE-[0-9]+-.*\.json$/.test(filename))continue;
   try{const record=JSON.parse(await (await handle.getFile()).text());if(record?.quote?.id&&Array.isArray(record.quote.items))found.push(record.quote);}catch(e){console.warn('Archivo inválido:',filename)}
  }
  let loaded=0;for(const old of found){if(!state.saved.some(x=>x.id===old.id||x.number===old.number)){state.saved.push(migrateQuote(old));loaded++;}}
  if(loaded){persist();refreshAll();if(view==='presupuestos')renderSaved();}
  toast('Carpeta cotizaciones seleccionada.'+(loaded?' Recuperados '+loaded+' presupuestos.':' Los siguientes presupuestos se guardarán allí.'));
 }catch(e){if(e.name!=='AbortError')toast('No se pudo seleccionar la carpeta: '+e.message,true)}
}
async function saveArchive(q,pdfBlob=null,currency='USD'){
 if(!String(q.clientName||'').trim())return false;
 try{
  if(window.SafeServer){
   window.SafeServer.schedule(serverSnapshot());await window.SafeServer.flush();
   if(pdfBlob&&(!window.SafeAccess||SafeAccess.can('presupuestos'))){const pdfBase64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(pdfBlob)});await window.SafeServer.api('/api/pdf',{method:'POST',body:JSON.stringify({id:q.id,currency,pdfBase64})})}return true;
  }
  if(archiveMode==='server'){
   const data={quote:deep(q)};
   if(pdfBlob){const buffer=new Uint8Array(await pdfBlob.arrayBuffer());let text='';const part=16384;for(let i=0;i<buffer.length;i+=part)text+=String.fromCharCode(...buffer.subarray(i,i+part));data.pdfBase64=btoa(text);data.currency=currency;}
   const r=await fetch('/api/guardar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const res=await r.json();if(!r.ok||!res.ok)throw Error(res.error||'No se pudo guardar archivo');return true;
  }
  if(archiveHandle){
   const permission=await archiveHandle.requestPermission({mode:'readwrite'});
   if(permission!=='granted')throw Error('No se autorizó escribir en la carpeta');
   const filename=archiveFileStem(q);
   const jf=await archiveHandle.getFileHandle(filename+'.json',{create:true});const jw=await jf.createWritable();await jw.write(JSON.stringify({format:'safe-security-quote-v1',savedAt:new Date().toISOString(),quote:deep(q)},null,2));await jw.close();
   if(pdfBlob){const pf=await archiveHandle.getFileHandle(filename+'-'+currency+'.pdf',{create:true});const pw=await pf.createWritable();await pw.write(pdfBlob);await pw.close();}return true;
  }
 }catch(e){console.warn('Error guardando cotización:',e);archiveStatus('No se pudo escribir en carpeta: '+e.message+' · Los PDF pueden descargarse normalmente.');toast('No se pudo guardar en carpeta: '+e.message,true)}
 return false;
}

function belowCostItems(q){return(q.items||[]).filter(x=>num(x.quantity)>0&&num(x.cost)>0&&num(x.sale)<=purchaseCost(x.cost)+.009)}
async function repriceItems(){if(!quote.items.length){toast('Primero agregá algún producto al presupuesto.',true);return}if(!await safeConfirm('¿Recalcular el precio de venta de TODOS los materiales seleccionados con el margen del '+state.settings.defaultMargin+'%? Se reemplazarán los precios de venta modificados manualmente, pero se conservarán los costos del proveedor.'))return;quote.items.forEach(x=>{if(num(x.cost)>0){x.sale=Number(suggestSale(x.cost).toFixed(5));x.autoSale=true}});renderItems();refreshAll();queueDraft();toast('Precios de venta actualizados. Los costos internos no aparecen en el PDF.')}
function validatePdf(q){if(!String(q.clientName||'').trim()){toast('Ingresá el nombre del cliente antes de exportar PDF.',true);if(view==='cotizador')$('clientName').focus();return false}const t=totals(q);const tooLow=belowCostItems(q);if(tooLow.length){toast('No se puede exportar: '+tooLow.length+' producto(s) tiene(n) precio de venta igual o inferior al costo del proveedor. Usá Recalcular precios de venta.',true);return false}if(!q.items.length&&!(q.installTasks||[]).length&&t.otherSell===0){toast('Agregá algún producto o trabajo para cotizar.',true);return false}return true;}
async function exportPdf(q=quote,preview=false){if(!validatePdf(q))return;const currency=q.pdfCurrency||'USD';const requiresFX=currency==='UYU'||(q.items||[]).some(x=>x.sourceCurrency==='UYU');if(requiresFX){const got=await fetchRate(q,{quiet:true});if(!got){if(!q.fxManual||fxLocalDay(q.fxUpdatedAt)!==todayUYU()){toast('No hay cotización vigente: consultá dólar venta o confirmá una cotización manual DE HOY. No se permite reutilizar una tasa anterior.',true);return}if(!await safeConfirm('No se pudo consultar el dólar venta BROU. ¿Continuar usando la cotización MANUAL '+uyumoney(q.fxRate)+'? El PDF lo indicará expresamente.'))return;}}if(!validatePdf(q))return;try{let planJpeg='';if(q.attachPlanSchematic){planJpeg=await window.SafePlanner?.schematicJpeg?.(q.id)||'';if(!planJpeg)toast('No se pudo adjuntar el esquema: abrí el plano de esta cotización en Plano CCTV e intentá de nuevo.',true)}const b=await window.SafePDF.makePdf({quote:deep(q),settings:deep(state.settings),totals:totals(q),currency,rate:num(q.fxRate),fxDate:q.fxUpdatedAt,fxSource:q.fxSource,fxManual:!!q.fxManual,planJpeg});if(!preview&&(!window.SafeAccess||SafeAccess.can('presupuestos'))){const current=deep(q);current.updatedAt=new Date().toISOString();const at=state.saved.findIndex(x=>x.id===current.id);if(at>=0)state.saved[at]=current;else state.saved.unshift(current);persist();refreshAll();if(view==='presupuestos')renderSaved();const archived=await saveArchive(current,b,currency);if(archived)toast('Copia PDF y JSON archivada en cotizaciones/.')}if(preview){const url=URL.createObjectURL(b),win=window.open(url,'_blank');if(!win){download(b,'SAFE-'+q.number+'-'+currency+'.pdf');toast('Bloqueo de ventanas: se descargó el PDF en su lugar.')}else{toast('Vista previa del PDF abierta en otra pestaña.');setTimeout(()=>URL.revokeObjectURL(url),120000)}}else{const safeName=(q.clientName||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-').replace(/-+/g,'-').slice(0,35);download(b,`${q.number}-${safeName}-${currency}.pdf`);toast('PDF '+currency+' de '+q.number+' descargado correctamente.');}}catch(e){console.error(e);toast('No se pudo generar el PDF: '+e.message,true)}}
async function restoreCatalog(){if(!await safeConfirm('¿Restaurar los 18 productos y precios originales? Se perderán los cambios hechos al catálogo. Los presupuestos guardados no cambian.'))return;state.catalog=deep(initialCatalog);persist();archiveCatalog();renderCatalog();renderPicker();toast('Catálogo restaurado.')}
function bind(){$('pdfCurrency').addEventListener('change',e=>{quote.pdfCurrency=e.target.value;queueDraft();refreshAll()});$('attachPlanSchematic').addEventListener('change',e=>{quote.attachPlanSchematic=e.target.checked;queueDraft()});$('refreshFX').addEventListener('click',()=>fetchRate());$('confirmManualFX').addEventListener('click',setManualFX);document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.view)));document.querySelectorAll('[data-action="new-quote"]').forEach(el=>el.addEventListener('click',()=>newQuote()));$('menuToggle').onclick=()=>$('sidebar').classList.toggle('menu-open');$('newQuoteTop').onclick=()=>newQuote();$('resetQuote').onclick=()=>newQuote();$('saveQuote').onclick=saveQuote;$('saveQuoteTop').onclick=saveQuote;$('generatePdf').onclick=()=>exportPdf();$('printQuote').onclick=()=>exportPdf(quote,true);$('productSearch').addEventListener('input',renderPicker);$('categoryFilter').addEventListener('change',renderPicker);$('productPicker').addEventListener('click',e=>{const btn=e.target.closest('[data-add-product]');if(btn)addProduct(btn.dataset.addProduct)});$('quoteItems').addEventListener('input',e=>{const el=e.target.closest('[data-line-field]');if(!el)return;const x=quote.items[Number(el.dataset.idx)];if(!x)return;x[el.dataset.lineField]=Math.max(0,el.dataset.lineField==='sale'?netFromGross(el.value):el.dataset.lineField==='cost'?num(el.value)/(1+Math.max(0,num(state.settings.purchaseTaxRate))/100):num(el.value));if(el.dataset.lineField==='sale')x.autoSale=false;refreshAll();queueDraft();});$('quoteItems').addEventListener('click',e=>{const b=e.target.closest('[data-delete-line]');if(!b)return;quote.items.splice(Number(b.dataset.deleteLine),1);renderItems();refreshAll();queueDraft()});$('addCustomProduct').onclick=customItemModal;$('repriceItems').onclick=repriceItems;$('addInstallTask').onclick=()=>appendInstallTask();document.querySelectorAll('[data-task-preset]').forEach(el=>el.addEventListener('click',()=>appendInstallTask(el.dataset.taskPreset)));$('installTasksList').addEventListener('input',e=>{const field=e.target.dataset.installField,idx=Number(e.target.dataset.installIndex);if(!field||!quote.installTasks[idx])return;quote.installTasks[idx][field]=['qty','price','cost'].includes(field)?Math.max(0,field==='price'?netFromGross(e.target.value):num(e.target.value)):e.target.value;refreshAll();queueDraft()});$('installTasksList').addEventListener('click',e=>{const b=e.target.closest('[data-remove-install]');if(!b)return;quote.installTasks.splice(Number(b.dataset.removeInstall),1);renderInstallTasks();refreshAll();queueDraft()});const fields=['clientName','clientPhone','clientAddress','issueDate','validDays','installMode','installDifficulty','installWifiRate','installAnalogRate','installIpRate','installRecorderRate','analogCamerasPerKit','installPercent','installFixed','helperQty','helperPayEach','helperSaleEach','transportCost','transportSell','perDiemCost','perDiemSell','otherCost','otherSell','warrantyReserve','overhead','discountType','discountValue','paymentTerms','leadTime','scopeIncluded','scopeExcluded','warrantyText','internalNotes'];for(const name of fields){$(name).addEventListener('input',e=>{if(name==='discountType'&&quote.discountType!==e.target.value){quote.discountValue=0;$('discountValue').value=0}if(name==='helperQty'||name==='helperSaleEach')quote.helperAutoSaleEnabled=true;quote[name]=e.target.type==='number'?Math.max(0,(['installWifiRate','installAnalogRate','installIpRate','installRecorderRate','installFixed','helperSaleEach','transportSell','perDiemSell','otherSell'].includes(name)||(name==='discountValue'&&quote.discountType==='amount'))?netFromGross(e.target.value):num(e.target.value)):e.target.value;refreshAll();queueDraft()})} $('quoteSearch').addEventListener('input',renderSaved);$('savedQuotesList').addEventListener('click',e=>{const b=e.target.closest('[data-saved-action]');if(!b)return;const id=b.dataset.id;({open:()=>openQuote(id),pdf:()=>{const q=state.saved.find(x=>x.id===id);if(q)exportPdf(q)},duplicate:()=>duplicateQuote(id),delete:()=>deleteQuote(id)})[b.dataset.savedAction]?.()});$('chooseArchiveFolder').onclick=chooseArchiveFolder;$('backupFromSaved').onclick=generateBackup;$('exportBackup').onclick=generateBackup;$('supplierBackupNow').onclick=generateBackup;$('catalogTable').addEventListener('click',async e=>{const img=e.target.closest('[data-view-image]');if(img){viewProductImage(img.dataset.viewImage);return}const b=e.target.closest('[data-catalog-action]');if(!b)return;const {id,catalogAction}=b.dataset;if(catalogAction==='edit')productModal(id);if(catalogAction==='delete'&&await safeConfirm('¿Eliminar este producto del catálogo? Los ítems ya presupuestados no se modifican.')){state.catalog=state.catalog.filter(x=>x.id!==id);persist();archiveCatalog();renderCatalog();renderPicker();}});$('createCatalogProduct').onclick=()=>productModal();$('addSupplier').onclick=()=>supplierModal();$('supplierEmptyAdd').onclick=()=>supplierModal();$('supplierSearch').addEventListener('input',renderSuppliers);$('supplierSort').addEventListener('change',renderSuppliers);$('supplierList').addEventListener('click',e=>{const btn=e.target.closest('[data-supplier-action]');if(!btn)return;if(btn.dataset.supplierAction==='edit')supplierModal(btn.dataset.id);if(btn.dataset.supplierAction==='delete')deleteSupplier(btn.dataset.id)});$('restoreCatalog').onclick=restoreCatalog;$('saveSettings').onclick=saveSettings;$('resetLogo').onclick=()=>{state.settings.logoData='';persist();fillSettings();toast('Se restauró el logo inicial.')};$('logoUpload').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){toast('El logo debe pesar menos de 2 MB.',true);return}try{const uri=await fileToDataURL(file);state.settings.logoData=await normalizeLogo(uri);persist();fillSettings();toast('Logo personalizado actualizado.')}catch{toast('No se pudo leer la imagen.',true)}e.target.value=''});$('importBackup').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.format!=='safe-security-cotizador-v1'||!Array.isArray(data.catalog)||!Array.isArray(data.saved)||!data.settings||data.catalog.length>5000||data.saved.length>10000)throw Error('Archivo incompatible');if(!await safeConfirm('Esto reemplazará catálogo, proveedores, presupuestos, configuración y borrador. ¿Continuar?'))return;if(window.SafeServer)await window.SafeServer.replace(data);state={settings:{...initialSettings,...data.settings},catalog:data.catalog.map(cleanProduct),saved:data.saved.map(migrateQuote),packages:Array.isArray(data.packages)?data.packages:[],suppliers:Array.isArray(data.suppliers)?data.suppliers.map(cleanSupplier).filter(s=>s.name):[]};quote=data.draft?.items?migrateQuote(data.draft):createQuote(seqNum());persist();draftSave();fillQuoteForm();renderPicker();fillSettings();renderCatalog();renderSuppliers();archiveSuppliers();if(window.SafeTechnical)window.SafeTechnical.refresh();toast('Respaldo importado.')}catch(err){toast('Respaldo inválido: '+err.message,true)}finally{e.target.value=''}});$('modalClose').onclick=closeModal;$('modalCancel').onclick=closeModal;$('modalConfirm').onclick=()=>modalHandler();$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalOpen)closeModal()})}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(file)})}
function normalizeLogo(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');const ratio=Math.min(1,1300/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*ratio));c.height=Math.max(1,Math.round(im.height*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.91))};im.onerror=reject;im.src=src})}
function normalizeProductImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');const ratio=Math.min(1,640/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*ratio));c.height=Math.max(1,Math.round(im.height*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.8))};im.onerror=reject;im.src=src})}
function init(){
 document.querySelectorAll('#view-cotizador .collapsible-panel').forEach((panel,i)=>{
  const head=panel.querySelector('.panel-head');
  const body=panel.querySelector('.panel-body');
  head.classList.add('clickable-panel-head');
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='collapse-toggle';
  toggle.setAttribute('aria-label','Contraer módulo');
  toggle.setAttribute('aria-expanded','true');
  toggle.setAttribute('aria-controls','safe-panel-body-'+(i+1));
  toggle.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
  body.id='safe-panel-body-'+(i+1);
  head.append(toggle);
  function setCollapsed(closed){
   panel.classList.toggle('collapsed',closed);
   toggle.setAttribute('aria-expanded',String(!closed));
   toggle.setAttribute('aria-label',closed?'Desplegar módulo':'Contraer módulo');
  }
  toggle.addEventListener('click',e=>{e.stopPropagation();setCollapsed(!panel.classList.contains('collapsed'))});
  head.addEventListener('click',e=>{if(e.target.closest('button,input,select,textarea,a'))return;setCollapsed(!panel.classList.contains('collapsed'))});
  const footer=document.createElement('div');
  footer.className='module-apply-footer';
  footer.innerHTML='<span class="module-apply-status" aria-live="polite">Los cambios se reflejan en el resumen en tiempo real.</span><button type="button" class="btn btn-primary btn-sm module-apply-btn">✓ Aplicar cambios</button>';
  body.append(footer);
  const apply=footer.querySelector('button');
  const status=footer.querySelector('.module-apply-status');
  const mark=()=>{status.textContent='Cambios en edición · el total ya está actualizado';panel.classList.add('module-dirty')};
  body.addEventListener('input',e=>{if(e.target.matches('input,textarea,select'))mark()});
  body.addEventListener('change',e=>{if(e.target.matches('input,textarea,select'))mark()});
  apply.addEventListener('click',()=>{
   // Forzamos el commit final incluso si el navegador no disparó change todavía.
   body.querySelectorAll('input,textarea,select').forEach(el=>{if(el.id==='productSearch'||el.id==='categoryFilter')return;if(document.activeElement===el)el.dispatchEvent(new Event('input',{bubbles:true}))});
   quote.updatedAt=new Date().toISOString();
   clearTimeout(autoSaveTimer);
   refreshAll();
   draftSave();
   status.textContent='✓ Aplicado al presupuesto y guardado en borrador';
   panel.classList.remove('module-dirty');
   toast('Módulo '+(i+1)+' aplicado. Total actualizado.');
  });
 });
 const categoryOptions='<option value="">Todas las categorías</option>'+Object.entries(CATEGORY_LABELS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');$('categoryFilter').innerHTML=categoryOptions;$('todayLabel').textContent=new Date().toLocaleDateString('es-UY',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});bind();fillQuoteForm();renderPicker();fillSettings();renderSuppliers();archiveInit();if(!window.SafeAccess||SafeAccess.can('cotizador'))fetchRate(quote,{quiet:true})}
window.SAFE_APP={totals,initialCatalog,initialSettings,migrateQuote, get quote(){return quote},get state(){return state}, modal,closeModal,safeConfirm,initializeCollapsible,addProduct,renderItems,refreshAll,fillQuoteForm,renderPicker,persist,draftSave,queueDraft,toast,showView,nativeNetUSD,suggestSale,esc,num,deep,makeId,installDetail};init();
})();
