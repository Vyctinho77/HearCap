import { broadcastChartMessage, postMessageToFrame, ChartLayoutMessage } from './chartMessenger';

export type LayoutView = 'catalog' | 'asset-open';
type LayoutListener = (view: LayoutView) => void;

const BODY_CLASSES = {
  catalog: 'catalog-view',
  asset: 'asset-view',
} as const;

const CATALOG_CHART_HEIGHT = 540;
const ASSET_CHART_HEIGHT = 720;

class LayoutState {
  private view: LayoutView = 'catalog';
  private density = 0.85;
  private listeners = new Set<LayoutListener>();

  constructor() {
    if (typeof document !== 'undefined') {
      document.body.classList.add(BODY_CLASSES.catalog);
      document.documentElement.style.setProperty('--ui-density', this.density.toString());
      document.documentElement.style.setProperty('--chart-height', `${CATALOG_CHART_HEIGHT}px`);
    }
  }

  getView() {
    return this.view;
  }

  getDensity() {
    return this.density;
  }

  getSnapshot(): ChartLayoutMessage {
    return {
      type: 'hearcap:layout-change',
      view: this.view,
      density: this.density,
    };
  }

  syncFrame(frame: HTMLIFrameElement) {
    postMessageToFrame(frame, this.getSnapshot());
  }

  subscribe(listener: LayoutListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  enterCatalog() {
    this.applyView('catalog');
  }

  enterAssetOpen() {
    this.applyView('asset-open');
  }

  private applyView(nextView: LayoutView) {
    this.view = nextView;
    this.applyBodyClasses(nextView);
    this.applyDensity(nextView);
    this.notify(nextView);
  }

  private applyBodyClasses(view: LayoutView) {
    if (typeof document === 'undefined') return;
    document.body.classList.remove(BODY_CLASSES.catalog, BODY_CLASSES.asset);
    document.body.classList.add(view === 'asset-open' ? BODY_CLASSES.asset : BODY_CLASSES.catalog);
  }

  private applyDensity(view: LayoutView) {
    const density = view === 'asset-open' ? 1 : this.computeCatalogDensity();
    this.density = density;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ui-density', density.toString());
      document.documentElement.style.setProperty(
        '--chart-height',
        `${view === 'asset-open' ? ASSET_CHART_HEIGHT : CATALOG_CHART_HEIGHT}px`
      );
    }
    broadcastChartMessage(this.getSnapshot());
  }

  private notify(view: LayoutView) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hearcap:view-change', {
          detail: { view, density: this.density },
        })
      );
    }
    this.listeners.forEach((listener) => listener(view));
  }

  private computeCatalogDensity() {
    if (typeof window === 'undefined') {
      return 0.85;
    }
    return window.innerWidth < 900 ? 0.75 : 0.85;
  }
}

const layoutState = new LayoutState();

export default layoutState;
