import type { ReactNode } from 'react';
import { View } from 'react-native';
import { MAX_CONTENT_WIDTH } from '@/utilities/constants';

// Caps content width on tablets / large-screen Android so cards and text
// lines don't stretch full-bleed — every phone width is comfortably under
// MAX_CONTENT_WIDTH, so this is a visual no-op there and only kicks in on
// tablet-class screens.
export function MaxWidthContainer({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}>
      {children}
    </View>
  );
}
