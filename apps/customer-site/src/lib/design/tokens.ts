export const designTokens = {
  color: {
    brand: {
      ink: '#081328',
      primary: '#2F5CDB',
      primaryStrong: '#143B9F',
      accent: '#8BB4FF',
      soft: '#F4F7FF',
    },
    surface: {
      page: '#F8FAFF',
      base: '#FFFFFF',
      subtle: '#EEF3FF',
      elevated: '#FFFFFF',
      inverse: '#081328',
    },
    text: {
      primary: '#111E39',
      secondary: '#334665',
      muted: '#687894',
      inverse: '#FFFFFF',
      link: '#2F5CDB',
    },
    border: {
      subtle: '#DCE5F7',
      default: '#CBD8F0',
      strong: '#AFC2E8',
      inverse: 'rgba(255, 255, 255, 0.18)',
    },
    state: {
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#2563EB',
    },
  },
  radius: {
    sm: '0.5rem',
    md: '0.875rem',
    lg: '1.25rem',
    xl: '1.75rem',
    pill: '9999px',
  },
  spacing: {
    sectionY: 'clamp(3rem, 6vw, 6rem)',
    sectionX: 'clamp(1rem, 3vw, 2.5rem)',
    contentMax: '90rem',
  },
  motion: {
    fast: 160,
    medium: 260,
    slow: 420,
    easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingEmphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  typography: {
    display: {
      family: 'var(--font-heading), "Avenir Next", "Trebuchet MS", sans-serif',
      weight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1.02,
    },
    heading: {
      family: 'var(--font-heading), "Avenir Next", "Trebuchet MS", sans-serif',
      weight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.1,
    },
    body: {
      family: 'var(--font-body), system-ui, -apple-system, "Segoe UI", sans-serif',
      weight: 400,
      letterSpacing: '0',
      lineHeight: 1.6,
    },
  },
} as const;

export type DesignTokens = typeof designTokens;

