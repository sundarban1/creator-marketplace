import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
};

export function TextInputWithLabel({
  label, error, hint, secureToggle, secureTextEntry, leftIcon, style, ...rest
}: Props) {
  const C = useAppColors();
  const [hidden,  setHidden]  = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function onFocus() {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    rest.onFocus?.({} as never);
  }
  function onBlur() {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    rest.onBlur?.({} as never);
  }

  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? C.error : C.border, error ? C.error : C.brinjal1],
  });
  const bgColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.surface, error ? '#FFF5F5' : `${C.brinjal1}07`],
  });

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: focused ? C.brinjal1 : C.text, fontFamily: F.semibold }]}>
        {label}
      </Text>

      <Animated.View style={[styles.row, { borderColor, backgroundColor: bgColor }]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={17} color={focused ? C.brinjal1 : C.textSecondary} style={styles.leftIcon} />
        )}
        <TextInput
          style={[styles.input, { color: C.text, fontFamily: F.regular }, style]}
          placeholderTextColor={C.textSecondary + '80'}
          secureTextEntry={hidden}
          onFocus={onFocus}
          onBlur={onBlur}
          {...rest}
        />
        {secureToggle && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setHidden((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={19}
              color={focused ? C.brinjal1 : C.textSecondary}
            />
          </Pressable>
        )}
      </Animated.View>

      {error ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={[styles.errorText, { color: C.error, fontFamily: F.medium }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hintText, { color: C.textSecondary, fontFamily: F.regular }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { gap: 6 },
  label:       { fontSize: 13, letterSpacing: 0.2 },
  row:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 14, minHeight: 52 },
  leftIcon:    { marginRight: 8, flexShrink: 0 },
  input:       { flex: 1, fontSize: 15, paddingVertical: 14 },
  eyeBtn:      { paddingLeft: 10 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText:   { fontSize: 12 },
  hintText:    { fontSize: 12 },
});
