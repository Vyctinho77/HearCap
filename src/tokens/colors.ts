export const colors = {
  background: {
    primary: '#000000',
    secondary: '#121212',
    elevated: '#1a1a1a',
    hover: '#282828',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b3b3b3',
  },
  accent: '#1db954',
  border: '#282828',
} as const;

export type ColorToken = typeof colors;
