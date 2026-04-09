// homepage/navbar/styles/text/textSize.js

import {
  getCurrentPageStyle,
  setCurrentPageStyle,
} from "../../pages/viewPages.js";
import { applyFontSize } from "./textStyle.js";

const TEXT_DEFAULTS = {
  fontSize: 14,
};

export function setupTextSizeControls(fontSizeInput) {
  if (!fontSizeInput) return;

  fontSizeInput.addEventListener("change", () => {
    let size = parseInt(fontSizeInput.value, 10);
    if (Number.isNaN(size)) size = TEXT_DEFAULTS.fontSize;
    if (size < 8) size = 8;
    if (size > 72) size = 72;

    fontSizeInput.value = size;

    const current = getCurrentPageStyle() || {};
    const next = {
      ...current,
      fontSize: size,
    };

    setCurrentPageStyle(next);
    applyFontSize(size);
  });
}
