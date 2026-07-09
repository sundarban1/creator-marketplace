import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

// KeyboardAvoidingView is unreliable inside a transparent <Modal> on iOS —
// the modal presents in its own native layer, so KAV's own keyboard-height
// measurement often doesn't apply, and the keyboard can end up overlapping
// the input on a physical device even though it looks fine in the simulator.
// Listening to the keyboard events directly and animating the sheet's
// translateY ourselves (the same technique apps like Instagram use) works
// regardless of that quirk.
export function useKeyboardOffset() {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(offset, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(offset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [offset]);

  return offset;
}
