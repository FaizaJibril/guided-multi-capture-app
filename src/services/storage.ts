import { CaptureStep, StepState } from '../features/capture/types/capture';

// Spec Section 10: "App backgrounded mid-capture -> Persist step state to
// storage, resume." Also implements the deletion flow called for in
// Section 11 (Data Privacy & Retention) -- users need a way to remove
// captured images/derived data independent of full account deletion.
// Wraps localStorage in the same async signatures as the RN AsyncStorage
// version so useConsent.ts doesn't need to change.

const CAPTURE_STATE_KEY = '@guided_capture/in_progress_state';
const CONSENT_KEY = '@guided_capture/consent_given_at';

export interface PersistedCaptureState {
  stepIndex: number;
  step: CaptureStep;
  phase: StepState['phase'];
  savedAt: number;
}

export async function persistCaptureState(state: PersistedCaptureState): Promise<void> {
  localStorage.setItem(CAPTURE_STATE_KEY, JSON.stringify(state));
}

export async function loadPersistedCaptureState(): Promise<PersistedCaptureState | null> {
  const raw = localStorage.getItem(CAPTURE_STATE_KEY);
  return raw ? (JSON.parse(raw) as PersistedCaptureState) : null;
}

export async function clearPersistedCaptureState(): Promise<void> {
  localStorage.removeItem(CAPTURE_STATE_KEY);
}

export async function recordConsentGiven(): Promise<void> {
  localStorage.setItem(CONSENT_KEY, String(Date.now()));
}

export async function hasGivenConsent(): Promise<boolean> {
  return localStorage.getItem(CONSENT_KEY) !== null;
}

/**
 * Deletes locally cached capture artifacts (persisted state + consent flag).
 * Note: this only covers on-device state. If images/measurements were sent
 * to the backend (Section 11 -- hybrid on-device/cloud processing), deleting
 * server-side copies requires a corresponding backend deletion-request
 * endpoint, which isn't implemented in the mock backend yet -- flag this as
 * a real requirement before launch, not just a nice-to-have.
 */
export async function deleteAllLocalCaptureData(): Promise<void> {
  localStorage.removeItem(CAPTURE_STATE_KEY);
  localStorage.removeItem(CONSENT_KEY);
}
