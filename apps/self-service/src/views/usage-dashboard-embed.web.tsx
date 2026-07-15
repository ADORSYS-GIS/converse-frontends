import React from 'react';
import { View } from 'react-native';

export type UsageDashboardEmbedProps = {
  url: string;
  onOpenExternal: () => void;
};

/**
 * Web embed: the Grafana dashboard in an iframe filling the tab body.
 *
 * For this to actually render, Grafana must be served same-site as this app and
 * have `allow_embedding = true` (+ a CSP `frame-ancestors` allowing this origin);
 * otherwise `X-Frame-Options: deny` leaves the frame blank. That failure is not
 * observable from JS (cross-origin), so the parent view always surfaces an
 * "open in Grafana" action as the escape hatch.
 *
 * The iframe is authenticated by the browser's shared Keycloak SSO session, so
 * no token is ever placed in the URL.
 */
export function UsageDashboardEmbed({ url }: Readonly<UsageDashboardEmbedProps>) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      <iframe
        src={url}
        title="Usage dashboard"
        style={{ border: 'none', width: '100%', height: '100%' }}
        referrerPolicy="no-referrer"
      />
    </View>
  );
}
