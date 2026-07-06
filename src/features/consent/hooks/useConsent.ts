import { useCallback, useEffect, useState } from 'react';
import { hasGivenConsent, recordConsentGiven, deleteAllLocalCaptureData } from '../../../services/storage';

export function useConsent() {
  const [loading, setLoading] = useState(true);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    hasGivenConsent()
      .then(setConsented)
      .finally(() => setLoading(false));
  }, []);

  const giveConsent = useCallback(async () => {
    await recordConsentGiven();
    setConsented(true);
  }, []);

  const revokeAndDeleteData = useCallback(async () => {
    await deleteAllLocalCaptureData();
    setConsented(false);
  }, []);

  return { loading, consented, giveConsent, revokeAndDeleteData };
}
