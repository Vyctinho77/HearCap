import {
  getNextToolColor,
  deserializeStyle,
} from "./drawing-styles.js";
import {
  BaseDrawingTool,
  HANDLE_COLORS,
  HANDLE_RADIUS,
  HIT_TOLERANCE,
  applyLineStyle,
  distanceBetweenPoints,
  distancePointToSegment,
} from "./tools/base-tool.js";
import { TrendlineProTool } from "./tools/trendline-pro.js";
import { FibonacciRetracementTool } from "./tools/fibonacci.js";

const TOOL_TYPES = ["trendline-pro", "fibonacci", "hline", "vline", "rect"];

let toolCounter = 0;

function generateToolId(type) {
  toolCounter += 1;
  return `${type}-${Date.now().toString(36)}-${toolCounter}`;
}

function clonePoint(point = { index: 0, price: 0 }) {
  return { index: Number(point.index) || 0, price: Number(point.price) || 0 };
}

class HorizontalLineTool extends BaseDrawingTool {
  constructor(options = {}) {
    super("hline", options);
    this.price = Number(options.price) || 0;
  }

  begin(point) {
    this.price = point.price;
  }

  update(point) {
    this.price = point.price;
  }

  translate(deltaIndex, deltaPrice) {
    this.price += deltaPrice;
  }

  draw(ctx, transform, theme, selected) {
    if (!transform) return;
    const y = transform.priceToY(this.price);
    const { left, right } = transform.viewport;
    ctx.save();
    const style = this.style || {};
    ctx.globalAlpha = selected
      ? Math.min(1, (style.opacity ?? 1) + 0.2)
      : style.opacity ?? 1;
    const width = style.lineWidth || 2;
    ctx.lineWidth = selected ? width + 0.5 : width;
    applyLineStyle(ctx, style);
    ctx.strokeStyle = style.strokeColor || "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  hitTest(x, y, transform) {
    if (!transform) return null;
    const lineY = transform.priceToY(this.price);
    if (Math.abs(lineY - y) <= HIT_TOLERANCE) {
      return { action: "move" };
    }
    return null;
  }

  serialize() {
    return {
      ...super.serialize(),
      price: this.price,
    };
  }
}

class VerticalLineTool extends BaseDrawingTool {
  constructor(options = {}) {
    super("vline", options);
    this.index = Number(options.index) || 0;
  }

  begin(point) {
    this.index = point.index;
  }

  update(point) {
    this.index = point.index;
  }

  translate(deltaIndex) {
    this.index += deltaIndex;
  }

  draw(ctx, transform, theme, selected) {
    if (!transform) return;
    const x = transform.indexToX(this.index);
    const { top, bottom } = transform.viewport;
    ctx.save();
    const style = this.style || {};
    ctx.globalAlpha = selected
      ? Math.min(1, (style.opacity ?? 1) + 0.2)
      : style.opacity ?? 1;
    const width = style.lineWidth || 2;
    ctx.lineWidth = selected ? width + 0.5 : width;
    applyLineStyle(ctx, style);
    ctx.strokeStyle = style.strokeColor || "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  hitTest(x, y, transform) {
    if (!transform) return null;
    const lineX = transform.indexToX(this.index);
    if (Math.abs(lineX - x) <= HIT_TOLERANCE) {
      return { action: "move" };
    }
    return null;
  }

  serialize() {
    return {
      ...super.serialize(),
      index: this.index,
    };
  }
}

class RectangleTool extends BaseDrawingTool {
  constructor(options = {}) {
    super("rect", options);
    this.start = options.start ? clonePoint(options.start) : null;
    this.end = options.end ? clonePoint(options.end) : null;
    if (this.start && this.end) {
      this._normalize();
    }
  }

  begin(point) {
    this.start = clonePoint(point);
    this.end = clonePoint(point);
  }

  update(point) {
    this.end = clonePoint(point);
    this._normalize();
  }

  translate(deltaIndex, deltaPrice) {
    if (!this.start || !this.end) return;
    this.start.index += deltaIndex;
    this.end.index += deltaIndex;
    this.start.price += deltaPrice;
    this.end.price += deltaPrice;
  }

  updateHandle(handleIndex, worldPoint) {
    if (!this.start || !this.end) return;
    const target = clonePoint(worldPoint);
    switch (handleIndex) {
      case 0: // top-left
        this.start.index = target.index;
        this.start.price = target.price;
        break;
      case 1: // top-right
        this.end.index = target.index;
        this.start.price = target.price;
        break;
      case 2: // bottom-right
        this.end.index = target.index;
        this.end.price = target.price;
        break;
      case 3: // bottom-left
        this.start.index = target.index;
        this.end.price = target.price;
        break;
      default:
        break;
    }
    this._normalize();
  }

  _normalize() {
    if (!this.start || !this.end) return;
    const left = Math.min(this.start.index, this.end.index);
    const right = Math.max(this.start.index, this.end.index);
    const top = Math.max(this.start.price, this.end.price);
    const bottom = Math.min(this.start.price, this.end.price);
    this.start = { index: left, price: top };
    this.end = { index: right, price: bottom };
  }

  isValid() {
    if (!this.start || !this.end) return false;
    const width = Math.abs(this.end.index - this.start.index);
    const height = Math.abs(this.start.price - this.end.price);
    return width > 1e-3 && height > 1e-3;
  }

  getHandleWorldPoints() {
    if (!this.start || !this.end) return [];
    return [
      { index: this.start.index, price: this.start.price },
      { index: this.end.index, price: this.start.price },
      { index: this.end.index, price: this.end.price },
      { index: this.start.index, price: this.end.price },
    ];
  }

  draw(ctx, transform, theme, selected) {
    if (!transform || !this.start || !this.end) return;
    const style = this.style || {};
    const topLeft = transform.worldToPixels({
      index: this.start.index,
      price: this.start.price,
    });
    const bottomRight = transform.worldToPixels({
      index: this.end.index,
      price: this.end.price,
    });
    const left = Math.min(topLeft.x, bottomRight.x);
    const right = Math.max(topLeft.x, bottomRight.x);
    const top = Math.min(topLeft.y, bottomRight.y);
    const bottom = Math.max(topLeft.y, bottomRight.y);
    const width = Math.max(right - left, 1);
    const height = Math.max(bottom - top, 1);

    ctx.save();
    ctx.globalAlpha = selected
      ? Math.min(1, (style.opacity ?? 1) + 0.1)
      : style.opacity ?? 1;
    ctx.fillStyle = style.fillColor || "rgba(255,255,255,0.08)";
    ctx.strokeStyle = style.strokeColor || "#FFFFFF";
    const widthBase = style.lineWidth || 1.5;
    ctx.lineWidth = selected ? widthBase + 0.8 : widthBase;
    applyLineStyle(ctx, style);
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    if (selected) {
      ctx.globalAlpha = 1;
      const handles = this.getHandleWorldPoints().map((point) =>
        transform.worldToPixels(point)
      );
      ctx.fillStyle = HANDLE_COLORS.fill;
      ctx.strokeStyle = HANDLE_COLORS.stroke;
      handles.forEach((handle) => {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  hitTest(x, y, transform) {
    if (!transform || !this.start || !this.end) return null;
    const handles = this.getHandleWorldPoints().map((point) => ({
      world: point,
      pixel: transform.worldToPixels(point),
    }));
    for (let i = 0; i < handles.length; i += 1) {
      const handle = handles[i];
      const distance = distanceBetweenPoints(
        x,
        y,
        handle.pixel.x,
        handle.pixel.y
      );
      if (distance <= HIT_TOLERANCE) {
        return { action: "handle", handleIndex: i };
      }
    }
    const topLeft = transform.worldToPixels({
      index: this.start.index,
      price: this.start.price,
    });
    const bottomRight = transform.worldToPixels({
      index: this.end.index,
      price: this.end.price,
    });
    const left = Math.min(topLeft.x, bottomRight.x);
    const right = Math.max(topLeft.x, bottomRight.x);
    const top = Math.min(topLeft.y, bottomRight.y);
    const bottom = Math.max(topLeft.y, bottomRight.y);
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return { action: "move" };
    }
    return null;
  }

  serialize() {
    return {
      ...super.serialize(),
      start: clonePoint(this.start),
      end: clonePoint(this.end),
    };
  }
}

function deserializeTool(data) {
  if (!data || !data.type) return null;
  const payload = { ...data, style: deserializeStyle(data.style || {}) };
  switch (data.type) {
    case "trendline":
    case "trendline-pro":
      return new TrendlineProTool(payload);
    case "fibonacci":
      return new FibonacciRetracementTool(payload);
    case "hline":
      return new HorizontalLineTool(payload);
    case "vline":
      return new VerticalLineTool(payload);
    case "rect":
      return new RectangleTool(payload);
    default:
      return null;
  }
}

class DrawingManager {
  constructor(options = {}) {
    this.tools = [];
    this.activeTool = "none";
    this.selectedToolId = null;
    this.creatingTool = null;
    this.interaction = null;
    this.symbol = "";
    this.timeframe = "";
    this.requestRender =
      typeof options.requestRender === "function" ? options.requestRender : () => {};
    this.styleOverrides = options.styles || null;
    this.selectionListeners = new Set();
    if (typeof options.onSelectionChange === "function") {
      this.selectionListeners.add(options.onSelectionChange);
    }
  }

  setContext(symbol = "", timeframe = "") {
    const nextSymbol = symbol || "";
    const nextTimeframe = timeframe || "";
    const changed =
      nextSymbol !== this.symbol || nextTimeframe !== this.timeframe;
    this.symbol = nextSymbol;
    this.timeframe = nextTimeframe;
    if (changed) {
      this._loadFromStorage();
      this.requestRender();
    }
  }

  setActiveTool(type = "none") {
    if (type !== "none" && !TOOL_TYPES.includes(type)) {
      return;
    }
    this.activeTool = type;
    this.creatingTool = null;
    this.requestRender();
  }

  clearAll() {
    if (!this.tools.length) {
      return;
    }
    this.tools = [];
    this._setSelectedTool(null);
    this.creatingTool = null;
    this.interaction = null;
    this._persist();
    this.requestRender();
  }

  deleteSelected() {
    if (!this.selectedToolId) {
      return;
    }
    const index = this.tools.findIndex((tool) => tool.id === this.selectedToolId);
    if (index === -1) {
      return;
    }
    this.tools.splice(index, 1);
    this._setSelectedTool(null);
    this._persist();
    this.requestRender();
  }

  duplicateSelected() {
    if (!this.selectedToolId) {
      return false;
    }
    const tool = this._getToolById(this.selectedToolId);
    if (!tool) {
      return false;
    }
    const payload = tool.serialize();
    if (!payload) {
      return false;
    }
    payload.id = null;
    if (payload.anchor) {
      payload.anchor.index += 0.8;
      payload.range.index += 0.8;
    } else {
      payload.points = payload.points?.map((point) => ({
        ...point,
        index: Number(point.index) + 0.8,
      }));
    }
    const duplicate = deserializeTool(payload);
    if (!duplicate) {
      return false;
    }
    this._ensureToolId(duplicate, duplicate.type);
    this.tools.push(duplicate);
    this._setSelectedTool(duplicate);
    this._persist();
    this.requestRender();
    return true;
  }

  getSnapshot() {
    return this.tools.map((tool) => tool.serialize());
  }

  draw(ctx, { transform, theme }) {
    if (!ctx || !transform) {
      return;
    }
    for (let i = 0; i < this.tools.length; i += 1) {
      const tool = this.tools[i];
      tool.setSelected(tool.id === this.selectedToolId);
      tool.draw(ctx, transform, theme, tool.id === this.selectedToolId);
    }
  }

  handlePointerDown({ x, y, transform }) {
    if (!transform) {
      return false;
    }
    const world = transform.pixelsToWorld(x, y);
    if (this.activeTool !== "none") {
      this._beginCreation(world);
      return true;
    }
    const hit = this._hitTest(x, y, transform);
    if (hit) {
      this._setSelectedTool(hit.tool);
      this.interaction = {
        tool: hit.tool,
        mode: hit.action,
        handleIndex: hit.handleIndex ?? null,
        lastWorld: world,
      };
      this.requestRender();
      return true;
    }
    if (this.selectedToolId) {
      this._setSelectedTool(null);
      this.requestRender();
    }
    return false;
  }

  handlePointerMove({ x, y, transform }) {
    if (!transform) {
      return this.creatingTool !== null || this.interaction !== null;
    }
    const world = transform.pixelsToWorld(x, y);
    if (this.creatingTool?.tool) {
      this._updateCreation(world);
      return true;
    }
    if (this.interaction?.tool) {
      this._continueInteraction(world);
      return true;
    }
    return false;
  }

  handlePointerUp({ transform }) {
    let handled = false;
    if (this.creatingTool?.tool) {
      this._finalizeCreation();
      handled = true;
    }
    if (this.interaction) {
      this.interaction = null;
      this._persist();
      handled = true;
    }
    return handled;
  }

  _beginCreation(worldPoint) {
    const type = this.activeTool;
    const tool = this._createTool(type);
    if (!tool) {
      return;
    }
    this._ensureToolId(tool, type);
    this._applyInitialStyle(tool);
    if (typeof tool.begin === "function") {
      tool.begin(worldPoint);
    }
    this.tools.push(tool);
    this.creatingTool = { tool, type };
    this._setSelectedTool(tool);
    this.requestRender();
  }

  _updateCreation(worldPoint) {
    if (!this.creatingTool?.tool) {
      return;
    }
    if (typeof this.creatingTool.tool.update === "function") {
      this.creatingTool.tool.update(worldPoint);
    }
    this.requestRender();
  }

  _finalizeCreation() {
    if (!this.creatingTool?.tool) {
      return;
    }
    const tool = this.creatingTool.tool;
    if (!tool.isValid()) {
      this.tools = this.tools.filter((item) => item.id !== tool.id);
      if (this.selectedToolId === tool.id) {
        this._setSelectedTool(null);
      }
    }
    this.creatingTool = null;
    this._persist();
    this.requestRender();
    if (tool.isValid()) {
      this._setSelectedTool(tool);
    }
  }

  _hitTest(x, y, transform) {
    for (let i = this.tools.length - 1; i >= 0; i -= 1) {
      const tool = this.tools[i];
      const hit = tool.hitTest(x, y, transform);
      if (hit) {
        return { tool, ...hit };
      }
    }
    return null;
  }

  _continueInteraction(worldPoint) {
    if (!this.interaction?.tool) {
      return;
    }
    const mode = this.interaction.mode;
    const { tool } = this.interaction;
    if (mode === "move") {
      const deltaIndex = worldPoint.index - this.interaction.lastWorld.index;
      const deltaPrice = worldPoint.price - this.interaction.lastWorld.price;
      if (typeof tool.translate === "function") {
        tool.translate(deltaIndex, deltaPrice);
      }
      this.interaction.lastWorld = worldPoint;
    } else if (mode === "handle") {
      const handleIndex = this.interaction.handleIndex ?? 0;
      if (typeof tool.updateHandle === "function") {
        tool.updateHandle(handleIndex, worldPoint);
      } else if (typeof tool.update === "function") {
        tool.update(worldPoint);
      }
    }
    this.requestRender();
  }

  updateToolStyle(toolId, stylePatch = {}) {
    const tool = this._getToolById(toolId);
    if (!tool) {
      return false;
    }
    tool.updateStyle(stylePatch);
    this._persist();
    this.requestRender();
    return true;
  }

  updateSelectedToolStyle(stylePatch = {}) {
    if (!this.selectedToolId) {
      return false;
    }
    return this.updateToolStyle(this.selectedToolId, stylePatch);
  }

  updateToolSettings(toolId, settingsPatch = {}) {
    const tool = this._getToolById(toolId);
    if (!tool || typeof tool.updateSettings !== "function") {
      return false;
    }
    tool.updateSettings(settingsPatch);
    this._persist();
    this.requestRender();
    return true;
  }

  updateSelectedToolSettings(settingsPatch = {}) {
    if (!this.selectedToolId) {
      return false;
    }
    return this.updateToolSettings(this.selectedToolId, settingsPatch);
  }

  _createTool(type) {
    switch (type) {
      case "trendline":
      case "trendline-pro":
        return new TrendlineProTool();
      case "fibonacci":
        return new FibonacciRetracementTool();
      case "hline":
        return new HorizontalLineTool();
      case "vline":
        return new VerticalLineTool();
      case "rect":
        return new RectangleTool();
      default:
        return null;
    }
  }

  _ensureToolId(tool, type) {
    if (!tool) {
      return;
    }
    if (!tool.id) {
      tool.id = generateToolId(type || tool.type || "tool");
    }
  }

  _applyInitialStyle(tool, override) {
    if (!tool) {
      return;
    }
    const strokeColor =
      (override && override.strokeColor) || getNextToolColor();
    const styleSeed = {
      strokeColor,
      ...(override || {}),
    };
    tool.setStyle(styleSeed);
  }

  _getToolById(id) {
    if (!id) return null;
    return this.tools.find((tool) => tool.id === id) || null;
  }

  getSelectedTool() {
    return this._getToolById(this.selectedToolId);
  }

  onSelectionChange(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }
    this.selectionListeners.add(callback);
    return () => {
      this.selectionListeners.delete(callback);
    };
  }

  _setSelectedTool(tool) {
    const nextId = tool?.id ?? null;
    if (this.selectedToolId === nextId) {
      return;
    }
    this.selectedToolId = nextId;
    this._emitSelectionChange();
  }

  _emitSelectionChange() {
    const selected = this.getSelectedTool();
    this.selectionListeners.forEach((listener) => {
      try {
        listener(selected);
      } catch (error) {
        // ignore listener errors
      }
    });
  }

  _storageKey() {
    if (!this.symbol && !this.timeframe) {
      return null;
    }
    const symbolPart = this.symbol || "default";
    const timeframePart = this.timeframe || "default";
    return `hearcap:drawing-tools:${symbolPart}:${timeframePart}`;
  }

  _persist() {
    const key = this._storageKey();
    if (!key || typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(this.tools.map((tool) => tool.serialize()))
      );
    } catch {
      // ignore storage errors
    }
  }

  _loadFromStorage() {
    const key = this._storageKey();
    if (!key || typeof window === "undefined" || !window.localStorage) {
      this.tools = [];
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        this.tools = [];
        this.selectedToolId = null;
        return;
      }
      const parsed = JSON.parse(raw);
      const next = [];
      for (let i = 0; i < parsed.length; i += 1) {
        const tool = deserializeTool(parsed[i]);
        if (tool) {
          next.push(tool);
        }
      }
      this.tools = next;
      this.selectedToolId = null;
      this.creatingTool = null;
      this.interaction = null;
      this._emitSelectionChange();
    } catch {
      this.tools = [];
    }
  }
}

export function createDrawingManager(options = {}) {
  return new DrawingManager(options);
}

export function getDrawingToolTypes() {
  return [...TOOL_TYPES];
}
