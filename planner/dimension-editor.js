/* Editing a dimension changes plan geometry, never the global calibration. */
(()=>{'use strict';
const svg=$('canvas');
const dialog=document.createElement('dialog');
dialog.id='dimensionDialog';
dialog.setAttribute('aria-labelledby','dimensionTitle');
dialog.innerHTML='<form id="dimensionForm"><h2 id="dimensionTitle">Editar medida</h2><p id="dimensionHelp" class="muted"></p><label class="field" for="dimensionMeters">Distancia real (metros)<input id="dimensionMeters" type="text" inputmode="decimal" autocomplete="off" required aria-describedby="dimensionHelp dimensionError"></label><p id="dimensionError" role="alert"></p><div class="dimension-actions"><button id="cancelDimension" type="button">Cancelar</button><button id="applyDimension" class="primary" type="submit">Aplicar medida</button></div></form>';
document.body.append(dialog);
let editing=null;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function rectangle(points){
  if(points.length!==4)return false;
  const edges=points.map((p,i)=>[points[(i+1)%4][0]-p[0],points[(i+1)%4][1]-p[1]]);
  return edges.every((a,i)=>{
    const b=edges[(i+1)%4],la=Math.hypot(...a),lb=Math.hypot(...b);
    return la>.001&&lb>.001&&Math.abs(dot(a,b))<=la*lb*1e-8;
  })&&window.SAFE_SHAPE_GEOMETRY.valid(points);
}
function resized(shape,index,meters){
  if(!Number.isFinite(meters)||meters<=0)return null;
  const points=shape.points,p=points[index],end=(index+1)%points.length,q=points[end];
  const length=Math.hypot(q[0]-p[0],q[1]-p[1]),target=meters*pixelsPerMeter();
  if(length<.001||!Number.isFinite(target))return null;
  const direction=[(q[0]-p[0])/length,(q[1]-p[1])/length];
  let next=points.map(point=>[...point]);
  if(shape.type!=='wall'&&rectangle(points)){
    // Affine scaling along this side preserves a rotated rectangle and its other axis.
    next=points.map(point=>{
      const delta=dot([point[0]-p[0],point[1]-p[1]],direction)*(target/length-1);
      return [point[0]+direction[0]*delta,point[1]+direction[1]*delta];
    });
  }else next[end]=[p[0]+direction[0]*target,p[1]+direction[1]*target];
  if(!next.every(point=>point.every(Number.isFinite)))return null;
  if(shape.type!=='wall'&&!window.SAFE_SHAPE_GEOMETRY.valid(next))return null;
  if(shape.type==='wall'&&next.slice(1).some((point,i)=>Math.hypot(point[0]-next[i][0],point[1]-next[i][1])<.001))return null;
  return next;
}
function open(label){
  const shape=state.shapes.find(s=>s.id===label.dataset.dimension),index=Number(label.dataset.segment);
  if(!shape||!Number.isInteger(index)||index<0||index>=(shape.type==='wall'?shape.points.length-1:shape.points.length))return;
  const p=shape.points[index],q=shape.points[(index+1)%shape.points.length];
  editing={project:state,shape,index,points:JSON.stringify(shape.points)};
  $('dimensionMeters').value=String(Number((Math.hypot(q[0]-p[0],q[1]-p[1])/pixelsPerMeter()).toPrecision(12)));
  $('dimensionHelp').textContent=shape.type!=='wall'&&rectangle(shape.points)
    ?'Se ajusta este lado y su opuesto, conservando los ángulos rectos y la otra medida.'
    :'Se conserva el inicio del lado y su dirección. Se mueve el extremo final; los lados vecinos también pueden cambiar.';
  $('dimensionError').textContent='';dialog.showModal();$('dimensionMeters').focus();$('dimensionMeters').select();
}
function close(){dialog.close();editing=null}
$('cancelDimension').onclick=close;
dialog.addEventListener('close',()=>{editing=null});
dialog.addEventListener('keydown',e=>{e.stopPropagation()});
$('dimensionForm').onsubmit=e=>{
  e.preventDefault();
  if(!editing)return;
  const {project,shape,index,points}=editing;
  if(state!==project||!state.shapes.includes(shape)||JSON.stringify(shape.points)!==points){close();toast('El plano cambió. Vuelve a abrir la medida.');return}
  const text=$('dimensionMeters').value.trim();
  const meters=/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)?Number(text.replace(',','.')):NaN;
  const next=resized(shape,index,meters);
  if(!next){$('dimensionError').textContent='Usa una medida positiva y finita que no cruce los lados ni repita esquinas.';return}
  if(next.some((p,i)=>Math.hypot(p[0]-shape.points[i][0],p[1]-shape.points[i][1])>1e-8)){
    checkpoint();shape.points=next;selected=shape.id;refresh();
  }
  close();
};
// Avoid selection/drag redraws between the two clicks. Drawing and pan tools retain ownership.
const down=svg.onpointerdown,dbl=svg.ondblclick;
svg.onpointerdown=e=>{if(e.button===0&&tool==='select'&&!window.SAFE_VIEWPORT?.navigating&&e.target.closest('[data-dimension]')){const sh=state.shapes.find(s=>s.id===e.target.closest('[data-dimension]').dataset.dimension);if(!sh||(sh.type==='wall'?'walls':sh.type)&&state.locks[sh.type==='wall'?'walls':sh.type]){e.stopPropagation();return}e.preventDefault();return}down(e)};
svg.ondblclick=e=>{const label=e.target.closest('[data-dimension]');if(tool==='select'&&!window.SAFE_VIEWPORT?.navigating&&label){const sh=state.shapes.find(s=>s.id===label.dataset.dimension);if(sh&&state.locks[sh.type==='wall'?'walls':sh.type])return;e.preventDefault();open(label);return}dbl?.(e)};
svg.addEventListener('keydown',e=>{const label=e.target.closest('[data-dimension]');if(tool==='select'&&label&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();open(label)}});
window.SAFE_DIMENSIONS={resized,rectangle};
})();
