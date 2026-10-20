/* Imported background: move by dragging, stretch with eight handles, size in meters. */
(() => {
  'use strict';
  const svg = $('canvas');
  const MIN = 40;
  const active = () => selected === 'background' && !!state.background;
  const handleScale = () => 1 / Math.max(.05, zoom);
  let resize = null;

  function backgroundHandles() {
    if (!active() || tool !== 'select') return;
    const b = state.background, s = handleScale();
    const midX = b.x + b.width / 2, midY = b.y + b.height / 2;
    const handles = [['nw', b.x, b.y, 'esquina superior izquierda'], ['n', midX, b.y, 'borde superior'], ['ne', b.x + b.width, b.y, 'esquina superior derecha'], ['e', b.x + b.width, midY, 'borde derecho'], ['se', b.x + b.width, b.y + b.height, 'esquina inferior derecha'], ['s', midX, b.y + b.height, 'borde inferior'], ['sw', b.x, b.y + b.height, 'esquina inferior izquierda'], ['w', b.x, midY, 'borde izquierdo']];
    const cursors = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    let out = `<g class="background-edit-handles" data-editor-only="true" pointer-events="none"><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="#007bff" stroke-width="1.5" stroke-dasharray="8 5" vector-effect="non-scaling-stroke"/>`;
    for (const [kind, x, y, label] of handles) out += `<g data-id="background" data-bg-handle="${kind}" transform="translate(${x} ${y}) scale(${s})" pointer-events="all" style="cursor:${cursors[kind]}"><title>Estirar: ${label} · Shift mantiene la proporción</title><rect x="-6" y="-6" width="12" height="12" fill="var(--camera-surface,#fff)" stroke="#007bff" stroke-width="2"/></g>`;
    $('scene').insertAdjacentHTML('beforeend', out + '</g>');
  }

  const oldRender = render;
  render = function () { oldRender(); backgroundHandles() };

  const oldProperties = properties;
  properties = function () {
    oldProperties();
    if (!active()) return;
    const b = state.background;
    const html = `<section class="shape-colors"><div class="panel-kicker">PLANO DE FONDO</div><p class="muted">Arrastrá la imagen para reubicarla y sus tiradores para estirarla o alargarla. Shift mantiene la proporción en las esquinas.</p><div class="color-fields"><label>Ancho (m)<input id="bgWidthMeters" type="number" min="0.1" step="0.1" value="${(b.width / pixelsPerMeter()).toFixed(2)}"></label><label>Alto (m)<input id="bgHeightMeters" type="number" min="0.1" step="0.1" value="${(b.height / pixelsPerMeter()).toFixed(2)}"></label></div></section>`;
    const anchor = $('properties').querySelector('.propTitle');
    if (anchor) anchor.insertAdjacentHTML('afterend', html);
    else $('properties').insertAdjacentHTML('beforeend', html);
    const apply = () => {
      const w = Number($('bgWidthMeters').value), h = Number($('bgHeightMeters').value);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) { refresh(); return }
      const bg = state.background, cx = bg.x + bg.width / 2, cy = bg.y + bg.height / 2;
      const nextW = Math.max(MIN, w * pixelsPerMeter()), nextH = Math.max(MIN, h * pixelsPerMeter());
      if (Math.abs(nextW - bg.width) < .01 && Math.abs(nextH - bg.height) < .01) return;
      checkpoint();
      bg.width = nextW; bg.height = nextH; bg.x = cx - nextW / 2; bg.y = cy - nextH / 2;
      refresh();
    };
    $('bgWidthMeters').onchange = apply;
    $('bgHeightMeters').onchange = apply;
  };

  const down = svg.onpointerdown, move = svg.onpointermove, up = svg.onpointerup, cancel = svg.onpointercancel;
  svg.onpointerdown = e => {
    const handle = e.target.closest('[data-bg-handle]');
    if (e.button !== 0 || !handle || tool !== 'select' || !state.background) { down(e); return }
    e.preventDefault();
    checkpoint();
    const b = state.background;
    resize = { kind: handle.dataset.bgHandle, original: { x: b.x, y: b.y, width: b.width, height: b.height } };
    svg.setPointerCapture(e.pointerId);
  };
  svg.onpointermove = e => {
    if (!resize) { move(e); return }
    const o = resize.original, p = pointFree(e), kind = resize.kind;
    const east = kind.includes('e'), west = kind.includes('w'), north = kind.includes('n'), south = kind.includes('s');
    let x = o.x, y = o.y, w = o.width, h = o.height;
    if (east) w = Math.max(MIN, p[0] - o.x);
    if (west) w = Math.max(MIN, o.x + o.width - p[0]);
    if (south) h = Math.max(MIN, p[1] - o.y);
    if (north) h = Math.max(MIN, o.y + o.height - p[1]);
    if (e.shiftKey && (east || west) && (north || south)) h = Math.max(MIN, w / (o.width / o.height));
    if (west) x = o.x + o.width - w;
    if (north) y = o.y + o.height - h;
    Object.assign(state.background, { x, y, width: w, height: h });
    render();
  };
  const finish = () => { resize = null; refresh() };
  svg.onpointerup = e => { if (resize) { finish(); return } up(e) };
  svg.onpointercancel = e => { if (resize) { Object.assign(state.background, resize.original); finish(); return } cancel?.(e) };
})();
