import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { Asset } from 'expo-asset';
import LottieView from 'lottie-react-native';

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
  const [resolvedSource, setResolvedSource] = useState<LottieSource>(source);

  useEffect(() => {
    let isMounted = true;

    if (isModuleSource(source)) {
      const asset = Asset.fromModule(source);
      const uri = asset.localUri ?? asset.uri;

      if (uri) {
        setResolvedSource({ uri });
      } else {
        asset
          .downloadAsync()
          .then(() => {
            const nextUri = asset.localUri ?? asset.uri;
            if (isMounted && nextUri) {
              setResolvedSource({ uri: nextUri });
            }
          })
          .catch(() => {
            if (isMounted) {
              setResolvedSource(source);
            }
          });
      }
    } else {
      setResolvedSource(source);
    }

    return () => {
      isMounted = false;
    };
  }, [source]);

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
