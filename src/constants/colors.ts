export const COLORS = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  text: '#191F28',
  sub: '#8B95A1',
  primary: '#3182F6',
  line: '#E5E8EB',
  amber: '#F59F00',
  blue: '#3182F6',
  red: '#F04452',
  gray: '#8B95A1',
  green: '#20C997',
  success: '#20C997',
  warning: '#F59F00',
  danger: '#F04452',
} as const;

export type ColorKey = keyof typeof COLORS;
