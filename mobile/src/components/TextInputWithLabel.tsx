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
  clearable?: boolean;
};

// The one labeled text-input shape for the app — filled/tonal field with a circular
// icon badge and animated focus border, matching the style introduced on the login
// screen. Covers simple fields, textareas (via `multiline`), and password fields
// (via `secureToggle`); search boxes use the separate, unlabeled `SearchInput`.
export const TextInputWithLabel = forwardRef<TextInput, Props>(function TextInputWithLabel({
  label, error, hint, secureToggle, secureTextEntry, leftIcon, rightSlot, style, multiline,
  clearable = true, ...rest
}, ref) {
  const C = useAppColors();
  const [hidden,  setHidden]  = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const isDisabled = rest.editable === false;
  const showClear = clearable && !secureToggle && !multiline && !isDisabled && focused && !!rest.value;
  const charCount = typeof rest.value === 'string' ? rest.value.length : 0;
  const atLimit = typeof rest.maxLength === 'number' && charCount >= rest.maxLength;

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
        {showClear && (
          <Pressable
            onPress={() => rest.onChangeText?.('')}
            hitSlop={10}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
          >
            <FontAwesome5 name="times-circle" solid size={16} color={C.textSecondary} />
          </Pressable>
        )}
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={10}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <FontAwesome5 name={hidden ? 'eye' : 'eye-slash'} size={18} color={focused ? C.brinjal1 : C.textSecondary} />
          </Pressable>
        )}
      </Animated.View>

      {(error || hint || typeof rest.maxLength === 'number') && (
        <View style={styles.feedbackRow}>
          <View style={styles.feedbackLeft}>
            {error ? (
              <>
                <FontAwesome5 name="exclamation-circle" solid size={12} color={C.error} />
                <Text style={[styles.errorText, { color: C.error, fontFamily: F.medium }]}>{error}</Text>
              </>
            ) : hint ? (
              <Text style={[styles.hintText, { color: C.textSecondary, fontFamily: F.regular }]}>{hint}</Text>
            ) : null}
          </View>
          {typeof rest.maxLength === 'number' && (
            <Text style={[styles.charCount, { color: atLimit ? C.error : C.textSecondary, fontFamily: F.regular }]}>
              {charCount}/{rest.maxLength}
            </Text>
          )}
        </View>
      )}
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
  clearBtn:     { paddingHorizontal: 8 },
  feedbackRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  feedbackLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  errorText:    { fontSize: 11, flexShrink: 1 },
  hintText:     { fontSize: 11, paddingHorizontal: 2 },
  charCount:    { fontSize: 11, flexShrink: 0 },
});
