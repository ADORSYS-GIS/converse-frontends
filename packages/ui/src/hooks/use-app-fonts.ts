import { useMemo } from 'react';
import { useFonts } from 'expo-font';

type FontSource = number;

type FontRecord = Record<string, FontSource>;

export enum AppFont {
  BakbakOne = 'BakbakOne-Regular',
  EricaOne = 'EricaOne-Regular',
  MontserratRegular = 'Montserrat-Regular',
  MontserratSemiBold = 'Montserrat-SemiBold',
}

const FONT_SOURCES: Record<AppFont, FontSource> = {
  [AppFont.BakbakOne]: require('../assets/fonts/bakbak-one/bakbak-one-regular.ttf'),
  [AppFont.EricaOne]: require('../assets/fonts/erica-one/erica-one-regular.ttf'),
  [AppFont.MontserratRegular]: require('../assets/fonts/montserrat/montserrat-regular.ttf'),
  [AppFont.MontserratSemiBold]: require('../assets/fonts/montserrat/montserrat-semibold.ttf'),
};

export function useAppFonts(fonts: AppFont[]) {
  const selectedFonts = useMemo<FontRecord>(() => {
    const entries = fonts.map((font) => [font, FONT_SOURCES[font]] as const);
    return Object.fromEntries(entries);
  }, [fonts]);

  const [loaded] = useFonts(selectedFonts);
  return loaded;
}
