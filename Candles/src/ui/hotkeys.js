
const TIMEFRAME_KEYS = {
  Digit1: "1m",
  Digit2: "5m",
  Digit3: "15m",
  Digit4: "1h",
  Digit5: "4h",
  Digit6: "1d",
};

const TOOL_KEYS = {
  KeyT: "trendline-pro",
  KeyF: "fibonacci",
  KeyH: "hline",
  KeyV: "vline",
  KeyR: "rect",
};

const NAVIGATION_STEP = 12;
const SCALE_STEP = 0.08;

function isTypingInInput(event) {
  const target = event.target;
  if (!target) return false;
  const tag = target.tagName;
  const editable =
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT";
  return editable;
}

function adjustPan(direction) {
  const controller = window?.chartController;
  if (!controller || typeof controller.scrollToEnd !== "function") {
    return;
  }
  const delta = direction === "left" ? -NAVIGATION_STEP : NAVIGATION_STEP;
  if (typeof window?.state !== "undefined") {
    state.targetViewportIndex += delta / getBarSpacing();
    invalidateViewportCaches();
    scheduleRender();
  }
}

function adjustScale(verticalDirection) {
  const increase = verticalDirection === "up" ? 1 : -1;
  const nextScale = clamp(state.scale + SCALE_STEP * increase, 0.35, 6);
  if (Math.abs(nextScale - state.scale) <= 1e-4) {
    return;
  }
  state.scale = nextScale;
  state.targetScale = nextScale;
  invalidateViewportCaches();
  scheduleRender();
}

function handleNavigationKeys(event) {
  switch (event.code) {
    case "ArrowLeft":
      adjustPan("left");
      return true;
    case "ArrowRight":
      adjustPan("right");
      return true;
    case "ArrowUp":
      adjustScale("up");
      return true;
    case "ArrowDown":
      adjustScale("down");
      return true;
    default:
      return false;
  }
}

function handleToolKeys(event) {
  const tool = TOOL_KEYS[event.code];
  if (!tool) {
    return false;
  }
  window?.chartController?.setActiveDrawingTool(tool);
  return true;
}

function handleActionKeys(event) {
  if (event.code === "Escape") {
    window?.chartController?.setActiveDrawingTool("none");
    return true;
  }
  if (event.code === "Delete") {
    window?.chartController?.deleteSelectedDrawingTool();
    return true;
  }
  if (event.code === "KeyD" && !event.ctrlKey && !event.metaKey) {
    window?.chartController?.duplicateSelectedDrawingTool();
    return true;
  }
  if (event.code === "KeyI") {
    window?.chartController?.toggleAllIndicators?.();
    return true;
  }
  if (event.code === "KeyC") {
    window?.chartController?.toggleCinemaMode?.();
    return true;
  }
  if (event.code === "KeyM") {
    const nextMode = state.visualMode === "advanced" ? "basic" : "advanced";
    applyVisualMode(nextMode);
    return true;
  }
  if (event.ctrlKey || event.metaKey) {
    if (event.code === "KeyZ" && event.shiftKey) {
      window?.chartController?.redo?.();
      return true;
    }
    if (event.code === "KeyZ") {
      window?.chartController?.undo?.();
      return true;
    }
  }
  return false;
}

function handleTimeframeKeys(event) {
  const timeframe = TIMEFRAME_KEYS[event.code];
  if (!timeframe) {
    return false;
  }
  window?.chartController?.setTimeframe(timeframe);
  return true;
}

function handleHotkeys(event) {
  if (event.defaultPrevented) {
    return;
  }
  if (isTypingInInput(event)) {
    return;
  }
  let handled = false;
  handled = handleNavigationKeys(event) || handled;
  handled = handleToolKeys(event) || handled;
  handled = handleActionKeys(event) || handled;
  handled = handleTimeframeKeys(event) || handled;
  if (handled) {
    event.preventDefault();
  }
}

export function initializeHotkeys() {
  document.addEventListener("keydown", handleHotkeys);
}
