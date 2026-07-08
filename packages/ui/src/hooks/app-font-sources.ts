import { AppFont } from './use-app-fonts';

/**
 * The design system's brand fonts, owned by this package because the Button and
 * Heading components hardcode these families (see AppFont). Consumers load them
 * with useAppFonts(APP_FONT_SOURCES) rather than wiring their own font paths, so
 * the font files and the family names that reference them stay in one place.
 *
 * Storybook loads the same files via @font-face in global.css (it renders
 * components in isolation without the app's root layout, so it can't call
 * useAppFonts) — the font-family names there must match the AppFont values.
 */
export const APP_FONT_SOURCES = {
  [AppFont.BakbakOne]: require('../assets/fonts/BakbakOne_400Regular.ttf'),
  [AppFont.EricaOne]: require('../assets/fonts/EricaOne_400Regular.ttf'),
  [AppFont.MontserratRegular]: require('../assets/fonts/Montserrat_400Regular.ttf'),
  [AppFont.MontserratSemiBold]: require('../assets/fonts/Montserrat_600SemiBold.ttf'),
};
