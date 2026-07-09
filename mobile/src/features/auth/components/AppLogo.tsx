import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export function AppLogo() {
  return (
    <View style={styles.appIcon}>
      <Image
        source={require('@/assets/images/app-icon.png')}
        style={styles.image}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
