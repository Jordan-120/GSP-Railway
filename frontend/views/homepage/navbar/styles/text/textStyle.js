// homepage/navbar/styles/text/textStyle.js

import { getCurrentPageStyle, setCurrentPageStyle } from '../../pages/viewPages.js';

const TEXT_DEFAULTS = {
  fontFamily: 'Arial',
  fontSize: 14,
  bold: false,
  italic: false,
  underline: false,
};

let canvasRef = null;
let controls = {
  fontFamilySelect: null,
  fontSizeInput: null,
  boldToggle: null,
  italicToggle: null,
  underlineToggle: null,
};

let lastCanvasRange = null;

function fontKeyToCssFamily(key) {
  switch (key) {
    case 'Arial':
      return 'Arial, sans-serif';
    case 'Verdana':
      return 'Verdana, sans-serif';
    case 'Tahoma':
      return 'Tahoma, sans-serif';
    case 'Georgia':
      return 'Georgia, serif';
    case 'Times New Roman':
      return '"Times New Roman", serif';
    case 'Courier New':
      return '"Courier New", monospace';
    default:
      return key || 'Arial, sans-serif';
  }
}

function normalizeStoredFontFamily(value) {
  if (!value) return TEXT_DEFAULTS.fontFamily;
  const lower = value.toLowerCase();

  if (lower.startsWith('arial')) return 'Arial';
  if (lower.startsWith('verdana')) return 'Verdana';
  if (lower.startsWith('tahoma')) return 'Tahoma';
  if (lower.startsWith('georgia')) return 'Georgia';
  if (lower.includes('times new roman')) return 'Times New Roman';
  if (lower.includes('courier new')) return 'Courier New';

  return value;
}

function isNodeInCanvas(node) {
  if (!canvasRef || !node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return !!el && canvasRef.contains(el);
}

function syncToggle(btn, active) {
  if (!btn) return;
  btn.classList.toggle('toggle-active', !!active);
}

function getCurrentTextStyle() {
  const s = getCurrentPageStyle() || {};
  return {
    fontFamily: s.fontFamily || TEXT_DEFAULTS.fontFamily,
    fontSize: s.fontSize || TEXT_DEFAULTS.fontSize,
    bold: !!s.bold,
    italic: !!s.italic,
    underline: !!s.underline,
  };
}

function updateStoredTextStyle(style) {
  const current = getCurrentPageStyle() || {};
  setCurrentPageStyle({
    ...current,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    bold: !!style.bold,
    italic: !!style.italic,
    underline: !!style.underline,
  });
}

function updateToolbarFromCaret(node) {
  if (!controls.fontFamilySelect || !controls.fontSizeInput) return;
  if (!isNodeInCanvas(node)) return;

  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return;

  const computed = window.getComputedStyle(el);
  const familyKey = normalizeStoredFontFamily(computed.fontFamily);
  let size = parseInt(computed.fontSize, 10);
  if (Number.isNaN(size)) size = TEXT_DEFAULTS.fontSize;
  size = Math.max(8, Math.min(72, size));

  const weightStr = computed.fontWeight;
  const weightNum = parseInt(weightStr, 10);
  const isBold = computed.fontWeight === 'bold' || (!Number.isNaN(weightNum) && weightNum >= 600);
  const isItalic = computed.fontStyle === 'italic';
  const decoLine = computed.textDecorationLine || computed.textDecoration || '';
  const isUnderline = decoLine.includes('underline');

  controls.fontFamilySelect.value = familyKey;
  controls.fontSizeInput.value = size;
  syncToggle(controls.boldToggle, isBold);
  syncToggle(controls.italicToggle, isItalic);
  syncToggle(controls.underlineToggle, isUnderline);

  updateStoredTextStyle({
    fontFamily: familyKey,
    fontSize: size,
    bold: isBold,
    italic: isItalic,
    underline: isUnderline,
  });
}

function saveRangeFromSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (!isNodeInCanvas(range.commonAncestorContainer)) return;

  lastCanvasRange = range.cloneRange();
  updateToolbarFromCaret(range.commonAncestorContainer);
}

function clearLastCanvasRange() {
  lastCanvasRange = null;
}

function getOrRestoreCanvasRange() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const liveRange = sel.getRangeAt(0);
    if (isNodeInCanvas(liveRange.commonAncestorContainer)) {
      return liveRange;
    }
  }

  if (!lastCanvasRange) return null;

  const restored = lastCanvasRange.cloneRange();
  const sel2 = window.getSelection();
  sel2.removeAllRanges();
  sel2.addRange(restored);
  return restored;
}

function createStyledSpan(style) {
  const span = document.createElement('span');
  span.style.fontFamily = fontKeyToCssFamily(style.fontFamily);
  span.style.fontSize = `${style.fontSize}px`;
  span.style.fontWeight = style.bold ? 'bold' : 'normal';
  span.style.fontStyle = style.italic ? 'italic' : 'normal';
  span.style.textDecoration = style.underline ? 'underline' : 'none';
  return span;
}

function findStylableElement(range) {
  let node = range.commonAncestorContainer;
  let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

  while (el && canvasRef && canvasRef.contains(el)) {
    if (el !== canvasRef && !el.classList.contains('builder-widget') && !el.classList.contains('gs-widget-body')) {
      return el;
    }
    el = el.parentElement;
  }

  return null;
}

export function initTextStyleSystem({
  canvas,
  fontFamilySelect,
  fontSizeInput,
  boldToggle,
  italicToggle,
  underlineToggle,
}) {
  canvasRef = canvas;
  controls = {
    fontFamilySelect,
    fontSizeInput,
    boldToggle,
    italicToggle,
    underlineToggle,
  };

  document.addEventListener('selectionchange', saveRangeFromSelection);
  canvas.addEventListener('mouseup', saveRangeFromSelection);
  canvas.addEventListener('keyup', saveRangeFromSelection);

  canvas.addEventListener('mousedown', (e) => {
    const isBlankClick = e.target === canvas || e.target.classList.contains('builder-placeholder');
    if (isBlankClick) {
      clearLastCanvasRange();
    }
  });

  function setupToggleButton(button, command) {
    if (!button) return;

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    button.addEventListener('click', () => {
      const range = getOrRestoreCanvasRange();
      if (!range) return;

      document.execCommand(command, false);
      saveRangeFromSelection();
    });
  }

  setupToggleButton(boldToggle, 'bold');
  setupToggleButton(italicToggle, 'italic');
  setupToggleButton(underlineToggle, 'underline');

  syncTextToolbarFromStyle();
}

export function applyFontFamily(familyKey) {
  const base = getCurrentTextStyle();
  applyTextStyle({ ...base, fontFamily: familyKey });
}

export function applyFontSize(size) {
  const base = getCurrentTextStyle();
  applyTextStyle({ ...base, fontSize: size });
}

function applyTextStyle(style) {
  const normalized = {
    fontFamily: normalizeStoredFontFamily(style.fontFamily),
    fontSize: style.fontSize || TEXT_DEFAULTS.fontSize,
    bold: !!style.bold,
    italic: !!style.italic,
    underline: !!style.underline,
  };

  const range = getOrRestoreCanvasRange();
  if (!range) {
    updateStoredTextStyle(normalized);
    syncTextToolbarFromStyle();
    return;
  }

  const sel = window.getSelection();

  if (!range.collapsed) {
    const span = createStyledSpan(normalized);

    try {
      range.surroundContents(span);
    } catch (err) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
    lastCanvasRange = newRange.cloneRange();
    updateToolbarFromCaret(span);
  } else {
    const el = findStylableElement(range);
    if (!el) return;

    el.style.fontFamily = fontKeyToCssFamily(normalized.fontFamily);
    el.style.fontSize = `${normalized.fontSize}px`;
    el.style.fontWeight = normalized.bold ? 'bold' : 'normal';
    el.style.fontStyle = normalized.italic ? 'italic' : 'normal';
    el.style.textDecoration = normalized.underline ? 'underline' : 'none';

    const caretRange = range.cloneRange();
    sel.removeAllRanges();
    sel.addRange(caretRange);
    lastCanvasRange = caretRange.cloneRange();
    updateToolbarFromCaret(el);
  }

  updateStoredTextStyle(normalized);
}

export function syncTextToolbarFromStyle() {
  if (!controls.fontFamilySelect || !controls.fontSizeInput) return;

  const s = getCurrentTextStyle();
  const familyKey = normalizeStoredFontFamily(s.fontFamily);
  const size = s.fontSize || TEXT_DEFAULTS.fontSize;

  controls.fontFamilySelect.value = familyKey;
  controls.fontSizeInput.value = size;
  syncToggle(controls.boldToggle, !!s.bold);
  syncToggle(controls.italicToggle, !!s.italic);
  syncToggle(controls.underlineToggle, !!s.underline);
}
