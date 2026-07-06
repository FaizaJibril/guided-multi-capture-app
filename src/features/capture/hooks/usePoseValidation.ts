import { useCallback, useMemo, useRef } from 'react';
import { createEma } from '../../../utils/ema';
import { VALIDATION_RULES, SCORE_WEIGHTS, SCORE_WEIGHTS_NO_DISTANCE } from '../constants/validationRules';
import {
  AngleRule,
  BlurRule,
  CaptureStep,
  DistanceRule,
  EMA_ALPHA,
  Landmark,
  LandmarkRule,
  PoseScoreBreakdown,
  ProfileCheckRule,
  SymmetryRule,
  ValidationCheck,
  ValidationRule,
} from '../types/capture';

interface ValidateArgs {
  step: CaptureStep;
  landmarks: Landmark[];
  blurScore: number; // 0-1, from a Laplacian-variance measurement upstream (not modeled here)
  distanceM: number | null; // null until calibration is ready -- spec Section 4
}

interface ValidationResult {
  breakdown: PoseScoreBreakdown;
  smoothedScore: number;
  checks: ValidationCheck[];
  invalidLandmarks: Set<string>;
}

function isLandmarkRule(r: ValidationRule): r is LandmarkRule {
  return 'landmark' in r;
}
function isSymmetryRule(r: ValidationRule): r is SymmetryRule {
  return 'symmetry' in r;
}
function isAngleRule(r: ValidationRule): r is AngleRule {
  return 'angle' in r;
}
function isProfileCheckRule(r: ValidationRule): r is ProfileCheckRule {
  return 'profileCheck' in r;
}
function isBlurRule(r: ValidationRule): r is BlurRule {
  return 'blurThreshold' in r;
}
function isDistanceRule(r: ValidationRule): r is DistanceRule {
  return 'distance' in r;
}

const VISIBILITY_THRESHOLD = 0.5;

/**
 * Implements spec Section 4: rule evaluation, weighted score, EMA smoothing.
 * The EMA + hysteresis (Section 3) is what fixes the flicker-at-0.85 issue
 * flagged in the original review.
 */
export function usePoseValidation() {
  const emaRef = useRef(createEma(EMA_ALPHA));

  const validate = useCallback(({ step, landmarks, blurScore, distanceM }: ValidateArgs): ValidationResult => {
    const rules = VALIDATION_RULES[step];
    const byName = new Map(landmarks.map((l) => [l.name, l]));
    const checks: ValidationCheck[] = [];
    const invalidLandmarks = new Set<string>();

    let visibleCount = 0;
    let visibleTotal = 0;
    let angleOk = 0;
    let angleTotal = 0;
    let symmetryOk = 0;
    let symmetryTotal = 0;
    let distancePassed = true;
    let distanceApplicable = false;

    for (const rule of rules) {
      if (isLandmarkRule(rule)) {
        visibleTotal += 1;
        const lm = byName.get(rule.landmark);
        const visible = !!lm && lm.score >= VISIBILITY_THRESHOLD;
        if (visible) visibleCount += 1;
        else invalidLandmarks.add(rule.landmark);
        checks.push({ rule: `landmark:${rule.landmark}`, passed: visible });
      } else if (isSymmetryRule(rule)) {
        symmetryTotal += 1;
        const [a, b] = rule.symmetry === 'shoulders' ? ['left_shoulder', 'right_shoulder'] : ['left_hip', 'right_hip'];
        const la = byName.get(a as any);
        const lb = byName.get(b as any);
        const diff = la && lb ? Math.abs(la.y - lb.y) : 1;
        const passed = diff <= rule.maxDiff;
        if (passed) symmetryOk += 1;
        else {
          invalidLandmarks.add(a);
          invalidLandmarks.add(b);
        }
        checks.push({ rule: `symmetry:${rule.symmetry}`, passed, detail: `diff=${diff.toFixed(3)}` });
      } else if (isAngleRule(rule)) {
        angleTotal += 1;
        // Angle computation depends on which three landmarks define
        // shoulder-hip-knee; left-side landmarks used per spec Section 4 (side view).
        const shoulder = byName.get('left_shoulder');
        const hip = byName.get('left_hip');
        const knee = byName.get('left_knee');
        const angle = shoulder && hip && knee ? angleBetween(shoulder, hip, knee) : 0;
        const passed = angle >= rule.min && angle <= rule.max;
        if (passed) angleOk += 1;
        checks.push({ rule: `angle:${rule.angle}`, passed, detail: `${angle.toFixed(1)}deg` });
      } else if (isProfileCheckRule(rule)) {
        // Rough heuristic: in a true left-profile shot, right-side landmarks
        // should be mostly occluded/low-confidence.
        const rightShoulder = byName.get('right_shoulder');
        const passed = !rightShoulder || rightShoulder.score < 0.3;
        checks.push({ rule: `profileCheck:${rule.profileCheck}`, passed });
      } else if (isBlurRule(rule)) {
        const passed = blurScore >= rule.blurThreshold;
        checks.push({ rule: 'blur', passed, detail: `blurScore=${blurScore.toFixed(2)}` });
      } else if (isDistanceRule(rule)) {
        distanceApplicable = true;
        if (distanceM === null) {
          // Calibration not ready -- excluded from scoring, not a failure.
          continue;
        }
        const passed = distanceM >= rule.distance.min && distanceM <= rule.distance.max;
        distancePassed = passed;
        checks.push({ rule: 'distance', passed, detail: `${distanceM.toFixed(2)}m` });
      }
    }

    const visibilityScore = visibleTotal ? visibleCount / visibleTotal : 1;
    const angleScore = angleTotal ? angleOk / angleTotal : 1;
    const symmetryScore = symmetryTotal ? symmetryOk / symmetryTotal : 1;
    const distanceScore = distanceApplicable && distanceM !== null ? (distancePassed ? 1 : 0) : null;

    const rawScore =
      distanceScore === null
        ? SCORE_WEIGHTS_NO_DISTANCE.visibility * visibilityScore +
          SCORE_WEIGHTS_NO_DISTANCE.angle * angleScore +
          SCORE_WEIGHTS_NO_DISTANCE.symmetry * symmetryScore +
          SCORE_WEIGHTS_NO_DISTANCE.blur * blurScore
        : SCORE_WEIGHTS.visibility * visibilityScore +
          SCORE_WEIGHTS.angle * angleScore +
          SCORE_WEIGHTS.symmetry * symmetryScore +
          SCORE_WEIGHTS.blur * blurScore +
          SCORE_WEIGHTS.distance * distanceScore;

    const smoothedScore = emaRef.current.next(rawScore);

    return {
      breakdown: { visibilityScore, angleScore, symmetryScore, blurScore, distanceScore, rawScore },
      smoothedScore,
      checks,
      invalidLandmarks,
    };
  }, []);

  const resetSmoothing = useCallback(() => emaRef.current.reset(), []);

  return { validate, resetSmoothing };
}

function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  // Angle at point b, formed by rays b->a and b->c, in degrees.
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
