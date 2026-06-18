import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '@/utilities/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastData = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastCtx = {
  show:    (data: ToastData) => void;
  success: (message: string, title?: string) => void;
  error:   (message: string, title?: string) => void;
  info:    (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT: Record<ToastVariant, { bg: string; border: string; icon: string; textColor: string; titleColor: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', icon: '✅', textColor: '#166534', titleColor: '#15803D' },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', icon: '⛔', textColor: '#991B1B', titleColor: '#DC2626' },
  info:    { bg: '#EEF2FF', border: '#A5B4FC', icon: 'ℹ️', textColor: '#3730A3', titleColor: '#4F46E5' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', icon: '⚠️', textColor: '#92400E', titleColor: '#D97706' },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastCtx>({
  show:    () => {},
  success: () => {},
  error:   () => {},
  info:    () => {},
  warning: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastData | null>(null);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 220, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.setValue(0);
    translateY.setValue(-16);
    setToast(data);

    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, speed: 28, bounciness: 4, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(dismiss, data.duration ?? 3200);
  }, [opacity, translateY, dismiss]);

  const success = useCallback((message: string, title?: string) => show({ message, title, variant: 'success' }), [show]);
  const error   = useCallback((message: string, title?: string) => show({ message, title, variant: 'error'   }), [show]);
  const info    = useCallback((message: string, title?: string) => show({ message, title, variant: 'info'    }), [show]);
  const warning = useCallback((message: string, title?: string) => show({ message, title, variant: 'warning' }), [show]);

  const cfg = VARIANT[toast?.variant ?? 'info'];

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { top: insets.top + 10, backgroundColor: cfg.bg, borderColor: cfg.border, opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="box-none">
          <Pressable style={styles.inner} onPress={dismiss}>
            <Text style={styles.icon}>{cfg.icon}</Text>
            <View style={styles.texts}>
              {toast.title ? (
                <Text style={[styles.title, { color: cfg.titleColor }]}>{toast.title}</Text>
              ) : null}
              <Text style={[styles.message, { color: cfg.textColor }]}>{toast.message}</Text>
            </View>
            <Text style={[styles.dismiss, { color: cfg.textColor }]}>✕</Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  return useContext(ToastContext);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  inner:   { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  icon:    { fontSize: 17, marginTop: 1 },
  texts:   { flex: 1 },
  title:   { fontSize: 13, fontWeight: '700', marginBottom: 2, fontFamily: F.bold },
  message: { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  dismiss: { fontSize: 12, fontWeight: '700', opacity: 0.6, paddingTop: 2, fontFamily: F.bold },
});
