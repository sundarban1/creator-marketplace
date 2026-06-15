import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/utilities/constants';

export function AppLogo() {
  return (
    <View style={styles.appIcon}>
      <View style={styles.iconAccentLarge} />
      <View style={styles.iconAccentSmall} />
      <View style={styles.iconCenter}>
        <Text style={styles.iconLetterC}>C</Text>
        <Text style={styles.iconLetterM}>M</Text>
      </View>
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
  iconAccentLarge: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE9FE',
    bottom: -18,
    left: -18,
  },
  iconAccentSmall: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DDD6FE',
    top: -10,
    right: -8,
  },
  iconCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  iconLetterC: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.brinjal1,
    lineHeight: 34,
  },
  iconLetterM: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AEDaa',
    lineHeight: 34,
    marginTop: 6,
  },
});
