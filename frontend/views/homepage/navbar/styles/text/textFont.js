// homepage/navbar/styles/text/textFont.js

import {
  getCurrentPageStyle,
  setCurrentPageStyle,
} from "../../pages/viewPages.js";
import { applyFontFamily } from "./textStyle.js";

const TEXT_DEFAULTS = {
  fontFamily: "Arial",
};

export function setupTextFontControls(fontFamilySelect) {
  if (!fontFamilySelect) return;

  fontFamilySelect.addEventListener("change", () => {
    const familyKey = fontFamilySelect.value || TEXT_DEFAULTS.fontFamily;

    const current = getCurrentPageStyle() || {};
    const next = {
      ...current,
      fontFamily: familyKey,
    };

    setCurrentPageStyle(next);
    applyFontFamily(familyKey);
  });
}
