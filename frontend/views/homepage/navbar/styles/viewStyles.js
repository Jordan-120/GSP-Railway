// homepage/navbar/styles/viewStyles.js

import { setupPageColorControls } from "./page/pageColor.js";
import { setupPageFunctionColorControls } from "./page/pageFunctionColor.js";
import { setupPageSizeControls } from "./page/pageSize.js";

import {
  initTextStyleSystem,
  syncTextToolbarFromStyle,
} from "./text/textStyle.js";
import { setupTextFontControls } from "./text/textFont.js";
import { setupTextSizeControls } from "./text/textSize.js";

import { setupViewStyleButtons } from "./viewStyleButtons.js";

export function setupStylesPanel() {
  const bgInput = document.getElementById("pageBgColor");
  const widthInput = document.getElementById("pageWidth");
  const heightInput = document.getElementById("pageHeight");
  const fontFamilySelect = document.getElementById("fontFamily");
  const fontSizeInput = document.getElementById("fontSize");
  const boldToggle = document.getElementById("boldToggle");
  const italicToggle = document.getElementById("italicToggle");
  const underlineToggle = document.getElementById("underlineToggle");
  const resetBtn = document.getElementById("resetStylesButton");
  const toggleGridBtn = document.getElementById("toggleGridButton");
  const widgetBgInput = document.getElementById("widgetBgColor");
  const canvas = document.getElementById("builderCanvas");

  if (
    !bgInput ||
    !widthInput ||
    !heightInput ||
    !fontFamilySelect ||
    !fontSizeInput ||
    !canvas
  ) {
    return;
  }

  // Page-level controls
  setupPageColorControls(canvas);
  setupPageSizeControls(canvas);
  setupPageFunctionColorControls(widgetBgInput);

  // Text styling system (selection, B/I/U, toolbar reflection)
  initTextStyleSystem({
    canvas,
    fontFamilySelect,
    fontSizeInput,
    boldToggle,
    italicToggle,
    underlineToggle,
  });

  // Font + size controls use the shared text style system
  setupTextFontControls(fontFamilySelect);
  setupTextSizeControls(fontSizeInput);

  // Grid + Reset buttons
  setupViewStyleButtons({
    canvas,
    resetBtn,
    toggleGridBtn,
  });

  // When page/template changes, re-sync the text toolbar from stored style
  document.addEventListener("pageChanged", () => {
    syncTextToolbarFromStyle();
  });

  document.addEventListener("templateChanged", () => {
    syncTextToolbarFromStyle();
  });
}
