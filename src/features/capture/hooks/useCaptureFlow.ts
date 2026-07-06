import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CALIBRATION_CONFIDENCE_THRESHOLD,
  CapturePhase,
  CaptureStep,
  CapturedView,
  GUIDING_TO_VALIDATING_THRESHOLD,
  ImageAsset,
  Landmark,
  PoseFrameResult,
  STABLE_FRAMES_REQUIRED,
  StepState,
  VALIDATING_TO_GUIDING_THRESHOLD,
} from '../types/capture';
import { usePoseValidation } from './usePoseValidation';
import { useCalibration } from './useCalibration';

interface Options {
  steps: CaptureStep[]; // e.g. ['front', 'side'] or ['front', 'side', 'back'] -- back is optional, spec Key Decisions
  heightCm: number;
}

const NO_POSE_TIMEOUT_MS = 5000;

function initialStepState(step: CaptureStep): StepState {
  return {
    step,
    phase: 'guiding',
    poseScore: 0,
    poseScoreSmoothed: 0,
    stableFrames: 0,
    calibrationReady: false,
    capturedImage: null,
    calibrationData: null,
    validationErrors: [],
    multiPersonDetected: false,
  };
}

/**
 * Main state machine for the capture wizard (spec Section 3), wired up with
 * the fixes from the spec review:
 *  - calibration gates the guiding->validating transition (Section 4/6)
 *  - EMA + hysteresis band avoids flicker at the 0.85 boundary (Section 3/4)
 *  - multi-person frames freeze validation instead of guessing a subject
 */
export function useCaptureFlow({ steps, heightCm }: Options) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completedViews, setCompletedViews] = useState<CapturedView[]>([]);
  const [stepState, setStepState] = useState<StepState>(() => initialStepState(steps[0]));
  const lastPoseSeenAt = useRef(Date.now());
  const captureStartedAt = useRef(Date.now());

  const { validate, resetSmoothing } = usePoseValidation();
  const calibrationHook = useCalibration();

  const currentStep = steps[stepIndex];

  const advanceToNextStep = useCallback(() => {
    resetSmoothing();
    calibrationHook.reset();
    setStepIndex((i) => {
      const next = i + 1;
      if (next < steps.length) {
        setStepState(initialStepState(steps[next]));
      }
      return next;
    });
  }, [steps, resetSmoothing, calibrationHook]);

  const retake = useCallback(() => {
    resetSmoothing();
    setStepState(initialStepState(currentStep));
  }, [currentStep, resetSmoothing]);

  const confirmCapture = useCallback(
    (landmarksAtCapture: Landmark[]) => {
      setStepState((prev) => {
        if (!prev.capturedImage || !prev.calibrationData) return prev;
        const view: CapturedView = {
          step: prev.step,
          image: prev.capturedImage,
          calibration: prev.calibrationData,
          landmarks: landmarksAtCapture,
          poseValidation: { score: prev.poseScore, checks: [] },
          timestamp: Date.now(),
        };
        setCompletedViews((views) => [...views, view]);
        return { ...prev, phase: 'confirming' };
      });
      advanceToNextStep();
    },
    [advanceToNextStep]
  );

  const onCaptureImage = useCallback((image: ImageAsset) => {
    setStepState((prev) => ({ ...prev, phase: 'captured', capturedImage: image }));
  }, []);

  const onCalibrationFallback = useCallback(
    (landmarks: Landmark[]) => {
      const ok = calibrationHook.calibrateFromHeight(heightCm, landmarks);
      if (ok && calibrationHook.calibration) {
        setStepState((prev) => ({ ...prev, calibrationReady: true, calibrationData: calibrationHook.calibration }));
      }
      return ok;
    },
    [calibrationHook, heightCm]
  );

  const onPoseFrame = useCallback(
    (result: PoseFrameResult, blurScore: number, paperDetection: Parameters<typeof calibrationHook.onFrame>[0]) => {
      calibrationHook.onFrame(paperDetection);

      setStepState((prev) => {
        if (prev.phase === 'captured' || prev.phase === 'confirming') return prev;

        // Multi-person handling -- spec Section 4.
        if (result.poses.length > 1) {
          return { ...prev, multiPersonDetected: true, phase: 'guiding', stableFrames: 0 };
        }

        const subjectPose = result.poses[0];
        if (!subjectPose) {
          const idleMs = Date.now() - lastPoseSeenAt.current;
          const errors = idleMs > NO_POSE_TIMEOUT_MS ? ['no_pose_detected'] : prev.validationErrors;
          return { ...prev, multiPersonDetected: false, validationErrors: errors };
        }
        lastPoseSeenAt.current = Date.now();

        const calibrationReady = calibrationHook.calibrationReady || prev.calibrationReady;
        const calibrationData = calibrationHook.calibration ?? prev.calibrationData;
        const distanceM = calibrationReady && calibrationData ? calibrationData.cameraToSubjectM : null;

        const { smoothedScore, checks, invalidLandmarks } = validate({
          step: prev.step,
          landmarks: subjectPose.landmarks,
          blurScore,
          distanceM,
        });

        const errors = checks.filter((c) => !c.passed).map((c) => c.rule);

        let phase: CapturePhase = prev.phase;
        let stableFrames = prev.stableFrames;

        if (phase === 'guiding' && calibrationReady && smoothedScore > GUIDING_TO_VALIDATING_THRESHOLD) {
          phase = 'validating';
          stableFrames = 0;
        } else if (phase === 'validating') {
          if (smoothedScore < VALIDATING_TO_GUIDING_THRESHOLD) {
            phase = 'guiding'; // hysteresis: dropped below the lower band, not just below 0.85
            stableFrames = 0;
          } else {
            stableFrames += 1;
            if (stableFrames >= STABLE_FRAMES_REQUIRED) {
              phase = 'captured';
            }
          }
        }

        return {
          ...prev,
          phase,
          poseScore: smoothedScore,
          poseScoreSmoothed: smoothedScore,
          stableFrames,
          calibrationReady,
          calibrationData,
          validationErrors: errors,
          multiPersonDetected: false,
        };
      });
    },
    [calibrationHook, validate]
  );

  const isLastStep = stepIndex === steps.length - 1;
  const isComplete = stepIndex >= steps.length;

  return {
    currentStep,
    stepIndex,
    stepState,
    completedViews,
    isLastStep,
    isComplete,
    onPoseFrame,
    onCaptureImage,
    confirmCapture,
    retake,
    onCalibrationFallback,
    captureDurationMs: () => Date.now() - captureStartedAt.current,
  };
}
