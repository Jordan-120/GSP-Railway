// homepage/navbar/styles/page/pageSize.js

import {
  getCurrentPageStyle,
  setCurrentPageStyle,
} from "../../pages/viewPages.js";

const DEFAULTS = {
  width: 800,
  height: 500,
};

export function setupPageSizeControls(canvas) {
  const widthInput = document.getElementById("pageWidth");
  const heightInput = document.getElementById("pageHeight");
  if (!widthInput || !heightInput || !canvas) return;

  function syncFromStore() {
    const style = getCurrentPageStyle() || {};
    const w = parseInt(style.width, 10) || DEFAULTS.width;
    const h = parseInt(style.height, 10) || DEFAULTS.height;

    widthInput.value = w;
    heightInput.value = h;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  widthInput.addEventListener("change", () => {
    let w = parseInt(widthInput.value, 10);
    if (Number.isNaN(w)) w = DEFAULTS.width;
    if (w < 300) w = 300;
    if (w > 5000) w = 5000;

    widthInput.value = w;
    canvas.style.width = `${w}px`;

    const current = getCurrentPageStyle() || {};
    setCurrentPageStyle({
      ...current,
      width: `${w}px`,
    });
  });

  heightInput.addEventListener("change", () => {
    let h = parseInt(heightInput.value, 10);
    if (Number.isNaN(h)) h = DEFAULTS.height;
    if (h < 300) h = 300;
    if (h > 5000) h = 5000;

    heightInput.value = h;
    canvas.style.height = `${h}px`;

    const current = getCurrentPageStyle() || {};
    setCurrentPageStyle({
      ...current,
      height: `${h}px`,
    });
  });

  document.addEventListener("pageChanged", syncFromStore);
  document.addEventListener("templateChanged", syncFromStore);

  syncFromStore();
}
