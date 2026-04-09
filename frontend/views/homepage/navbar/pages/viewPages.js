// homepage/navbar/pages/viewPages.js

import { getActiveTemplate } from '../templates/viewTemplates.js';
import { rehydrateBuilderWidgets } from '../functions/viewFunctions.js';

const MAX_PAGES = 10;
let activePageIndex = 0; // 0 = Home

export function setupPagesControls() {
  const addPageButton = document.getElementById('addPageButton');
  const renamePageButton = document.getElementById('renamePageButton');
  const savePageButton = document.getElementById('savePageButton');
  const deletePageButton = document.getElementById('deletePageButton');
  const pagesList = document.getElementById('pagesList');
  const canvas = document.getElementById('builderCanvas');

  if (!pagesList || !canvas) return;

  renderPagesList();
  loadActivePageIntoCanvas();

  if (addPageButton) {
    addPageButton.addEventListener('click', () => {
      const tpl = getActiveTemplate();
      if (!tpl) return;

      if (tpl.pages.length >= MAX_PAGES) {
        alert(`You can only have up to ${MAX_PAGES} pages per template.`);
        return;
      }

      saveCurrentPageContent();
      addPageToActiveTemplate();
      renderPagesList();
      loadActivePageIntoCanvas();
    });
  }

  if (renamePageButton) {
    renamePageButton.addEventListener('click', () => {
      const tpl = getActiveTemplate();
      if (!tpl) return;

      const page = tpl.pages[activePageIndex];
      if (!page) {
        alert('No active page to rename.');
        return;
      }

      const newName = prompt('Rename page:', page.name || 'Untitled Page');
      if (newName === null) return;

      const trimmed = newName.trim();
      if (!trimmed) {
        alert('Page name cannot be empty.');
        return;
      }

      page.name = trimmed;
      renderPagesList();
    });
  }

  if (savePageButton) {
    savePageButton.addEventListener('click', () => {
      saveCurrentPageContent();
      const tpl = getActiveTemplate();
      if (!tpl) return;
      const page = tpl.pages[activePageIndex];
      if (page) {
        alert(`Page "${page.name}" saved.`);
      }
    });
  }

  if (deletePageButton) {
    deletePageButton.addEventListener('click', () => {
      const tpl = getActiveTemplate();
      if (!tpl) return;

      const page = tpl.pages[activePageIndex];
      if (!page) {
        alert('No active page to delete.');
        return;
      }

      if (tpl.pages.length === 1) {
        alert('You must have at least one page in a template.');
        return;
      }

      const confirmed = confirm(`Are you sure you want to delete page "${page.name}"?`);
      if (!confirmed) return;

      tpl.pages.splice(activePageIndex, 1);

      if (activePageIndex >= tpl.pages.length) {
        activePageIndex = tpl.pages.length - 1;
      }
      if (activePageIndex < 0) activePageIndex = 0;

      renderPagesList();
      loadActivePageIntoCanvas();
    });
  }

  pagesList.addEventListener('click', (e) => {
    const item = e.target.closest('.page-item');
    if (!item) return;

    const index = parseInt(item.dataset.index, 10);
    if (Number.isNaN(index)) return;
    if (index === activePageIndex) return;

    saveCurrentPageContent();
    activePageIndex = index;
    renderPagesList();
    loadActivePageIntoCanvas();
  });

  document.addEventListener('beforeTemplateChange', () => {
    saveCurrentPageContent();
  });

  document.addEventListener('templateChanged', () => {
    activePageIndex = 0;
    renderPagesList();
    loadActivePageIntoCanvas();
  });
}

function getDefaultPageStyle() {
  return {
    backgroundColor: '#ffffff',
    height: '700px',
    width: '800px',
    gridEnabled: true,
  };
}

function renderPagesList() {
  const pagesList = document.getElementById('pagesList');
  const addPageButton = document.getElementById('addPageButton');
  const tpl = getActiveTemplate();
  if (!pagesList || !tpl) return;

  pagesList.innerHTML = tpl.pages
    .map(
      (p, index) => `
      <div
        class="page-item ${index === activePageIndex ? 'active' : ''}"
        data-index="${index}"
      >
        ${p.name}
      </div>
    `
    )
    .join('');

  if (addPageButton) {
    addPageButton.disabled = tpl.pages.length >= MAX_PAGES;
  }
}

function addPageToActiveTemplate() {
  const tpl = getActiveTemplate();
  if (!tpl) return;

  const pageNumber = tpl.pages.length + 1;
  const pageName = pageNumber === 1 ? 'Home' : `Page ${pageNumber}`;

  tpl.pages.push({
    name: pageName,
    content: '',
    style: getDefaultPageStyle(),
  });

  activePageIndex = tpl.pages.length - 1;
}

function saveCurrentPageContent() {
  const tpl = getActiveTemplate();
  const canvas = document.getElementById('builderCanvas');
  if (!tpl || !canvas) return;

  const page = tpl.pages[activePageIndex];
  if (!page) return;

  const prevStyle = page.style || getDefaultPageStyle();

  page.content = canvas.innerHTML;
  page.style = {
    ...prevStyle,
    backgroundColor: canvas.style.backgroundColor || prevStyle.backgroundColor,
    height: canvas.style.height || prevStyle.height,
    width: canvas.style.width || prevStyle.width,
    gridEnabled: canvas.classList.contains('grid-on'),
  };
}

function loadActivePageIntoCanvas() {
  const tpl = getActiveTemplate();
  const canvas = document.getElementById('builderCanvas');
  if (!tpl || !canvas) return;

  const page = tpl.pages[activePageIndex];
  if (!page) return;

  if (page.content && page.content.trim() !== '') {
    canvas.innerHTML = page.content;
  } else {
    canvas.innerHTML = `
      <p class="builder-placeholder">
        Drag functions from the left and drop them here.
      </p>
    `;
  }

  const style = { ...getDefaultPageStyle(), ...(page.style || {}) };
  page.style = style;

  canvas.style.background = style.backgroundColor;
  canvas.style.backgroundColor = style.backgroundColor;
  canvas.style.setProperty('--builder-canvas-bg', style.backgroundColor);
  canvas.style.height = style.height;
  canvas.style.width = style.width;

  if (style.gridEnabled === false) {
    canvas.classList.remove('grid-on');
  } else {
    canvas.classList.add('grid-on');
  }

  rehydrateBuilderWidgets();

  document.dispatchEvent(
    new CustomEvent('pageChanged', {
      detail: {
        pageIndex: activePageIndex,
      },
    })
  );
}

export function getCurrentPageStyle() {
  const tpl = getActiveTemplate();
  if (!tpl) return null;
  const page = tpl.pages[activePageIndex];
  if (!page) return null;
  return { ...getDefaultPageStyle(), ...(page.style || {}) };
}

export function setCurrentPageStyle(partial) {
  const tpl = getActiveTemplate();
  const canvas = document.getElementById('builderCanvas');
  if (!tpl || !canvas) return;

  const page = tpl.pages[activePageIndex];
  if (!page) return;

  const next = {
    ...getDefaultPageStyle(),
    ...(page.style || {}),
    ...partial,
  };
  page.style = next;

  canvas.style.background = next.backgroundColor;
  canvas.style.backgroundColor = next.backgroundColor;
  canvas.style.setProperty('--builder-canvas-bg', next.backgroundColor);
  canvas.style.height = next.height;
  canvas.style.width = next.width;

  if (next.gridEnabled) {
    canvas.classList.add('grid-on');
  } else {
    canvas.classList.remove('grid-on');
  }
}
