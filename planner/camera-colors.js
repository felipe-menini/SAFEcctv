/* Per-camera icon and vision colors, saved with the plan like shape colors. */
(() => {
  'use strict';
  const valid = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#94a3b8', '#0ea5e9', '#14b8a6'];
  const oldProperties = properties;
  properties = function () {
    oldProperties();
    const c = cam();
    if (!c) return;
    const icon = valid(c.color) ? c.color : '#007bff';
    const vision = valid(c.visionColor) ? c.visionColor : icon;
    $('properties').insertAdjacentHTML('beforeend', `<section class="shape-colors"><div class="panel-kicker">COLOR DE LA CÁMARA</div><div class="color-fields"><label>Ícono<input id="camIconColor" type="color" value="${icon}"></label><label>Visión<input id="camVisionColor" type="color" value="${vision}"></label></div><div class="color-swatches">${palette.map(color => `<button type="button" data-cam-color="${color}" style="--swatch:${color}" aria-label="Elegir color ${color}" title="${color}"></button>`).join('')}</div><p class="muted">La paleta aplica el mismo color al ícono y a la visión. Los colores se guardan con el plano.</p><button id="resetCameraColor" type="button">Restaurar colores por defecto</button></section>`);
    const change = (key, value) => { checkpoint(); c[key] = value; refresh() };
    $('camIconColor').onchange = e => { if (valid(e.target.value)) change('color', e.target.value) };
    $('camVisionColor').onchange = e => { if (valid(e.target.value)) change('visionColor', e.target.value) };
    document.querySelectorAll('[data-cam-color]').forEach(b => b.onclick = () => { checkpoint(); c.color = b.dataset.camColor; c.visionColor = b.dataset.camColor; refresh() });
    $('resetCameraColor').onclick = () => { checkpoint(); delete c.color; delete c.visionColor; refresh() };
  };
})();
