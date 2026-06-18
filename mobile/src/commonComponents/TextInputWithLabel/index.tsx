import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export function TextInputWithLabel({ label, error, secureToggle, secureTextEntry, style, ...rest }: Props) {
  const C = useAppColors();
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: C.text }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: C.surface, borderColor: error ? C.error : C.border }]}>
        <TextInput
          style={[styles.input, { color: C.text }, style]}
          placeholderTextColor={C.textSecondary}
          secureTextEntry={hidden}
          {...rest}
        />
        {secureToggle && (
          <Pressable onPress={() => setHidden((v) => !v)} style={styles.toggle}>
            <Text style={[styles.toggleText, { color: C.brinjal1 }]}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: C.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, fontFamily: F.regular },
  toggle: { paddingLeft: 8 },
  toggleText: { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
  error: { fontSize: 12, fontFamily: F.regular },
});
