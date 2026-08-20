import { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS } from '@/utilities/constants';

type Props = TextInputProps & {
  // Decorative/trigger mode — the whole box becomes a button (used by tab-home
  // screens whose "search" row is really just a shortcut to the real search screen)
  // instead of an editable field; the inner TextInput stays inert.
  onPress?: () => void;
};

export const SearchInput = forwardRef<TextInput, Props>(function SearchInput(
  { value, onChangeText, placeholder, onPress, style, ...rest },
  ref,
) {
  const C = useAppColors();
  const isTrigger = !!onPress;

  const content = (
    <View style={[styles.row, { backgroundColor: C.primaryLight, borderColor: C.border }]}>
      <FontAwesome5 name="search" solid size={16} color={C.textSecondary} />
      <TextInput
        ref={ref}
        style={[styles.input, { color: C.text, fontFamily: F.regular }, style]}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        {...rest}
        editable={!isTrigger && rest.editable !== false}
        pointerEvents={isTrigger ? 'none' : 'auto'}
      />
      {!isTrigger && !!value && (
        <Pressable onPress={() => onChangeText?.('')} hitSlop={10}>
          <FontAwesome5 name="times-circle" solid size={16} color={C.textSecondary} />
        </Pressable>
      )}
    </View>
  );

  return isTrigger ? <Pressable onPress={onPress}>{content}</Pressable> : content;
});

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 15, height: 48 },
});
