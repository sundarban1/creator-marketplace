import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { ReviewsList } from '@/components/ReviewsList';
import { SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import type { ApiReviewReceived } from '@/services/creator';

const PAGE = 8;

// Reviews viewer opened from the rating pill under a profile name. The full
// review list already ships embedded in the profile payload (it is not a
// paginated endpoint), so "lazy loading" here means revealing the in-memory
// list a page at a time as the user scrolls — keeping the first paint cheap
// when a profile has dozens of reviews. Built on the shared <BottomSheet>.
export function ReviewsModal({
  visible,
  onClose,
  reviews,
  averageRating,
  reviewCount,
}: {
  visible: boolean;
  onClose: () => void;
  reviews: ApiReviewReceived[];
  averageRating?: number | null;
  reviewCount?: number | null;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [shownCount, setShownCount] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset the reveal window each time the sheet (re)opens — adjust-state-on-
  // prop-change during render rather than in an effect (React docs pattern).
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible && shownCount !== PAGE) {
      setShownCount(PAGE);
      setLoadingMore(false);
    }
  }

  const shown = reviews.slice(0, shownCount);
  const hasMore = shownCount < reviews.length;

  function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    // Brief defer so the spinner actually paints — the data is already local.
    setTimeout(() => {
      setShownCount((c) => Math.min(c + PAGE, reviews.length));
      setLoadingMore(false);
    }, 250);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 240) loadMore();
  }

  const avg =
    averageRating ??
    (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null);
  const total = reviewCount ?? reviews.length;
  const subtitle =
    avg != null && Number.isFinite(avg) && total > 0
      ? t('reviewsList.summary', { rating: avg.toFixed(1), count: total })
      : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('reviewsList.title')}
      subtitle={subtitle}
      scrollable={false}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={64}>
        <ReviewsList reviews={shown} seeMore />
        {loadingMore ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={C.brinjal1} />
        ) : (
          <View style={{ height: 12 }} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: 12 },
});
