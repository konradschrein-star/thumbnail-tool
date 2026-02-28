// Shared style constants for dashboard components
// Following the inline style pattern from existing codebase

export const colors = {
  // Primary colors
  primary: '#000000',
  primaryHover: '#27272a',
  primaryLight: '#f4f4f5',

  // Status colors
  success: '#18181b',
  successLight: '#f4f4f5',
  error: '#000000',
  errorLight: '#fafafa',
  warning: '#27272a',
  warningLight: '#f4f4f5',

  // Neutral colors
  border: '#e0e0e0',
  borderDark: '#ccc',
  background: '#f9f9f9',
  backgroundDark: '#f0f0f0',
  text: '#333',
  textLight: '#666',
  textMuted: '#999',
  white: '#fff',

  // Danger
  danger: '#dc3545',
  dangerHover: '#c82333',
  dangerLight: '#f8d7da',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

export const commonStyles = {
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: borderRadius.md,
    border: 'none',
    fontSize: '1rem',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },

  buttonSmall: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
  },

  input: {
    padding: '0.625rem',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: '1rem',
    width: '100%',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },

  textarea: {
    padding: '0.625rem',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontSize: '1rem',
    width: '100%',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: '100px',
    boxSizing: 'border-box' as const,
  },

  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },

  modal: {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    content: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
    },
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },

  tableHeader: {
    backgroundColor: colors.backgroundDark,
    textAlign: 'left' as const,
    padding: '0.75rem',
    fontWeight: '600' as const,
    borderBottom: `2px solid ${colors.border}`,
  },

  tableCell: {
    padding: '0.75rem',
    borderBottom: `1px solid ${colors.border}`,
  },
};
