export type ChartLayoutMessage = {
  type: 'hearcap:layout-change';
  view: 'catalog' | 'asset-open';
  density: number;
};

const registeredFrames = new Set<HTMLIFrameElement>();

export function registerChartFrame(frame: HTMLIFrameElement) {
  registeredFrames.add(frame);
  return () => {
    registeredFrames.delete(frame);
  };
}

export function postMessageToFrame(frame: HTMLIFrameElement | null, message: ChartLayoutMessage) {
  try {
    frame?.contentWindow?.postMessage(message, '*');
  } catch {
    // Ignore cross-document issues silently
  }
}

export function broadcastChartMessage(message: ChartLayoutMessage) {
  registeredFrames.forEach((frame) => {
    postMessageToFrame(frame, message);
  });
}
