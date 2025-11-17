const TOOLBAR_TEMPLATE = `
  <div class="drawing-floating-toolbar" id="drawing-toolbar" aria-hidden="true">
    <div class="drawing-floating-toolbar__content"></div>
  </div>
`;

const COLOR_OPTIONS = ["#FFFFFF", "#F0F0F0", "#E0E0E0", "#CCCCCC", "#B8B8B8"];
const LINE_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dash" },
  { value: "dotted", label: "Dot" },
];

function createElementFromHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function getReferencePoint(tool, transform) {
  if (!tool || !transform) {
    return null;
  }
  if (typeof tool.getToolbarReference === "function") {
    const ref = tool.getToolbarReference(transform);
    if (ref) return ref;
  }
  if (typeof tool.getBoundingBoxInWorld === "function") {
    const bounds = tool.getBoundingBoxInWorld();
    if (bounds) {
      const mid = {
        index: (bounds.minIndex + bounds.maxIndex) / 2,
        price: (bounds.minPrice + bounds.maxPrice) / 2,
      };
      return transform.worldToPixels(mid);
    }
  }
  if (tool.anchor) {
    return transform.worldToPixels(tool.anchor);
  }
  if (Array.isArray(tool.points) && tool.points.length) {
    return transform.worldToPixels(tool.points[0]);
  }
  return null;
}

export function initDrawingToolbar(options = {}) {
  const root = document.body || document.documentElement;
  const toolbar = createElementFromHTML(TOOLBAR_TEMPLATE);
  root.appendChild(toolbar);

  const callbacks = {
    onStyleChange: typeof options.onStyleChange === "function" ? options.onStyleChange : () => {},
    onSettingsChange: typeof options.onSettingsChange === "function" ? options.onSettingsChange : () => {},
    onDuplicate: typeof options.onDuplicate === "function" ? options.onDuplicate : () => {},
    onDelete: typeof options.onDelete === "function" ? options.onDelete : () => {},
  };

  let currentTool = null;
  let currentContext = null;
  let visible = false;

  function setContent(node) {
    const content = toolbar.querySelector(".drawing-floating-toolbar__content");
    content.innerHTML = "";
    if (node) {
      content.appendChild(node);
    }
  }

  function buildSelect(items, value, onChange) {
    const select = document.createElement("select");
    select.className = "drawing-floating-toolbar__select";
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      if (item.value === value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      onChange(select.value);
    });
    return select;
  }

  function buildButton(label, { variant = "normal", onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "drawing-floating-toolbar__button";
    if (variant === "danger") {
      button.classList.add("drawing-floating-toolbar__button--danger");
    }
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function buildToggle(label, initialChecked, onToggle) {
    let checked = !!initialChecked;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "drawing-floating-toolbar__toggle";
    button.setAttribute("aria-pressed", checked ? "true" : "false");
    button.innerHTML = `<span>${label}</span>`;
    button.addEventListener("click", () => {
      checked = !checked;
      button.setAttribute("aria-pressed", checked ? "true" : "false");
      onToggle(checked);
    });
    return button;
  }

  function buildRange(value, onInput, { min = 0.3, max = 1, step = 0.05 } = {}) {
    const input = document.createElement("input");
    input.type = "range";
    input.className = "drawing-floating-toolbar__range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener("input", () => {
      const next = clamp(Number(input.value), min, max);
      onInput(next);
    });
    return input;
  }

  function buildColorOptions(selectedColor, onSelect) {
    const group = document.createElement("div");
    group.className = "drawing-floating-toolbar__group";
    COLOR_OPTIONS.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "drawing-floating-toolbar__button drawing-floating-toolbar__button--ghost";
      button.style.background = color;
      button.style.borderColor = "rgba(0,0,0,0.15)";
      if (color === selectedColor) {
        button.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.25)";
      }
      button.addEventListener("click", () => {
        Array.from(group.children).forEach((child) => {
          child.style.boxShadow = "none";
        });
        button.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.25)";
        onSelect(color);
      });
      group.appendChild(button);
    });
    return group;
  }

  function buildTrendlineContent(tool, actions) {
    const fragment = document.createDocumentFragment();
    const group = document.createElement("div");
    group.className = "drawing-floating-toolbar__group";

    const widthSelect = buildSelect(
      [1, 2, 3, 4].map((value) => ({ value, label: `${value}px` })),
      tool.style.lineWidth || 2,
      (value) => {
        actions.updateStyle({ lineWidth: Number(value) });
      }
    );
    group.appendChild(widthSelect);

    const styleSelect = buildSelect(
      LINE_STYLES,
      tool.style.lineStyle || "solid",
      (value) => {
        actions.updateStyle({ lineStyle: value });
      }
    );
    group.appendChild(styleSelect);

    const colorOptions = buildColorOptions(tool.style.strokeColor, (color) => {
      actions.updateStyle({ strokeColor: color });
    });

    fragment.appendChild(group);
    fragment.appendChild(colorOptions);
    fragment.appendChild(
      buildButton("Duplicate", { onClick: actions.duplicate })
    );
    fragment.appendChild(
      buildButton("Delete", { variant: "danger", onClick: actions.remove })
    );
    return fragment;
  }

  function buildFibonacciContent(tool, actions) {
    const fragment = document.createDocumentFragment();
    const toggles = document.createElement("div");
    toggles.className = "drawing-floating-toolbar__group";
    toggles.appendChild(
      buildToggle("Labels", tool.showLabels !== false, (value) => {
        actions.updateSettings({ showLabels: value });
      })
    );
    toggles.appendChild(
      buildToggle("Prices", tool.showPrices !== false, (value) => {
        actions.updateSettings({ showPrices: value });
      })
    );
    toggles.appendChild(
      buildToggle("Diagonal", !!tool.showDiagonal, (value) => {
        actions.updateSettings({ showDiagonal: value });
      })
    );
    fragment.appendChild(toggles);

    const opacityGroup = document.createElement("div");
    opacityGroup.className = "drawing-floating-toolbar__group";
    const opacityRange = buildRange(tool.style.opacity ?? 0.65, (value) => {
      actions.updateStyle({ opacity: value });
    });
    opacityGroup.appendChild(opacityRange);
    fragment.appendChild(opacityGroup);

    fragment.appendChild(
      buildButton("Duplicate", { onClick: actions.duplicate })
    );
    fragment.appendChild(
      buildButton("Delete", { variant: "danger", onClick: actions.remove })
    );
    return fragment;
  }

  function positionToolbar(reference, frameRect) {
    if (!reference || !root.contains(toolbar)) {
      return;
    }
    const rect = frameRect || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const width = toolbar.offsetWidth || 0;
    const height = toolbar.offsetHeight || 0;
    let left = rect.left + reference.x;
    let top = rect.top + reference.y - height - 12;

    left = clamp(left, rect.left + width / 2 + 8, rect.right - width / 2 - 8);
    top = clamp(top, rect.top + 8, rect.bottom - height - 8);

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
  }

  function renderToolbar(tool, context) {
    if (!tool || !context?.transform) {
      hideToolbar();
      return;
    }
    currentTool = tool;
    currentContext = context;
    const actions = {
      updateStyle: (partial) => callbacks.onStyleChange(tool.id, partial),
      updateSettings: (partial) => callbacks.onSettingsChange(tool.id, partial),
      duplicate: () => callbacks.onDuplicate(),
      remove: () => callbacks.onDelete(),
    };
    let content = null;
    if (tool.type === "trendline-pro") {
      content = buildTrendlineContent(tool, actions);
    } else if (tool.type === "fibonacci") {
      content = buildFibonacciContent(tool, actions);
    }
    if (!content) {
      hideToolbar();
      return;
    }
    setContent(content);
    toolbar.classList.add("drawing-floating-toolbar--visible");
    toolbar.setAttribute("aria-hidden", "false");
    visible = true;
    const reference = getReferencePoint(tool, context.transform);
    if (reference) {
      positionToolbar(reference, context.frameRect);
    }
  }

  function hideToolbar() {
    toolbar.classList.remove("drawing-floating-toolbar--visible");
    toolbar.setAttribute("aria-hidden", "true");
    visible = false;
    currentTool = null;
    currentContext = null;
  }

  function refreshToolbar(context) {
    if (!visible || !currentTool) {
      return;
    }
    if (context) {
      currentContext = { ...(currentContext || {}), ...context };
    }
    if (!currentContext?.transform) {
      hideToolbar();
      return;
    }
    const reference = getReferencePoint(currentTool, currentContext.transform);
    if (!reference) {
      hideToolbar();
      return;
    }
    positionToolbar(reference, currentContext.frameRect);
  }

  return {
    element: toolbar,
    update: renderToolbar,
    hide: hideToolbar,
    refresh: refreshToolbar,
  };
}
