import { colors, spacing } from '../../../tokens';

export function ToolBar() {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                background: colors.background.secondary,
                borderRight: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: spacing.md,
                gap: spacing.lg,
                color: colors.text.secondary,
            }}
        >
            {/* Placeholder Icons */}
            <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
            <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
            <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
            <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
            <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
        </div>
    );
}
