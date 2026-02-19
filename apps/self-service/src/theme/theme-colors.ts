import type { ColorSchemeName } from 'react-native';

const lightColors = {
  primary: 'rgb(29 91 255)',
  secondary: 'rgb(249 115 22)',
  accent: 'rgb(124 58 237)',
  error: 'rgb(239 68 68)',
  success: 'rgb(16 185 129)',
  ink: 'rgb(17 24 39)',
  soft: 'rgb(107 114 128)',
  subtle: 'rgb(156 163 175)',
  muted: 'rgb(247 247 248)',
  surface: 'rgb(255 255 255)',
  border: 'rgb(229 231 235)',
};

const darkColors = {
  primary: 'rgb(96 165 250)',
  secondary: 'rgb(251 146 60)',
  accent: 'rgb(167 139 250)',
  error: 'rgb(248 113 113)',
  success: 'rgb(52 211 153)',
  ink: 'rgb(243 244 246)',
  soft: 'rgb(209 213 219)',
  subtle: 'rgb(156 163 175)',
  muted: 'rgb(17 24 39)',
  surface: 'rgb(31 41 55)',
  border: 'rgb(55 65 81)',
};

export function getThemeColors(scheme: ColorSchemeName) {
  return scheme === 'dark' ? darkColors : lightColors;
}
