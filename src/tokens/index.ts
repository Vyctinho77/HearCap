import { colors } from './colors';
import { spacing } from './spacing';
import { layout } from './layout';

export * from './colors';
export * from './spacing';
export * from './layout';

export const generateCSSVariables = () => {
  return {
    '--bg-primary': colors.background.primary,
    '--bg-secondary': colors.background.secondary,
    '--bg-elevated': colors.background.elevated,
    '--bg-hover': colors.background.hover,
    '--text-primary': colors.text.primary,
    '--text-secondary': colors.text.secondary,
    '--accent': colors.accent,
    '--border': colors.border,
    '--spacing-xs': spacing.xs,
    '--spacing-sm': spacing.sm,
    '--spacing-md': spacing.md,
    '--spacing-lg': spacing.lg,
    '--spacing-xl': spacing.xl,
    '--sidebar-width': layout.sidebarWidth,
    '--right-panel-width': layout.rightPanelWidth,
    '--player-height': layout.playerHeight,
    '--border-radius': layout.borderRadius,
    '--topbar-gap': layout.topbarGap,
    '--search-bar-width': layout.searchWidth,
  };
};
