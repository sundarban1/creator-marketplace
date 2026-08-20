import { forwardRef, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS } from '@/utilities/constants';
import { withAlpha } from '@/utilities/color';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
  leftIcon?: keyof typeof FontAwesome5.glyphMap;
  rightSlot?: ReactNode;
};

// The one labeled text-input shape for the app — filled/tonal field with a circular
// icon badge and animated focus border, matching the style introduced on the login
// screen. Covers simple fields, textareas (via `multiline`), and password fields
// (via `secureToggle`); search boxes use the separate, unlabeled `SearchInput`.
export const TextInputWithLabel = forwardRef<TextInput, Props>(function TextInputWithLabel({
  label, error, hint, secureToggle, secureTextEntry, leftIcon, rightSlot, style, multiline, ...rest
}, ref) {
  const C = useAppColors();
  const [hidden,  setHidden]  = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const isDisabled = rest.editable === false;

  const onFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    rest.onFocus?.(e);
  };
  const onBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    rest.onBlur?.(e);
  };

  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? withAlpha(C.error, 0.35) : C.border, error ? C.error : C.brinjal1],
  });
  const backgroundColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.primaryLight, C.surface],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: C.text, fontFamily: F.semibold }]}>{label}</Text>
        {rightSlot}
      </View>

      <Animated.View style={[
        styles.row,
        { borderColor, backgroundColor },
        multiline && styles.rowMultiline,
        focused && !isDisabled && { shadowColor: C.brinjal1, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
        isDisabled && { backgroundColor: `${C.border}40`, borderColor: C.border },
      ]}>
        {leftIcon && (
          <View style={[styles.iconWrap, { backgroundColor: focused ? `${C.brinjal1}15` : C.border }]}>
            <FontAwesome5 name={leftIcon} size={16} color={focused ? C.brinjal1 : C.textSecondary} />
          </View>
        )}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: isDisabled ? C.textSecondary : C.text, fontFamily: F.regular },
            !leftIcon && styles.inputNoIcon,
            multiline && styles.inputMultiline,
            style,
          ]}
          placeholderTextColor={C.textSecondary}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          multiline={multiline}
          onFocus={onFocus}
          onBlur={onBlur}
          accessibilityLabel={label}
          accessibilityState={{ disabled: isDisabled }}
          {...rest}
        />
        {secureToggle && (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
            <FontAwesome5 name={hidden ? 'eye' : 'eye-slash'} size={18} color={focused ? C.brinjal1 : C.textSecondary} />
          </Pressable>
        )}
      </Animated.View>

      {error ? (
        <View style={styles.feedbackRow}>
          <FontAwesome5 name="exclamation-circle" solid size={12} color={C.error} />
          <Text style={[styles.errorText, { color: C.error, fontFamily: F.medium }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hintText, { color: C.textSecondary, fontFamily: F.regular }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper:      { gap: 6 },
  labelRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:        { fontSize: 13, letterSpacing: 0.2 },
  row:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 5, minHeight: 54, gap: 4 },
  rowMultiline: { alignItems: 'flex-start', paddingVertical: 6 },
  iconWrap:     { width: 38, height: 38, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginLeft: 4, flexShrink: 0 },
  input:        { flex: 1, minHeight: 50, paddingHorizontal: 10, fontSize: 15, textAlignVertical: 'center' },
  inputNoIcon:  { paddingLeft: 14 },
  inputMultiline: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  eyeBtn:       { paddingHorizontal: 12 },
  feedbackRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText:    { fontSize: 11 },
  hintText:     { fontSize: 11, paddingHorizontal: 2 },
});
