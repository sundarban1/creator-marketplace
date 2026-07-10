import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

interface RangeDropdownProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function RangeDropdown<T extends string>({ value, options, onChange }: RangeDropdownProps<T>) {
  const C = useAppColors();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const selected = options.find((o) => o.value === value);

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get('window').width;
      setAnchor({ top: y + height + 6, right: windowWidth - (x + width) });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={openMenu}
        style={[s.trigger, { backgroundColor: C.surface, borderColor: C.border }]}
      >
        <Text style={[s.triggerText, { color: C.text }]}>{selected?.label ?? ''}</Text>
        <Ionicons name="chevron-down" size={15} color={C.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          {anchor && (
            <View
              style={[
                s.sheet,
                { top: anchor.top, right: anchor.right, backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    onPress={() => { onChange(o.value); setOpen(false); }}
                    style={[s.option, active && { backgroundColor: C.primaryLight }]}
                  >
                    <Text style={[s.optionText, { color: active ? C.brinjal1 : C.text, fontFamily: active ? F.semibold : F.regular }]}>
                      {o.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={C.brinjal1} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5,
  },
  triggerText: { fontSize: 13, fontFamily: F.semibold },
  backdrop: { flex: 1 },
  sheet: {
    position: 'absolute', minWidth: 168, borderRadius: 14, borderWidth: 1, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  optionText: { fontSize: 13 },
});
