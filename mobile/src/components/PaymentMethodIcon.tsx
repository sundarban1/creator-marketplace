import { Image, StyleSheet, Text, View } from 'react-native';
import { PAYMENT_METHOD_IMAGES, isPaymentMethodId } from '@/utilities/paymentMethods';

type Props = {
  method: string;
  label?: string;
  iconUrl?: string | null;
  color?: string;
  size?: number;
};

// eSewa/Khalti/Fonepay ship bundled locally (opaque JPEG and transparent PNG with
// their own baked-in brand shapes/colors) so they render instantly with no network
// round trip. Any other method — added by an admin from the dashboard — falls back
// to its uploaded iconUrl, and finally to a plain color-and-initial badge if that's
// missing too, so this never silently renders nothing for a method the app doesn't
// know about ahead of time.
export function PaymentMethodIcon({ method, label, iconUrl, color = '#6B7280', size = 36 }: Props) {
  const padding = Math.round(size * 0.1);
  const source = isPaymentMethodId(method) ? PAYMENT_METHOD_IMAGES[method] : iconUrl ? { uri: iconUrl } : null;

  if (!source) {
    const initial = (label ?? method).trim().charAt(0).toUpperCase();
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: color + '26' }]}>
        <Text style={{ color, fontSize: size * 0.42, fontWeight: '700' }}>{initial}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28, padding }]}>
      <Image source={source} resizeMode="contain" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
