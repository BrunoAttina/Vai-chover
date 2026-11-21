export const colors = {
  background: '#F4F8FB',
  surface: '#FFFFFF',
  primary: '#1E6FD9',
  primaryText: '#FFFFFF',
  text: '#14212B',
  textMuted: '#4A5A68',
  border: '#C9D6E2',
  danger: '#B3261E',
  success: '#1B7F3B',
  warning: '#8A5A00',
  bar: '#5B9BEA',
  barEmpty: '#E3ECF5',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  subtitle: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 14, color: colors.textMuted },
} as const;

export const radius = { sm: 6, md: 12 } as const;
