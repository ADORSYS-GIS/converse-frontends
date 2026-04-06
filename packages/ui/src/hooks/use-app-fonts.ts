import { useEffect } from 'react';
import { useFonts } from 'expo-font';

export enum AppFont {
  BakbakOne = 'BakbakOne-Regular',
  EricaOne = 'EricaOne-Regular',
  MontserratRegular = 'Montserrat-Regular',
  MontserratSemiBold = 'Montserrat-SemiBold',
}

export function useAppFonts(fontSources: Record<string, any>) {
  const [loaded, error] = useFonts(fontSources);

  useEffect(() => {
    if (error) {
      console.warn('Font loading failed, falling back to system fonts:', error);
    }
  }, [error]);

  // Return true if loaded OR if there was an error (to proceed anyway)
  return loaded || !!error;
}
