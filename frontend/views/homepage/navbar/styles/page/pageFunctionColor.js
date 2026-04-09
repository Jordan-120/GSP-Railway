// homepage/navbar/styles/page/pageFunctionColor.js
// Controls the background of the currently selected widget.

let activeWidget = null;

function cssColorToHex(color) {
  if (!color) return '#ffffff';
  const trimmed = color.trim();

  if (trimmed[0] === '#') {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed;
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/i);
  if (!rgbMatch) return '#ffffff';

  const toHex = (value) => {
    const n = parseInt(value, 10);
    const h = n.toString(16);
    return h.length === 1 ? `0${h}` : h;
  };

  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
}

function paintElement(el, color) {
  if (!el) return;
  el.style.background = color;
  el.style.backgroundColor = color;
  el.style.backgroundImage = 'none';
}

function getColorTargets(widget) {
  if (!widget) return [];

  const selectors = [
    '.gs-widget-header',
    '.gs-widget-body',
    '.gs-widget-stack',
    '.gs-widget-accordion-section',
    '.gs-widget-accordion-section > summary',
    '.gs-widget-accordion-body',
    '.tabs-header',
    '.tabs-content-shell',
    '.tab-content',
    '.checkbox-row',
    '.checkbox-group',
    '.dropdown-option-field',
    '.dropdown-option-notes',
    '.progress-bar-container',
    '.search-bubble-hint',
  ];

  const seen = new Set([widget]);
  const targets = [widget];

  selectors.forEach((selector) => {
    widget.querySelectorAll(selector).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      targets.push(el);
    });
  });

  return targets;
}

function applyWidgetColor(widget, color) {
  if (!widget) return;

  widget.dataset.widgetBgColor = color;
  getColorTargets(widget).forEach((el) => paintElement(el, color));
}

function getWidgetColor(widget) {
  if (!widget) return '#ffffff';

  const saved = widget.dataset.widgetBgColor;
  if (saved) return saved;

  const inline = widget.style.backgroundColor || widget.style.background || widget.querySelector('.gs-widget-body')?.style.backgroundColor;
  return cssColorToHex(inline || '#ffffff');
}

function refreshWidgetColor(widget) {
  if (!widget) return;
  applyWidgetColor(widget, getWidgetColor(widget));
}

export function refreshWidgetColorsInCanvas(root = document) {
  root.querySelectorAll?.('.builder-widget').forEach((widget) => {
    if (widget.dataset.widgetBgColor || widget.style.backgroundColor || widget.style.background) {
      refreshWidgetColor(widget);
    }
  });
}

export function setupPageFunctionColorControls(widgetBgInput) {
  if (!widgetBgInput) return;

  function syncWidgetColorUI() {
    if (activeWidget && document.body.contains(activeWidget)) {
      widgetBgInput.value = getWidgetColor(activeWidget);
      widgetBgInput.disabled = false;
      refreshWidgetColor(activeWidget);
      return;
    }

    activeWidget = null;
    widgetBgInput.value = '#ffffff';
    widgetBgInput.disabled = true;
  }

  function applySelectedColor() {
    if (!activeWidget) return;
    const val = widgetBgInput.value || '#ffffff';
    applyWidgetColor(activeWidget, val);
  }

  widgetBgInput.addEventListener('input', applySelectedColor);
  widgetBgInput.addEventListener('change', applySelectedColor);

  document.addEventListener('widgetSelected', (e) => {
    activeWidget = e.detail?.widget || null;
    syncWidgetColorUI();
  });

  document.addEventListener('pageChanged', () => {
    activeWidget = null;
    syncWidgetColorUI();
    refreshWidgetColorsInCanvas(document.getElementById('builderCanvas') || document);
  });

  document.addEventListener('templateChanged', () => {
    activeWidget = null;
    syncWidgetColorUI();
    refreshWidgetColorsInCanvas(document.getElementById('builderCanvas') || document);
  });

  syncWidgetColorUI();
}
