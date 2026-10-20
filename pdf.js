/* SAFE Security: exportador PDF autónomo, sin bibliotecas externas.
   PDF 1.4 con texto seleccionable y logo JPEG incrustado. */
(function(){
'use strict';
const PAGE_W=595.28,PAGE_H=841.89,M=43,RIGHT=PAGE_W-M,INK=[.055,.122,.231],BLUE=[0,.482,1],LIGHT=[.94,.963,.99],GREY=[.40,.48,.58],GREEN=[.055,.49,.36];
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const f=n=>Number(n).toFixed(2);
const rgb=c=>c.map(f).join(' ');
const latinMap={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
const clean=t=>String(t??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').replace(/[\u{1F000}-\u{1FFFF}]/gu,'');
function pdfString(s){let out='';for(const ch of clean(s)){const cp=ch.codePointAt(0);let c=cp<=255?cp:latinMap[cp];if(c===undefined)c=63;if(c===40||c===41||c===92)out+='\\'+String.fromCharCode(c);else if(c===10)out+='\\n';else if(c===13)out+='\\r';else if(c<32||c>126)out+='\\'+c.toString(8).padStart(3,'0');else out+=String.fromCharCode(c)}return out}
function bytes(str){const a=new Uint8Array(str.length);for(let i=0;i<str.length;i++)a[i]=str.charCodeAt(i)&255;return a}
function concat(...parts){const n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length}return out}
class PDFObjects{constructor(){this.objects=[null]}reserve(){this.objects.push(null);return this.objects.length-1}set(i,raw){this.objects[i]=typeof raw==='string'?bytes(raw):raw}add(raw){const n=this.reserve();this.set(n,raw);return n}serialize(root){let segments=[bytes('%PDF-1.4\n%SAFE-SECURITY\n')],position=segments[0].length;const offsets=[0];for(let i=1;i<this.objects.length;i++){offsets[i]=position;const part=concat(bytes(i+' 0 obj\n'),this.objects[i],bytes('\nendobj\n'));segments.push(part);position+=part.length}const start=position;let xref='xref\n0 '+this.objects.length+'\n0000000000 65535 f \n';for(let i=1;i<this.objects.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';segments.push(bytes(xref+`trailer\n<< /Size ${this.objects.length} /Root ${root} 0 R >>\nstartxref\n${start}\n%%EOF`));return new Blob(segments,{type:'application/pdf'})}}
function imageBytes(data){const match=/^data:image\/(jpeg|jpg);base64,([\s\S]+)$/i.exec(data||'');if(!match)throw Error('Se necesita un logo JPG para exportar');const decoded=atob(match[2]);return bytes(decoded)}
function jpegSize(jpeg){let imgWidth=808,imgHeight=280;for(let i=2;i<jpeg.length-10;){if(jpeg[i]!==255){i++;continue}const marker=jpeg[i+1];if(marker===216||marker===217){i+=2;continue}if(marker===255){i++;continue}if(marker===218)break;const length=(jpeg[i+2]<<8)|jpeg[i+3];if(length<2)break;if([192,193,194,195,198,199,201,202].includes(marker)){imgHeight=(jpeg[i+5]<<8)|jpeg[i+6];imgWidth=(jpeg[i+7]<<8)|jpeg[i+8];break}i+=length+2}return{imgWidth,imgHeight}}
function quoteDate(d){if(!d)return'—';const parts=String(d).split('-');return`${parts[2]||'--'}/${parts[1]||'--'}/${parts[0]||'----'}`}
function expiryDate(issue,days){const d=new Date((issue||'2026-01-01')+'T12:00:00Z');if(Number.isNaN(d.valueOf()))return'—';d.setUTCDate(d.getUTCDate()+number(days));return quoteDate(d.toISOString().slice(0,10))}
const money=n=>'USD '+number(n).toLocaleString('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2});
function textWidth(s,size=10,bold=false){let width=0;for(const c of clean(s)){if('il.,:;!|\' '.includes(c))width+=.26;else if('MW@%'.includes(c))width+=.85;else if('0123456789'.includes(c))width+=.56;else if(c===' ')width+=.27;else width+=bold?.59:.52;}return width*size}
function wrap(s,maxWidth,size=10,bold=false){const chunks=[];for(const paragraph of clean(s).split('\n')){if(!paragraph.trim()){chunks.push('');continue}let line='';for(const word of paragraph.split(/\s+/)){if(textWidth(word,size,bold)>maxWidth){if(line){chunks.push(line);line=''}let fragment='';for(const ch of word){if(textWidth(fragment+ch,size,bold)>maxWidth){chunks.push(fragment);fragment=''}fragment+=ch}line=fragment;continue}if(!line||textWidth(line+' '+word,size,bold)<=maxWidth)line+=(line?' ':'')+word;else{chunks.push(line);line=word}}if(line)chunks.push(line)}return chunks.length?chunks:['']}
class Page{
constructor(first=false){this.first=first;this.commands=[];this.top=first?330:102;this.pageNumber=1;}
cmd(command){this.commands.push(command)}
rect(x,y,w,h,color=LIGHT){this.cmd(`${rgb(color)} rg ${f(x)} ${f(PAGE_H-y-h)} ${f(w)} ${f(h)} re f`)}
line(x1,y1,x2,y2,color=[.86,.89,.94],weight=1){this.cmd(`${rgb(color)} RG ${f(weight)} w ${f(x1)} ${f(PAGE_H-y1)} m ${f(x2)} ${f(PAGE_H-y2)} l S`)}
text(s,x,y,size=10,bold=false,color=INK,align='left',italic=false){const str=clean(s),targetX=align==='right'?x-textWidth(str,size,bold):align==='center'?x-textWidth(str,size,bold)/2:x;this.cmd(`${rgb(color)} rg BT /${italic?'F3':bold?'F2':'F1'} ${f(size)} Tf 1 0 0 1 ${f(targetX)} ${f(PAGE_H-y-size)} Tm (${pdfString(str)}) Tj ET`)}
lines(lines,x,y,{size=9.5,color=INK,bold=false,leading=14}={}){lines.forEach((line,i)=>this.text(line,x,y+i*leading,size,bold,color));return y+lines.length*leading}
}
function createPdf({quote:q,settings:s,totals:t,currency='USD',rate=0,fxDate='',fxSource='',fxManual=false,planJpeg=''}){
const isUYU=currency==='UYU',multiplier=isUYU?number(rate):1;if(isUYU&&multiplier<=0)throw Error('Falta la cotización para convertir a pesos.');
const money=n=>(isUYU?'UYU ':'USD ')+(number(n)*multiplier).toLocaleString('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2});
const gross=n=>number(n)*(1+number(s.saleTaxRate)/100);
const rateDate=()=>{if(!fxDate)return 'sin fecha';const dt=new Date(fxDate);return Number.isFinite(dt.getTime())?new Intl.DateTimeFormat('es-UY',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/Montevideo'}).format(dt):fxDate.slice(0,10)};

const objs=new PDFObjects();const catalogId=objs.reserve(),pagesId=objs.reserve();const f1=objs.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const f2=objs.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');const f3=objs.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
const logo=(s.logoData||window.SAFE_DEFAULT_LOGO);const jpeg=imageBytes(logo);const{imgWidth,imgHeight}=jpegSize(jpeg);
const imageId=objs.add(concat(bytes(`<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,bytes('\nendstream')));
const pages=[];let p;
function page(first=false){p=new Page(first);p.pageNumber=pages.length+1;pages.push(p);if(first)firstHeader(p);else continuedHeader(p);return p}
function image(x,y,w,h){const rw=imgWidth/imgHeight,r=w/h;let ww=w,hh=h;if(rw>r)hh=w/rw;else ww=h*rw;const ix=x+(w-ww)/2,iy=y+(h-hh)/2;p.cmd(`q ${f(ww)} 0 0 ${f(hh)} ${f(ix)} ${f(PAGE_H-iy-hh)} cm /Im0 Do Q`)}
function topLine(){p.rect(0,0,PAGE_W,9,BLUE)}
function firstHeader(pp){topLine();image(42,25,228,99);pp.text('PRESUPUESTO',RIGHT,41,16,true,INK,'right');pp.text('INSTALACIÓN DE SEGURIDAD · '+currency,RIGHT,63,8,true,BLUE,'right');pp.text(q.number||'SAFE-0001',RIGHT,86,10,true,INK,'right');pp.line(M,130,RIGHT,130);pp.text('PROPUESTA COMERCIAL',M,150,9,true,BLUE);pp.text('Soluciones en seguridad y conectividad',M,171,17,true,INK);pp.rect(M,208,PAGE_W-M*2,100,[.948,.968,.992]);pp.text('PREPARADO PARA',M+15,222,8,true,BLUE);pp.text(String(q.clientName||'Cliente'),M+15,238,13,true,INK);const address=wrap(q.clientAddress||'Dirección de instalación a coordinar',255,8);pp.lines(address.slice(0,2),M+15,260,{size:8,color:GREY,leading:12});pp.text('EMISIÓN',RIGHT-145,223,8,true,GREY);pp.text(quoteDate(q.issueDate),RIGHT-145,237,10,true,INK);pp.text('VÁLIDO HASTA',RIGHT-145,258,8,true,GREY);pp.text(expiryDate(q.issueDate,q.validDays),RIGHT-145,271,10,true,INK);pp.text('Contacto: '+(q.clientPhone||'no proporcionado'),M+15,286,7.5,false,GREY)}
function continuedHeader(pp){topLine();image(M,16,132,42);pp.text('PRESUPUESTO '+(q.number||''),RIGHT,36,9,true,GREY,'right');pp.line(M,61,RIGHT,61);pp.text('Detalle de instalación · '+(q.clientName||'Cliente'),M,74,10,true,INK);}
function need(h=50){if(p.top+h>774){page(false);tableHeader();}}
function tableHeader(){p.rect(M,p.top,PAGE_W-M*2,29,INK);p.text('DESCRIPCIÓN',M+10,p.top+8,8,true,[1,1,1]);p.text('CANT.',352,p.top+8,8,true,[1,1,1],'right');p.text('PRECIO',439,p.top+8,8,true,[1,1,1],'right');p.text('TOTAL',RIGHT-9,p.top+8,8,true,[1,1,1],'right');p.top+=35;}
page(true);
p.text('EQUIPAMIENTO Y SERVICIOS',M,p.top,10,true,INK);p.top+=24;tableHeader();
function row(title,sub,qty,unit,total){sub=String(sub||'').replace(/(?:precio|costo)\s+(?:de\s+)?(?:proveedor|compra)[^.;]*(?:[.;]|$)/gi,'').trim();const titleLines=wrap(title,272,9.2,true);const subLines=sub?wrap(sub,265,7.5):[];const minHeight=titleLines.length*13+subLines.length*10+17;const height=Math.max(36,Math.min(140,minHeight));need(height);const y=p.top;p.text('',M,y,2);p.lines(titleLines.slice(0,6),M+8,y+4,{size:9.2,bold:true,leading:13});if(subLines.length)p.lines(subLines.slice(0,8),M+8,y+titleLines.length*13+6,{size:7.5,color:GREY,leading:10});p.text(String(qty),352,y+9,8.6,false,INK,'right');p.text(money(gross(unit)),439,y+9,8.6,false,INK,'right');p.text(money(gross(total)),RIGHT-9,y+9,9,true,INK,'right');p.line(M,y+height,RIGHT,y+height,[.88,.91,.95],.7);p.top+=height+1;}
(q.items||[]).forEach(x=>{const qty=number(x.quantity),unit=number(x.sale);if(qty<=0)return;row(x.name,x.description,Number(qty.toFixed(2)),unit,qty*unit)});
const serviceRows=[];
if(t.installSale>0){
 const c=t.installation?.counts||{};
 const camera=(n,label)=>n?`${number(n)} ${label}${number(n)===1?'':'s'}`:null;
 const description=[camera(c.wifi,'cámara WiFi'),camera(c.analog,'cámara analógica'),c.ip?`${number(c.ip)} ${number(c.ip)===1?'cámara IP':'cámaras IP'}`:null,camera(c.recorders,'grabador')].filter(Boolean);
 const extras=(t.installation?.extras||[]).filter(x=>x.qty>0 && x.price>0).map(x=>`${x.name}: ${number(x.qty)} ${x.unit||'unid.'}`).slice(0,3);
 description.push(...extras);
 description.push('Movilidad incluida');
 serviceRows.push(['Instalación técnica y configuración',description.join(' · ')+(number(s.serviceTaxRate)===0?' · Sin IVA':''),1,t.installSale]);
}
if(t.otherSell>0)serviceRows.push(['Otros servicios','Servicios adicionales según relevamiento',1,t.otherSell]);
serviceRows.forEach(x=>row(x[0],x[1],x[2],x[3],x[3]));
if(p.top+180+(t.discount>0?42:0)+(t.serviceVat>0.001?21:0)>774){page(false);p.text('RESUMEN ECONÓMICO',M,p.top+8,11,true,INK);p.top+=40;}
// Resumen comercial sobre blanco: sin texto comprimido ni importe sobre fondo oscuro.
// El total se distribuye a ancho completo, con una línea azul decorativa a la izquierda.
let sy=p.top+19;const labelX=PAGE_W-233,valueX=RIGHT-7;
function sumLine(name,value,strong=false,color=INK){p.text(name,labelX,sy,strong?10:9,strong,color);p.text(value,valueX,sy,strong?10:9,strong,color,'right');sy+=21;}
if(t.discount>0){sumLine('Total previo',money(t.beforeDiscount));sumLine('Descuento','- '+money(t.discount),false,[.67,.24,.27]);}sumLine('Subtotal sin IVA',money(t.subtotal));sumLine('IVA equipamiento ('+number(s.saleTaxRate)+'%)',money(t.goodsVat));if(t.serviceVat>0.001)sumLine('IVA servicios ('+number(s.serviceTaxRate)+'%)',money(t.serviceVat));
sy+=8;
p.rect(M,sy,PAGE_W-M*2,72,[.957,.976,.998]);
p.rect(M,sy,5,72,BLUE);
p.line(M+19,sy+63,RIGHT-18,sy+63,[.86,.91,.96],.55);
p.text('TOTAL DEL PRESUPUESTO',M+22,sy+17,10,true,INK);
p.text('IMPORTE FINAL EN '+currency+' · IVA DESGLOSADO',M+22,sy+36,7.4,false,GREY);
p.text(money(t.customerTotal),RIGHT-19,sy+14,20,true,BLUE,'right');
p.top=sy+95;
if(isUYU){if(p.top+32>772)page(false);p.text('Conversión: 1 USD = '+number(rate).toLocaleString('es-UY',{minimumFractionDigits:2,maximumFractionDigits:2})+' UYU · Dólar VENTA',M+6,p.top,8,true,INK);p.top+=13;p.text((fxManual?'Cotización MANUAL declarada':'Referencia BROU vía DolarAPI')+' · Actualización: '+rateDate(),M+6,p.top,7.6,false,GREY);p.top+=20;}
function section(label,value){if(!value)return;const lines=wrap(value,PAGE_W-M*2-20,8.6);let index=0;function heading(continuation){if(p.top+55>777){page(false);p.top+=4}p.rect(M,p.top,PAGE_W-M*2,23,[.94,.963,.99]);p.text((label+(continuation?' (continuación)':'')).toUpperCase(),M+9,p.top+6,8,true,BLUE);p.top+=29}heading(false);while(index<lines.length){if(p.top+19>777){page(false);p.top+=4;heading(true)}p.text(lines[index++],M+8,p.top,8.6,false,INK);p.top+=13}p.top+=16;}
// Anexos comerciales opcionales: resumen sin costos internos ni fotografías.
if(q.survey?.shareInPdf && Array.isArray(q.survey.points) && q.survey.points.length){
 const points=q.survey.points;
 const sum=points.reduce((a,pt)=>a+(pt.type==='wifi'?0:number(pt.distance)),0);
 section('Relevamiento técnico resumido',`${points.length} puntos previstos · ${sum.toFixed(1)} m de cable medido (sin reservas) · Ubicación DVR/NVR: ${q.survey.recorderLocation||'a definir'}. Distancias sujetas a confirmación en obra.`);
}
if(q.storagePlan?.includeInPdf){
 const st=q.storagePlan;
 const cc=st.mode==='microsd'?1:st.cameraCountMode==='manual'?number(st.manualCameras):number(t.installation?.counts?.ip)+number(t.installation?.counts?.analog);
 const bitrate=Math.max(.05,number(st.bitrate)), share=st.recordMode==='continuous'||(!st.recordMode&&number(st.motionShare)===100)?1:Math.max(.01,Math.min(1,number(st.motionShare)/100));
 const capacity=Math.max(0,number(st.diskGB)), usable=.90;
 const dayGB=cc*bitrate*1000000/8*86400/1000000000*share;
 const days=dayGB>0?capacity*usable/dayGB:0;
 const wantDays=Math.max(1,number(st.daysWanted)||14);
 const neededGB=Math.ceil(dayGB*wantDays/usable-1e-6);
 const info=st.calcMode==='days'?`${cc} cámara(s) · ${wantDays} días solicitados · capacidad mínima estimada ${neededGB} GB`:`${cc} cámara(s) · disco ${capacity} GB · autonomía estimada ${days.toFixed(1)} días`;
 section('Grabación estimada',`${info} · ${bitrate.toFixed(2)} Mbps por cámara · ${st.codec?.toUpperCase()||'H.265'} · ${share===1?'grabación continua 24/7':'grabación por movimiento ('+Math.round(share*100)+'% efectivo supuesto)'} · reserva técnica 10%. Cálculo orientativo: movimiento, bitrate, audio y capacidad real pueden modificar los resultados. No garantiza días de retención.`);
}
section('Condiciones de pago',q.paymentTerms||'A convenir');section('Tiempo estimado',q.leadTime||'A coordinar');section('Alcance incluido',q.scopeIncluded);section('Exclusiones y observaciones',q.scopeExcluded);section('Garantía y condiciones',q.warrantyText);
let planId=0,planSize=null;
if(planJpeg){try{const pj=imageBytes(planJpeg);planSize=jpegSize(pj);planId=objs.add(concat(bytes(`<< /Type /XObject /Subtype /Image /Width ${planSize.imgWidth} /Height ${planSize.imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pj.length} >>\nstream\n`),pj,bytes('\nendstream')))}catch{}}
if(planId){page(false);p.text('ESQUEMA DE INSTALACIÓN',M,p.top,11,true,INK);p.top+=14;p.text('Plano de cobertura y recorridos del presupuesto.',M,p.top,8,false,GREY);p.top+=12;const maxW=PAGE_W-M*2,maxH=650;let ww=maxW,hh=ww*planSize.imgHeight/planSize.imgWidth;if(hh>maxH){hh=maxH;ww=hh*planSize.imgWidth/planSize.imgHeight}p.cmd(`q ${f(ww)} 0 0 ${f(hh)} ${f((PAGE_W-ww)/2)} ${f(PAGE_H-p.top-hh)} cm /Im1 Do Q`)}
const contact=[s.companyName||'SAFE Security',s.companyPhone,s.companyEmail,s.companyWeb,s.companyAddress].filter(Boolean).join('  ·  ');for(let i=0;i<pages.length;i++){const pp=pages[i];pp.line(M,799,RIGHT,799,[.82,.87,.93]);const footer=wrap(contact,PAGE_W-M*2-80,7);pp.text(footer[0]||'SAFE Security · Seguridad y conectividad',M,806,7,false,GREY);pp.text('Pág. '+(i+1)+' / '+pages.length,RIGHT,807,7,true,GREY,'right');}
const pageIds=[];for(const pg of pages){const content=bytes(pg.commands.join('\n')+'\n');const contentId=objs.add(concat(bytes(`<< /Length ${content.length} >>\nstream\n`),content,bytes('endstream')));const pageId=objs.add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(PAGE_W)} ${f(PAGE_H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> /XObject << /Im0 ${imageId} 0 R${planId?` /Im1 ${planId} 0 R`:''} >> >> /Contents ${contentId} 0 R >>`);pageIds.push(pageId)}objs.set(pagesId,`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pages.length} >>`);objs.set(catalogId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);return objs.serialize(catalogId);
}
window.SafePDF={makePdf:async payload=>createPdf(payload)};
})();
