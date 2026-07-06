// Core types for the guided multi-capture flow.
// See guided-multi-capture-spec.md (Sections 3, 4, 6, 8) for the design this mirrors.

export type CaptureStep = 'front' | 'side' | 'back';

export type CapturePhase = 'guiding' | 'validating' | 'captured' | 'confirming';

export interface Point {
  x: number;
  y: number;
}

export interface Landmark extends Point {
  score: number; // 0-1 visibility/confidence from the pose model
  name: LandmarkName;
}

export type LandmarkName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle';

export interface DetectedPose {
  landmarks: Landmark[];
  boundingBoxArea: number; // normalized 0-1, used to pick the subject when multiple people are in frame
}

export interface PoseFrameResult {
  poses: DetectedPose[];
  timestamp: number;
}

// --- Validation ---

export interface LandmarkRule {
  landmark: LandmarkName;
  visible: true;
  maxAngle?: number;
}

export interface SymmetryRule {
  symmetry: 'shoulders' | 'hips';
  maxDiff: number;
}

export interface AngleRule {
  angle: 'shoulder_hip_knee';
  min: number;
  max: number;
}

export interface ProfileCheckRule {
  profileCheck: 'left_side_visible';
}

export interface BlurRule {
  blurThreshold: number;
}

export interface DistanceRule {
  distance: { min: number; max: number };
  requiresCalibration: true;
}

export type ValidationRule =
  | LandmarkRule
  | SymmetryRule
  | AngleRule
  | ProfileCheckRule
  | BlurRule
  | DistanceRule;

export interface ValidationCheck {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface PoseScoreBreakdown {
  visibilityScore: number;
  angleScore: number;
  symmetryScore: number;
  blurScore: number;
  distanceScore: number | null; // null while calibration isn't ready yet (Section 4)
  rawScore: number;
}

// --- Calibration ---

export interface CalibrationData {
  pixelsPerCm: number;
  cameraToSubjectM: number;
  paperCorners: Point[];
  confidence: number; // 0-1
  source: 'paper' | 'height_fallback';
}

// --- Capture output ---

export interface ImageAsset {
  objectUrl: string; // URL.createObjectURL(blob), for <img>/preview use
  blob: Blob;
  width: number;
  height: number;
}

export interface CapturedView {
  step: CaptureStep;
  image: ImageAsset;
  calibration: CalibrationData;
  landmarks: Landmark[];
  poseValidation: {
    score: number;
    checks: ValidationCheck[];
  };
  timestamp: number;
}

export interface AnalysisRequest {
  userId: string;
  heightCm: number;
  views: CapturedView[];
  metadata: {
    appVersion: string;
    deviceModel: string;
    captureDurationMs: number;
  };
}

export interface MeasurementWithMargin {
  value: number;
  marginCm: number;
}

export interface AnalysisResponse {
  measurements: {
    bust_cm: MeasurementWithMargin;
    waist_cm: MeasurementWithMargin;
    hip_cm: MeasurementWithMargin;
    shoulder_cm: MeasurementWithMargin;
    torso_length_cm: MeasurementWithMargin;
    leg_length_cm: MeasurementWithMargin;
  };
  classifications: {
    standard_shape: string;
    standard_confidence: number;
    kibbe_type: string;
    kibbe_confidence: number;
    kibbe_family: string;
  };
  recommendations: Record<string, unknown>;
  affiliate_links: unknown[];
  processing_time_ms: number;
}

// --- Flow state ---

export interface StepState {
  step: CaptureStep;
  phase: CapturePhase;
  poseScore: number;
  poseScoreSmoothed: number;
  stableFrames: number;
  calibrationReady: boolean;
  capturedImage: ImageAsset | null;
  calibrationData: CalibrationData | null;
  validationErrors: string[];
  multiPersonDetected: boolean;
}

export const STABLE_FRAMES_REQUIRED = 15; // ~0.5s at 30fps
export const GUIDING_TO_VALIDATING_THRESHOLD = 0.85;
export const VALIDATING_TO_GUIDING_THRESHOLD = 0.75; // hysteresis band, see spec Section 3/4
export const EMA_ALPHA = 0.3;
export const CALIBRATION_CONFIDENCE_THRESHOLD = 0.8;
