import { CaptureStep, ValidationRule } from '../types/capture';

// Mirrors guided-multi-capture-spec.md Section 4.
// `back` mirrors `front` (left/right landmark pairs are validated the same way;
// pose detection handles the left/right flip automatically since MediaPipe
// labels landmarks anatomically, not by which side faces the camera).

const FRONT_RULES: ValidationRule[] = [
  { landmark: 'left_shoulder', visible: true, maxAngle: 15 },
  { landmark: 'right_shoulder', visible: true, maxAngle: 15 },
  { landmark: 'left_hip', visible: true },
  { landmark: 'right_hip', visible: true },
  { landmark: 'nose', visible: true },
  { symmetry: 'shoulders', maxDiff: 0.05 },
  { symmetry: 'hips', maxDiff: 0.05 },
  { blurThreshold: 0.3 },
  { distance: { min: 1.5, max: 3.0 }, requiresCalibration: true },
];

const SIDE_RULES: ValidationRule[] = [
  { landmark: 'left_shoulder', visible: true },
  { landmark: 'left_hip', visible: true },
  { landmark: 'left_knee', visible: true },
  { landmark: 'left_ankle', visible: true },
  { angle: 'shoulder_hip_knee', min: 170, max: 190 },
  { profileCheck: 'left_side_visible' },
  { blurThreshold: 0.3 },
  { distance: { min: 1.5, max: 3.0 }, requiresCalibration: true },
];

export const VALIDATION_RULES: Record<CaptureStep, ValidationRule[]> = {
  front: FRONT_RULES,
  side: SIDE_RULES,
  back: FRONT_RULES, // mirror of front, per spec Section 4
};

// Base weights before renormalization. Not yet validated against real
// capture-success data -- log score components during beta and tune these.
// See guided-multi-capture-spec.md Section 4, "[REVISED] Note on weights".
// visibility/angle/symmetry/blur match the original spec's formula
// (0.4/0.3/0.2/0.1); `distance` is an additional term folded in once
// calibration is ready, taken proportionally from the other four so the
// full set still sums to 1.
export const SCORE_WEIGHTS = {
  visibility: 0.32,
  angle: 0.24,
  symmetry: 0.16,
  blur: 0.08,
  distance: 0.2,
};

// When calibration isn't ready yet, the distance term is excluded and the
// remaining four weights are renormalized back to the original 0.4/0.3/0.2/0.1
// split so scoring is unaffected while waiting on calibration.
export const SCORE_WEIGHTS_NO_DISTANCE = {
  visibility: 0.4,
  angle: 0.3,
  symmetry: 0.2,
  blur: 0.1,
};
