import { Image, StyleSheet, View } from 'react-native';
import { PAYMENT_METHOD_IMAGES, isPaymentMethodId } from '@/utilities/paymentMethods';

type Props = {
  method: string;
  size?: number;
};

// eSewa/Khalti/Fonepay logos come as a mix of opaque JPEG and transparent PNG with
// their own baked-in brand shapes/colors — wrapping every one in the same white
// rounded card keeps them visually consistent wherever they're listed together.
export function PaymentMethodIcon({ method, size = 36 }: Props) {
  if (!isPaymentMethodId(method)) return null;
  const padding = Math.round(size * 0.1);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28, padding }]}>
      <Image
        source={PAYMENT_METHOD_IMAGES[method]}
        resizeMode="contain"
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
