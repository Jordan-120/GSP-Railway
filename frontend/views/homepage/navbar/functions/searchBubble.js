// homepage/navbar/functions/searchBubble.js
// Search bubble widget: typing in it highlights matching text on the canvas

const HIGHLIGHT_CLASS = "search-highlight";

export function createSearchBubbleWidget() {
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-search-widget search-bubble-widget";

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Search Bubble</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack">
      <div class="search-bubble">
        <input
          type="text"
          class="search-bubble-input"
          placeholder="Search text..."
        />
      </div>
      <p class="search-bubble-hint">
        Type to highlight matching text on this page.
      </p>
    </div>
  `;

  wireSearchBubble(widget);
  return widget;
}

function wireSearchBubble(widgetRoot) {
  const input = widgetRoot.querySelector(".search-bubble-input");
  if (!input) return;

  input.addEventListener("input", () => {
    const query = input.value || "";
    highlightMatchesOnCanvas(query, widgetRoot);
  });
}

export function rehydrateSearchBubbleWidget(widgetRoot) {
  wireSearchBubble(widgetRoot);
}

// ---------- Highlight logic ----------

function highlightMatchesOnCanvas(query, widgetRoot) {
  const canvas = document.getElementById("builderCanvas");
  if (!canvas) return;

  // 1. Clear existing highlights
  clearHighlights(canvas);

  const trimmed = query.trim();
  if (!trimmed) return;

  const qLower = trimmed.toLowerCase();
  const qLen = qLower.length;

  const walker = document.createTreeWalker(
    canvas,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName;
        if (
          tag === "SCRIPT" ||
          tag === "STYLE" ||
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT"
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        // Don't highlight inside the search bubble widget itself
        if (widgetRoot.contains(node)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false
  );

  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }

  nodesToProcess.forEach((textNode) => {
    highlightInTextNode(textNode, qLower, qLen);
  });
}

function clearHighlights(root) {
  const spans = root.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    const textNode = document.createTextNode(span.textContent || "");
    parent.replaceChild(textNode, span);
    parent.normalize();
  });
}

function highlightInTextNode(textNode, qLower, qLen) {
  const text = textNode.nodeValue;
  const lower = text.toLowerCase();

  let idx = 0;
  let matchIndex;
  const fragment = document.createDocumentFragment();

  while ((matchIndex = lower.indexOf(qLower, idx)) !== -1) {
    if (matchIndex > idx) {
      fragment.appendChild(document.createTextNode(text.slice(idx, matchIndex)));
    }

    const span = document.createElement("span");
    span.className = HIGHLIGHT_CLASS;
    span.textContent = text.slice(matchIndex, matchIndex + qLen);
    fragment.appendChild(span);

    idx = matchIndex + qLen;
  }

  if (idx < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(idx)));
  }

  const parent = textNode.parentNode;
  if (!parent) return;
  parent.replaceChild(fragment, textNode);
}
