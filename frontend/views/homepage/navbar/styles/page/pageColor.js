// homepage/navbar/styles/page/pageColor.js

import { getCurrentPageStyle, setCurrentPageStyle } from '../../pages/viewPages.js';

const DEFAULTS = {
  backgroundColor: '#ffffff',
};

function paintCanvas(canvas, color) {
  if (!canvas) return;
  canvas.style.background = color;
  canvas.style.backgroundColor = color;
  canvas.style.setProperty('--builder-canvas-bg', color);
}

export function setupPageColorControls(canvas) {
  const bgInput = document.getElementById('pageBgColor');
  if (!bgInput || !canvas) return;

  function syncFromStore() {
    const style = getCurrentPageStyle() || {};
    const bg = style.backgroundColor || DEFAULTS.backgroundColor;
    bgInput.value = bg;
    paintCanvas(canvas, bg);
  }

  function applyBackground() {
    const val = bgInput.value || DEFAULTS.backgroundColor;
    paintCanvas(canvas, val);
    setCurrentPageStyle({ backgroundColor: val });
  }

  bgInput.addEventListener('input', applyBackground);
  bgInput.addEventListener('change', applyBackground);

  document.addEventListener('pageChanged', syncFromStore);
  document.addEventListener('templateChanged', syncFromStore);

  syncFromStore();
}
