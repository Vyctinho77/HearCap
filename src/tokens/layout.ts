export const layout = {
  sidebarWidth: '417px',
  rightPanelWidth: '417px',
  playerHeight: '90px',
  borderRadius: '8px',
  topbarGap: '14px',
  searchWidth: '640px',
} as const;

export type LayoutToken = typeof layout;
