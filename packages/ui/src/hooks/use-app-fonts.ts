import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';

export enum AppFont {
  BakbakOne = 'BakbakOne-Regular',
  EricaOne = 'EricaOne-Regular',
  MontserratRegular = 'Montserrat-Regular',
  MontserratSemiBold = 'Montserrat-SemiBold',
}

const FONT_LOADING_TIMEOUT_MS = 5000;

export function useAppFonts(fontSources: Record<string, any>) {
  const [loaded, error] = useFonts(fontSources);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded || error) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
      console.warn('Font loading timed out, proceeding with system fonts');
    }, FONT_LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loaded, error]);

  // Return true if loaded OR if there was an error OR if it timed out
  return loaded || !!error || timedOut;
}
