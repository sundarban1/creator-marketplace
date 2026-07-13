import { Ionicons } from '@expo/vector-icons';

// Instagram-style inline checkmark — rendered directly next to a name, distinct
// from the separate "Verified Business/Creator" chip row (that one reflects the
// admin's manual isVerified toggle; this one reflects the fully-derived signal:
// email + phone + approved documents all verified).
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color="#3B82F6" style={{ marginLeft: 4 }} />;
}
