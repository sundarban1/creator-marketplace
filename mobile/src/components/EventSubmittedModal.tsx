import { router } from 'expo-router';
import { AppModal } from '@/components/AppModal';
import { useLanguage } from '@/context/LanguageContext';

/**
 * One-time modal after a business submits a new event. A verified business
 * skips admin review, so its event is already live (`published`); otherwise
 * it's in the review queue and we point the business at verification.
 */
export function EventSubmittedModal({ visible, published, onClose }: {
  visible: boolean;
  published: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  if (published) {
    return (
      <AppModal
        visible={visible}
        type="success"
        icon="check-circle"
        title={t('eventReview.publishedModalTitle')}
        body={t('eventReview.publishedModalBody')}
        confirmLabel={t('eventReview.submittedModalOk')}
        hideCancel
        onConfirm={onClose}
        onCancel={onClose}
      />
    );
  }
  return (
    <AppModal
      visible={visible}
      type="success"
      icon="clipboard-check"
      title={t('eventReview.submittedModalTitle')}
      body={`${t('eventReview.submittedModalBody')}\n\n${t('eventReview.verifiedSkipNote')}`}
      confirmLabel={t('eventReview.submittedModalOk')}
      cancelLabel={t('eventReview.verifyBusinessCta')}
      onCancelPress={() => {
        onClose();
        router.push('/(business)/settings?section=verification' as Parameters<typeof router.push>[0]);
      }}
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
}
