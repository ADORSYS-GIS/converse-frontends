import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { Asset } from 'expo-asset';
import LottieView from 'lottie-react-native';
import type { LottieViewProps } from 'lottie-react-native';

import { cn } from '../../cn';
import { lottieVariants } from './cva';
import type { LottieProps, LottieSource } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});

function isModuleSource(source: LottieSource): source is number {
  return typeof source === 'number';
}

export function Lottie({
  source,
  size,
  tone,
  containerProps,
  loop = true,
  autoPlay = true,
  ...props
}: LottieProps) {
  // `Asset.fromModule` is a synchronous, id-keyed lookup into expo-asset's own module registry
  // (get-or-create, memoized there -- safe to call during render, including twice under
  // StrictMode), so the case that's actually synchronous -- a module source whose asset is
  // already local (`localUri`/`uri` already cached from a prior download) -- is resolved during
  // render instead of via a post-commit effect. That was the only synchronous `setState` call
  // this component made in an effect body; the non-module branch below never needed state at
  // all (it was just echoing the prop), so it's now a plain derived value too.
  const moduleAsset = useMemo(
    () => (isModuleSource(source) ? Asset.fromModule(source) : undefined),
    [source]
  );
  const cachedModuleUri = moduleAsset ? (moduleAsset.localUri ?? moduleAsset.uri) : undefined;

  // Only the genuine download -- fetching an asset not yet cached locally -- stays in an effect:
  // fetching from an external system is exactly what effects are for. Deliberately NOT reset when
  // `source` changes to a different, not-yet-cached module: this preserves the pre-existing
  // behavior of keeping the previously-resolved animation on screen during the download instead
  // of flashing to nothing.
  const [downloadedSource, setDownloadedSource] = useState<LottieViewProps['source'] | undefined>(
    undefined
  );

  useEffect(() => {
    if (!moduleAsset || cachedModuleUri) {
      return;
    }

    let isMounted = true;
    moduleAsset
      .downloadAsync()
      .then(() => {
        const nextUri = moduleAsset.localUri ?? moduleAsset.uri;
        if (isMounted && nextUri) {
          setDownloadedSource({ uri: nextUri });
        }
      })
      .catch(() => {
        if (isMounted) {
          setDownloadedSource(undefined);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [moduleAsset, cachedModuleUri]);

  const resolvedSource: LottieViewProps['source'] | undefined = isModuleSource(source)
    ? cachedModuleUri
      ? { uri: cachedModuleUri }
      : downloadedSource
    : (source as any);

  const containerClassName = useMemo(() => cn(lottieVariants({ size, tone })), [size, tone]);

  return (
    <ViewBase className={containerClassName} {...containerProps}>
      <LottieView
        source={resolvedSource}
        autoPlay={autoPlay}
        loop={loop}
        style={styles.fill}
        {...props}
      />
    </ViewBase>
  );
}
