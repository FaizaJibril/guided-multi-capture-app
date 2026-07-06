import { CaptureStep } from '../types/capture';

export const STEP_INSTRUCTIONS: Record<CaptureStep, string> = {
  front: 'Stand tall, face the camera, arms slightly out from your sides.',
  side: 'Turn 90°, left side facing the camera, stand straight.',
  back: 'Turn around, back facing the camera, arms slightly out.',
};

export const STEP_LABELS: Record<CaptureStep, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

export const ERROR_COPY = {
  noPoseDetected: 'Step back and make sure your full body is in frame.',
  landmarkOccluded: (landmark: string) => `${landmark.replace('_', ' ')} not visible.`,
  calibrationFailed: 'Could not detect the reference sheet -- enter your height instead.',
  tooClose: 'Move back a little.',
  tooFar: 'Move forward a little.',
  lowLight: 'Turn on more light for a clearer photo.',
  multiPerson: "Make sure you're the only person in frame.",
  detectingCalibration: 'Detecting calibration reference...',
  permissionRevoked: 'Camera access was turned off. Re-enable it to continue.',
  captureWriteFailed: 'Something went wrong saving that photo -- try again.',
} as const;
