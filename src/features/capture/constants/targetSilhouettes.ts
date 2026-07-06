import { CaptureStep } from '../types/capture';

// Simplified normalized (0-1) SVG paths for the target-pose silhouette shown
// as a guide overlay. Replace with traced illustrator paths before shipping --
// these are placeholder geometry good enough to prove out the overlay/rendering
// pipeline in Section 5 of the spec.

export const TARGET_SILHOUETTES: Record<CaptureStep, string> = {
  front:
    'M0.5,0.08 C0.46,0.08 0.43,0.11 0.43,0.15 C0.43,0.19 0.46,0.22 0.5,0.22 ' +
    'C0.54,0.22 0.57,0.19 0.57,0.15 C0.57,0.11 0.54,0.08 0.5,0.08 Z ' +
    'M0.5,0.22 L0.3,0.3 L0.18,0.28 L0.16,0.32 L0.3,0.38 L0.32,0.55 ' +
    'L0.28,0.9 L0.36,0.9 L0.42,0.58 L0.5,0.58 L0.58,0.58 L0.64,0.9 L0.72,0.9 ' +
    'L0.68,0.55 L0.7,0.38 L0.84,0.32 L0.82,0.28 L0.7,0.3 Z',
  side:
    'M0.52,0.08 C0.48,0.08 0.45,0.11 0.45,0.15 C0.45,0.19 0.48,0.22 0.52,0.22 ' +
    'C0.56,0.22 0.58,0.19 0.58,0.15 C0.58,0.11 0.56,0.08 0.52,0.08 Z ' +
    'M0.52,0.22 L0.46,0.3 L0.44,0.55 L0.4,0.9 L0.48,0.9 L0.52,0.6 L0.56,0.9 ' +
    'L0.64,0.9 L0.58,0.55 L0.56,0.3 Z',
  back:
    'M0.5,0.08 C0.46,0.08 0.43,0.11 0.43,0.15 C0.43,0.19 0.46,0.22 0.5,0.22 ' +
    'C0.54,0.22 0.57,0.19 0.57,0.15 C0.57,0.11 0.54,0.08 0.5,0.08 Z ' +
    'M0.5,0.22 L0.3,0.3 L0.18,0.28 L0.16,0.32 L0.3,0.38 L0.32,0.55 ' +
    'L0.28,0.9 L0.36,0.9 L0.42,0.58 L0.5,0.58 L0.58,0.58 L0.64,0.9 L0.72,0.9 ' +
    'L0.68,0.55 L0.7,0.38 L0.84,0.32 L0.82,0.28 L0.7,0.3 Z',
};

export const POSE_CONNECTIONS: [string, string][] = [
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];
