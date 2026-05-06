import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type AppIconName =
  | 'alert'
  | 'announcements'
  | 'arrow-left'
  | 'building'
  | 'camera'
  | 'check'
  | 'chevron-right'
  | 'dashboard'
  | 'documents'
  | 'eye'
  | 'eye-off'
  | 'finance'
  | 'gate'
  | 'home'
  | 'id'
  | 'issues'
  | 'more'
  | 'notifications'
  | 'polls'
  | 'plus'
  | 'privacy'
  | 'qr'
  | 'scanner'
  | 'settings'
  | 'shield'
  | 'units'
  | 'user'
  | 'visitors'
  | 'x';

type IconProps = {
  name: AppIconName;
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function Icon({
  name,
  color = 'currentColor',
  size = 24,
  strokeWidth = 2,
}: IconProps) {
  const strokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'alert' ? (
        <>
          <Path {...strokeProps} d="M12 9v4" />
          <Path {...strokeProps} d="M12 17h.01" />
          <Path {...strokeProps} d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </>
      ) : null}
      {name === 'announcements' ? (
        <>
          <Path {...strokeProps} d="M4 13V7a2 2 0 0 1 2-2h3l8-2v16l-8-2H6a2 2 0 0 1-2-2v-2Z" />
          <Path {...strokeProps} d="M9 17v3" />
          <Path {...strokeProps} d="M19 8a4 4 0 0 1 0 6" />
        </>
      ) : null}
      {name === 'arrow-left' ? (
        <>
          <Path {...strokeProps} d="M19 12H5" />
          <Path {...strokeProps} d="m12 19-7-7 7-7" />
        </>
      ) : null}
      {name === 'building' ? (
        <>
          <Rect {...strokeProps} x="4" y="3" width="16" height="18" rx="2" />
          <Path {...strokeProps} d="M9 21v-4h6v4" />
          <Path {...strokeProps} d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
        </>
      ) : null}
      {name === 'camera' || name === 'scanner' ? (
        <>
          <Path {...strokeProps} d="M14.5 5 13 3H8L6.5 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-5.5Z" />
          <Circle {...strokeProps} cx="12" cy="12" r="4" />
        </>
      ) : null}
      {name === 'check' ? <Path {...strokeProps} d="m20 6-11 11-5-5" /> : null}
      {name === 'chevron-right' ? <Path {...strokeProps} d="m9 18 6-6-6-6" /> : null}
      {name === 'dashboard' ? (
        <>
          <Rect {...strokeProps} x="3" y="3" width="7" height="9" rx="2" />
          <Rect {...strokeProps} x="14" y="3" width="7" height="5" rx="2" />
          <Rect {...strokeProps} x="14" y="12" width="7" height="9" rx="2" />
          <Rect {...strokeProps} x="3" y="16" width="7" height="5" rx="2" />
        </>
      ) : null}
      {name === 'documents' ? (
        <>
          <Path {...strokeProps} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <Path {...strokeProps} d="M14 3v5h4" />
          <Path {...strokeProps} d="M9 13h6M9 17h6" />
        </>
      ) : null}
      {name === 'eye' ? (
        <>
          <Path {...strokeProps} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <Circle {...strokeProps} cx="12" cy="12" r="3" />
        </>
      ) : null}
      {name === 'eye-off' ? (
        <>
          <Path {...strokeProps} d="m3 3 18 18" />
          <Path {...strokeProps} d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
          <Path {...strokeProps} d="M9.9 5.2A10.3 10.3 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.1 4.2" />
          <Path {...strokeProps} d="M6.1 6.8C3.5 8.7 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.3 3.6-.8" />
        </>
      ) : null}
      {name === 'finance' ? (
        <>
          <Rect {...strokeProps} x="3" y="6" width="18" height="13" rx="2" />
          <Path {...strokeProps} d="M3 10h18" />
          <Path {...strokeProps} d="M7 15h4" />
        </>
      ) : null}
      {name === 'gate' || name === 'home' ? (
        <>
          <Path {...strokeProps} d="m3 11 9-8 9 8" />
          <Path {...strokeProps} d="M5 10v10h14V10" />
          <Path {...strokeProps} d="M10 20v-6h4v6" />
        </>
      ) : null}
      {name === 'issues' ? (
        <>
          <Path {...strokeProps} d="M9 4h6l4 4v12H5V4h4Z" />
          <Path {...strokeProps} d="M14 4v5h5" />
          <Path {...strokeProps} d="M9 13h6M9 17h4" />
        </>
      ) : null}
      {name === 'id' ? (
        <>
          <Rect {...strokeProps} x="3" y="5" width="18" height="14" rx="2" />
          <Circle {...strokeProps} cx="9" cy="11" r="2" />
          <Path {...strokeProps} d="M6 16a3 3 0 0 1 6 0M14 10h4M14 14h3" />
        </>
      ) : null}
      {name === 'more' ? (
        <>
          <Circle {...strokeProps} cx="5" cy="12" r="1" />
          <Circle {...strokeProps} cx="12" cy="12" r="1" />
          <Circle {...strokeProps} cx="19" cy="12" r="1" />
        </>
      ) : null}
      {name === 'polls' ? (
        <>
          <Path {...strokeProps} d="M5 19V9" />
          <Path {...strokeProps} d="M12 19V5" />
          <Path {...strokeProps} d="M19 19v-7" />
          <Path {...strokeProps} d="M3 19h18" />
        </>
      ) : null}
      {name === 'notifications' ? (
        <>
          <Path {...strokeProps} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <Path {...strokeProps} d="M10 21h4" />
        </>
      ) : null}
      {name === 'plus' ? (
        <>
          <Path {...strokeProps} d="M12 5v14" />
          <Path {...strokeProps} d="M5 12h14" />
        </>
      ) : null}
      {name === 'privacy' ? (
        <>
          <Rect {...strokeProps} x="5" y="11" width="14" height="10" rx="2" />
          <Path {...strokeProps} d="M8 11V8a4 4 0 0 1 8 0v3" />
          <Path {...strokeProps} d="M12 15v2" />
        </>
      ) : null}
      {name === 'qr' ? (
        <>
          <Rect {...strokeProps} x="3" y="3" width="7" height="7" rx="1" />
          <Rect {...strokeProps} x="14" y="3" width="7" height="7" rx="1" />
          <Rect {...strokeProps} x="3" y="14" width="7" height="7" rx="1" />
          <Path {...strokeProps} d="M14 14h2v2h-2zM19 14h2M14 19h2M18 18h3v3" />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle {...strokeProps} cx="12" cy="12" r="3" />
          <Path {...strokeProps} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </>
      ) : null}
      {name === 'shield' ? (
        <Path {...strokeProps} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      ) : null}
      {name === 'units' ? (
        <>
          <Rect {...strokeProps} x="3" y="3" width="8" height="8" rx="2" />
          <Rect {...strokeProps} x="13" y="3" width="8" height="8" rx="2" />
          <Rect {...strokeProps} x="3" y="13" width="8" height="8" rx="2" />
          <Rect {...strokeProps} x="13" y="13" width="8" height="8" rx="2" />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle {...strokeProps} cx="12" cy="8" r="4" />
          <Path {...strokeProps} d="M4 21a8 8 0 0 1 16 0" />
        </>
      ) : null}
      {name === 'visitors' ? (
        <>
          <Circle {...strokeProps} cx="9" cy="8" r="4" />
          <Path {...strokeProps} d="M2 21a7 7 0 0 1 14 0" />
          <Path {...strokeProps} d="M17 11a3 3 0 1 0-1.5-5.6" />
          <Path {...strokeProps} d="M22 21a5 5 0 0 0-5-5" />
        </>
      ) : null}
      {name === 'x' ? (
        <>
          <Path {...strokeProps} d="M18 6 6 18" />
          <Path {...strokeProps} d="m6 6 12 12" />
        </>
      ) : null}
      {name === 'camera' ? <Polyline {...strokeProps} points="9 12 11 14 15 10" /> : null}
    </Svg>
  );
}
