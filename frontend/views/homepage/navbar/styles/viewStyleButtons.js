// homepage/navbar/styles/viewStyleButtons.js

import {
  getCurrentPageStyle,
  setCurrentPageStyle,
} from "../pages/viewPages.js";
import { syncTextToolbarFromStyle } from "./text/textStyle.js";

const DEFAULTS = {
  backgroundColor: "#ffffff",
  width: 800,
  height: 500,
  gridEnabled: false,
  fontFamily: "Arial",
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
};

export function setupViewStyleButtons({ canvas, resetBtn, toggleGridBtn }) {
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener("mousedown", (e) => e.preventDefault());
    toggleGridBtn.addEventListener("click", () => {
      const current = getCurrentPageStyle() || {};
      const nextGrid = !current.gridEnabled;

      canvas.dataset.grid = nextGrid ? "on" : "off";
      toggleGridBtn.textContent = nextGrid ? "Grid: On" : "Grid: Off";

      if (nextGrid) {
        toggleGridBtn.classList.add("blue");
        toggleGridBtn.classList.remove("toggleColor");
      } else {
        toggleGridBtn.classList.remove("blue");
        toggleGridBtn.classList.add("toggleColor");
      }

      setCurrentPageStyle({
        ...current,
        gridEnabled: nextGrid,
      });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const defaultsStyle = {
        backgroundColor: DEFAULTS.backgroundColor,
        width: `${DEFAULTS.width}px`,
        height: `${DEFAULTS.height}px`,
        gridEnabled: DEFAULTS.gridEnabled,
        fontFamily: DEFAULTS.fontFamily,
        fontSize: DEFAULTS.fontSize,
        bold: DEFAULTS.bold,
        italic: DEFAULTS.italic,
        underline: DEFAULTS.underline,
      };

      setCurrentPageStyle(defaultsStyle);

      // Update canvas basics immediately
      canvas.style.backgroundColor = DEFAULTS.backgroundColor;
      canvas.style.width = `${DEFAULTS.width}px`;
      canvas.style.height = `${DEFAULTS.height}px`;
      canvas.dataset.grid = DEFAULTS.gridEnabled ? "on" : "off";

      if (toggleGridBtn) {
        toggleGridBtn.textContent = "Grid: Off";
        toggleGridBtn.classList.remove("blue");
        toggleGridBtn.classList.add("toggleColor");
      }

      // Let page-level modules re-sync if they listen to pageChanged
      document.dispatchEvent(
        new CustomEvent("pageChanged", { detail: { fromReset: true } })
      );

      // Sync text toolbar too
      syncTextToolbarFromStyle();
    });
  }
}
