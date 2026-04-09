// homepage/navbar/functions/viewFunctions.js
// Shared builder behavior + wiring for all function widgets

import { createAccordionWidget, rehydrateAccordionWidget } from './accordion.js';
import { createTabsWidget, rehydrateTabsWidget } from './multi-tabs.js';
import { createDropdownWidget, rehydrateDropdownWidget } from './dropdown.js';
import { createTextboxWidget, rehydrateTextboxWidget } from './textbox.js';
import { createCheckboxWidget, rehydrateCheckboxWidget } from './checkbox.js';
import { createProgressBarWidget, rehydrateProgressBarWidget } from './progressBar.js';
import { createSearchBubbleWidget, rehydrateSearchBubbleWidget } from './searchBubble.js';
import { refreshWidgetColorsInCanvas } from '../styles/page/pageFunctionColor.js';

export function setupFunctionPalette() {
  const items = document.querySelectorAll('.function-item');

  items.forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';

      const payload = {
        type: item.dataset.type || '',
      };

      const countInput = item.querySelector('.function-count-input');
      if (countInput) {
        payload.count = parseConfiguredCount(countInput.value, countInput.min, countInput.max);
      }

      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });
}

function parseConfiguredCount(rawValue, minValue = 1, maxValue = 10) {
  const min = parseInt(minValue, 10) || 1;
  const max = parseInt(maxValue, 10) || 10;
  const parsed = parseInt(rawValue, 10);

  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function parseDropPayload(rawData) {
  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData);
    if (parsed && typeof parsed === 'object' && parsed.type) {
      return parsed;
    }
  } catch (_error) {
    return { type: rawData };
  }

  return null;
}

export function setupBuilderCanvas() {
  const canvas = document.getElementById('builderCanvas');
  if (!canvas) return;

  canvas.addEventListener('mousedown', (e) => {
    const isCanvasClick = e.target === canvas || e.target.classList.contains('builder-placeholder');
    if (isCanvasClick) {
      clearWidgetSelection();
      stopInlineEditing();
    }
  });

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvas.classList.add('drag-over');
  });

  canvas.addEventListener('dragleave', (e) => {
    if (!canvas.contains(e.relatedTarget)) {
      canvas.classList.remove('drag-over');
    }
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    canvas.classList.remove('drag-over');

    const payload = parseDropPayload(e.dataTransfer.getData('text/plain'));
    if (!payload?.type) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addFunctionToCanvas(payload.type, x, y, payload);
  });
}

export function addFunctionToCanvas(type, x, y, config = {}) {
  const canvas = document.getElementById('builderCanvas');
  if (!canvas) return;

  const placeholder = canvas.querySelector('.builder-placeholder');
  if (placeholder) placeholder.remove();

  let widget;
  const configuredCount = parseConfiguredCount(config.count, 1, 10);

  switch (type) {
    case 'accordion':
      widget = createAccordionWidget(configuredCount);
      break;
    case 'tabs':
      widget = createTabsWidget(configuredCount);
      break;
    case 'dropdown':
      widget = createDropdownWidget(configuredCount);
      break;
    case 'textbox':
      widget = createTextboxWidget();
      break;
    case 'checkbox':
      widget = createCheckboxWidget(configuredCount);
      break;
    case 'progressBar':
      widget = createProgressBarWidget();
      break;
    case 'searchBubble':
      widget = createSearchBubbleWidget();
      break;
    default: {
      widget = document.createElement('div');
      widget.className = 'builder-widget';
      widget.textContent = `Unknown function type: ${type}`;
    }
  }

  canvas.appendChild(widget);

  widget.style.width = `${widget.offsetWidth}px`;
  widget.style.height = `${widget.offsetHeight}px`;

  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;
  const widgetWidth = widget.offsetWidth || 150;
  const widgetHeight = widget.offsetHeight || 50;

  refreshWidgetColorsInCanvas(widget);

  let left = x - widgetWidth / 2;
  let top = y - widgetHeight / 2;

  left = Math.max(0, Math.min(canvasWidth - widgetWidth, left));
  top = Math.max(0, Math.min(canvasHeight - widgetHeight, top));

  widget.style.left = `${left}px`;
  widget.style.top = `${top}px`;

  let resizeHandle = widget.querySelector('.resize-handle');
  if (!resizeHandle) {
    resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    widget.appendChild(resizeHandle);
  }

  makeWidgetDraggable(widget);
  makeWidgetResizable(widget, resizeHandle);
  enableInlineEditing(widget);
}

function isFormLikeTarget(target) {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') ||
    target.closest('.inline-editing')
  );
}

function makeWidgetDraggable(widget) {
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;
  let dragging = false;

  const canvas = document.getElementById('builderCanvas');
  if (!canvas) return;

  widget.addEventListener('mousedown', (e) => {
    if (isFormLikeTarget(e.target)) return;
    if (e.target.classList.contains('resize-handle')) return;

    stopInlineEditing();
    selectWidget(widget);

    dragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = widget.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    origLeft = rect.left - canvasRect.left;
    origTop = rect.top - canvasRect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault();
  });

  widget.addEventListener('click', (e) => {
    if (isFormLikeTarget(e.target)) return;
    selectWidget(widget);
  });

  function onMouseMove(e) {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = origLeft + dx;
    let newTop = origTop + dy;

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const widgetWidth = widget.offsetWidth;
    const widgetHeight = widget.offsetHeight;

    newLeft = Math.max(0, Math.min(canvasWidth - widgetWidth, newLeft));
    newTop = Math.max(0, Math.min(canvasHeight - widgetHeight, newTop));

    widget.style.left = `${newLeft}px`;
    widget.style.top = `${newTop}px`;
  }

  function onMouseUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

function makeWidgetResizable(widget, handle) {
  const canvas = document.getElementById('builderCanvas');
  if (!canvas || !handle) return;

  const cs = window.getComputedStyle(widget);
  const cssMinW = parseInt(cs.minWidth, 10);
  const cssMinH = parseInt(cs.minHeight, 10);
  const minWidth = Number.isNaN(cssMinW) ? 100 : cssMinW;
  const minHeight = Number.isNaN(cssMinH) ? 40 : cssMinH;

  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let resizing = false;

  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();

    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = widget.offsetWidth;
    startHeight = widget.offsetHeight;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!resizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newWidth = startWidth + dx;
    let newHeight = startHeight + dy;

    const canvasRect = canvas.getBoundingClientRect();
    const widgetRect = widget.getBoundingClientRect();
    const left = widgetRect.left - canvasRect.left;
    const top = widgetRect.top - canvasRect.top;

    const maxWidth = canvas.clientWidth - left;
    const maxHeight = canvas.clientHeight - top;

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    widget.style.width = `${newWidth}px`;
    widget.style.height = `${newHeight}px`;
  }

  function onMouseUp() {
    resizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

let selectedWidget = null;
let activeInlineEditor = null;

function clearWidgetSelection() {
  if (!selectedWidget) return;

  selectedWidget.classList.remove('selected-widget');
  selectedWidget = null;

  document.dispatchEvent(new CustomEvent('widgetSelected', { detail: { widget: null } }));
}

function selectWidget(widget) {
  if (selectedWidget && selectedWidget !== widget) {
    selectedWidget.classList.remove('selected-widget');
  }

  selectedWidget = widget;
  widget.classList.add('selected-widget');

  document.dispatchEvent(new CustomEvent('widgetSelected', { detail: { widget } }));
}

document.addEventListener('keydown', (e) => {
  if (!selectedWidget) return;

  const isEditing =
    e.target.isContentEditable ||
    e.target.tagName === 'INPUT' ||
    e.target.tagName === 'TEXTAREA' ||
    e.target.tagName === 'SELECT';

  if (isEditing) return;

  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    selectedWidget.remove();
    selectedWidget = null;

    document.dispatchEvent(new CustomEvent('widgetSelected', { detail: { widget: null } }));
  }

  if (e.key === 'Escape') {
    stopInlineEditing();
  }
});

function findEditableElement(startEl, widget) {
  const editableSelector = 'h1, h2, h3, h4, h5, h6, p, span, label, summary, button, .tab-content, .gs-widget-accordion-title';
  const candidate = startEl.closest(editableSelector);

  if (!candidate || !widget.contains(candidate)) return null;
  if (candidate.classList.contains('resize-handle')) return null;
  if (candidate.closest('.search-bubble')) return null;
  if (candidate.closest('.dropdown-option-field')?.querySelector('input') === candidate) return null;

  return candidate;
}

function stopInlineEditing() {
  if (!activeInlineEditor) return;
  activeInlineEditor.contentEditable = 'false';
  activeInlineEditor.classList.remove('inline-editing');
  activeInlineEditor = null;
}

function enableInlineEditing(widget) {
  widget.addEventListener('dblclick', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    if (e.target.classList.contains('resize-handle')) return;

    const editableEl = findEditableElement(e.target, widget);
    if (!editableEl) return;

    stopInlineEditing();
    selectWidget(widget);

    activeInlineEditor = editableEl;
    editableEl.contentEditable = 'true';
    editableEl.classList.add('inline-editing');
    editableEl.focus();

    const range = document.createRange();
    range.selectNodeContents(editableEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = (evt) => {
      const related = evt?.relatedTarget;
      if (related && (related.closest('.styles-controls') || related.closest('.font-style-toggles'))) {
        return;
      }
      stopInlineEditing();
      editableEl.removeEventListener('blur', finish);
      editableEl.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        stopInlineEditing();
        editableEl.removeEventListener('blur', finish);
        editableEl.removeEventListener('keydown', onKeyDown);
      }
    };

    editableEl.addEventListener('blur', finish);
    editableEl.addEventListener('keydown', onKeyDown);
  });
}

export function rehydrateBuilderWidgets() {
  const canvas = document.getElementById('builderCanvas');
  if (!canvas) return;

  stopInlineEditing();
  clearWidgetSelection();

  const widgets = canvas.querySelectorAll('.builder-widget');
  widgets.forEach((widget) => {
    let handle = widget.querySelector('.resize-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'resize-handle';
      widget.appendChild(handle);
    }

    makeWidgetDraggable(widget);
    makeWidgetResizable(widget, handle);
    enableInlineEditing(widget);

    if (widget.querySelector('.tab-btn')) {
      rehydrateTabsWidget(widget);
    }
    if (widget.querySelector('.dropdown-select')) {
      rehydrateDropdownWidget(widget);
    }
    if (widget.querySelector('details')) {
      rehydrateAccordionWidget(widget);
    }
    if (widget.querySelector("input[type='checkbox']")) {
      rehydrateCheckboxWidget(widget);
    }
    if (widget.querySelector('.progress-bar-container')) {
      rehydrateProgressBarWidget(widget);
    }
    if (widget.querySelector('.search-bubble-input')) {
      rehydrateSearchBubbleWidget(widget);
    }

    rehydrateTextboxWidget(widget);
  });

  refreshWidgetColorsInCanvas(canvas);
}
