import React, { useCallback, useRef, useState } from 'react';
import { CameraView, CameraViewHandle } from '../components/CameraView';
import { PoseOverlay } from '../components/PoseOverlay';
import { InstructionBanner } from '../components/InstructionBanner';
import { ValidationStatus } from '../components/ValidationStatus';
import { CalibrationIndicator } from '../components/CalibrationIndicator';
import { StepIndicator } from '../components/StepIndicator';
import { BottomBar } from '../components/BottomBar';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useCaptureFlow } from '../hooks/useCaptureFlow';
import { STEP_INSTRUCTIONS, ERROR_COPY } from '../constants/instructions';
import { CaptureStep, Landmark, PoseFrameResult } from '../types/capture';
import { runAnalysis } from '../../../services/api';
import './CaptureFlowScreen.css';

interface Props {
  steps: CaptureStep[]; // ['front','side'] or ['front','side','back'] -- back optional per Key Decisions
  heightCm: number;
  userId: string;
  onComplete: (result: Awaited<ReturnType<typeof runAnalysis>>) => void;
}

export function CaptureFlowScreen({ steps, heightCm, userId, onComplete }: Props) {
  const cameraRef = useRef<CameraViewHandle>(null);
  const [latestPose, setLatestPose] = useState<{ landmarks: Landmark[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<CaptureStep>>(new Set());

  const flow = useCaptureFlow({ steps, heightCm });

  const handlePoseFrame = useCallback(
    (result: PoseFrameResult) => {
      const subject = result.poses[0];
      if (subject) setLatestPose({ landmarks: subject.landmarks });

      // Blur + paper-detection are OpenCV/native-plugin territory (Laplacian
      // variance, contour match -- spec Sections 4 & 6). Stubbed here with
      // neutral values so the state machine and UI wiring can be exercised
      // end-to-end before those are integrated -- same as the RN version.
      const blurScore = 0.8;
      const paperDetection = null;

      flow.onPoseFrame(result, blurScore, paperDetection);
    },
    [flow]
  );

  const handleAutoCapturedPhoto = useCallback(async () => {
    if (flow.stepState.phase !== 'captured' || flow.stepState.capturedImage) return;
    const image = await cameraRef.current?.takePhoto();
    if (image) flow.onCaptureImage(image);
  }, [flow]);

  // Fire capture once phase flips to 'captured' with no image yet.
  React.useEffect(() => {
    handleAutoCapturedPhoto();
  }, [flow.stepState.phase, handleAutoCapturedPhoto]);

  const handleConfirm = useCallback(() => {
    setCompletedSteps((s) => new Set(s).add(flow.currentStep));
    flow.confirmCapture(latestPose?.landmarks ?? []);
  }, [flow, latestPose]);

  const handleRetake = useCallback(() => {
    flow.retake();
  }, [flow]);

  React.useEffect(() => {
    if (!flow.isComplete) return;
    setUploading(true);
    runAnalysis({
      userId,
      heightCm,
      views: flow.completedViews,
      metadata: {
        appVersion: '0.1.0',
        deviceModel: navigator.userAgent,
        captureDurationMs: flow.captureDurationMs(),
      },
    })
      .then(onComplete)
      .finally(() => setUploading(false));
  }, [flow.isComplete]);

  return (
    <div className="capture-flow-container">
      <CameraView ref={cameraRef} onPoseFrame={handlePoseFrame} active={!flow.isComplete} />

      <PoseOverlay
        step={flow.currentStep}
        landmarks={latestPose?.landmarks ?? []}
        invalidLandmarks={new Set(flow.stepState.validationErrors)}
        multiPersonDetected={flow.stepState.multiPersonDetected}
      />

      <StepIndicator steps={steps} currentStep={flow.currentStep} completedSteps={completedSteps} />

      <ValidationStatus
        phase={flow.stepState.phase}
        multiPersonDetected={flow.stepState.multiPersonDetected}
        calibrationReady={flow.stepState.calibrationReady}
        errorMessage={flow.stepState.validationErrors.includes('no_pose_detected') ? ERROR_COPY.noPoseDetected : undefined}
      />

      <CalibrationIndicator calibration={flow.stepState.calibrationData} />

      <InstructionBanner text={STEP_INSTRUCTIONS[flow.currentStep]} />

      <BottomBar
        visible={flow.stepState.phase === 'captured' && !!flow.stepState.capturedImage}
        onRetake={handleRetake}
        onConfirm={handleConfirm}
      />

      <LoadingOverlay visible={uploading} />
    </div>
  );
}
