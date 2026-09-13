import { router } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { Button } from '@/components/Button';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { redemptionService } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

export default function ScanRedemptionScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const handledRef = useRef(false);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    setScanning(true);
    try {
      const session = await redemptionService.scan(result.data);
      router.replace({
        pathname: '/(business)/redemption-bill',
        params: {
          sessionId: session.id,
          promotionTitle: session.promotionTitle,
          creatorName: session.creatorName ?? '',
        },
      });
    } catch (err: any) {
      toast.error(err?.message || t('scanRedemption.scanError'));
      handledRef.current = false;
      setScanning(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <PageHeader title={t('scanRedemption.headerTitle')} backFallback="/(business)/(tabs)" />

        {!permission ? (
          <View style={styles.centerWrap} />
        ) : !permission.granted ? (
          <View style={[styles.centerWrap, { backgroundColor: C.background }]}>
            <FontAwesome5 name="camera" solid size={40} color={C.textSecondary} />
            <Text style={[styles.permissionTitle, { color: C.text }]}>{t('scanRedemption.permissionTitle')}</Text>
            <Text style={[styles.permissionHint, { color: C.textSecondary }]}>{t('scanRedemption.permissionHint')}</Text>
            <Button label={t('scanRedemption.grantPermissionButton')} onPress={requestPermission} />
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.overlayHint}>{t('scanRedemption.instructionHint')}</Text>
            </View>
            {scanning && (
              <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER },
  permissionTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold, textAlign: 'center' },
  permissionHint: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center' },

  cameraWrap: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  frame: { width: 240, height: 240, borderRadius: RADIUS.lg, borderWidth: 3, borderColor: '#fff' },
  overlayHint: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.semibold, textAlign: 'center', paddingHorizontal: SCREEN_GUTTER },
  loadingOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
