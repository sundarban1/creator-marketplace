import type { ImageSourcePropType } from 'react-native';

export type PaymentMethodId = 'esewa' | 'khalti' | 'fonepay';

export const PAYMENT_METHOD_IMAGES: Record<PaymentMethodId, ImageSourcePropType> = {
  esewa:   require('@/assets/images/payments/esewa.jpeg'),
  khalti:  require('@/assets/images/payments/khalti.png'),
  fonepay: require('@/assets/images/payments/fonepay.png'),
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  esewa:   'eSewa',
  khalti:  'Khalti',
  fonepay: 'Fonepay',
};

export function isPaymentMethodId(id: string): id is PaymentMethodId {
  return id === 'esewa' || id === 'khalti' || id === 'fonepay';
}
