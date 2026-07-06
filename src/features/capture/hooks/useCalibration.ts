import { useCallback, useRef, useState } from 'react';
import { CALIBRATION_CONFIDENCE_THRESHOLD } from '../types/capture';
import { CalibrationData, Landmark } from '../types/capture';

// A4 paper: 21cm x 29.7cm
const A4_WIDTH_CM = 21.0;

/**
 * Calibration hook implementing spec Section 6. Paper detection itself
 * (OpenCV contour matching against a 210x297mm rectangle) is native-module
 * territory -- this hook expects a `detectPaperInFrame` native/worklet
 * function to be wired in (e.g. via a vision-camera frame-processor plugin,
 * same pattern as usePoseDetection). What's implemented here is the
 * confidence gating, EMA-free debounce (checked every 5 frames per spec),
 * and the height-input fallback path, since that's the part that determines
 * how calibration interacts with the rest of the state machine.
 */
export function useCalibration() {
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [fallbackHeightCm, setFallbackHeightCm] = useState<number | null>(null);
  const frameCounter = useRef(0);

  const calibrationReady = calibration !== null;

  // Call from the frame-processor JS-thread callback, throttled to every 5th
  // frame per spec Section 6 ("Run calibration check every 5 frames").
  const onFrame = useCallback(
    (paperDetection: { corners: { x: number; y: number }[]; pixelWidth: number; confidence: number } | null) => {
      frameCounter.current += 1;
      if (frameCounter.current % 5 !== 0) return;
      if (fallbackHeightCm !== null) return; // already calibrated via fallback

      if (!paperDetection || paperDetection.confidence < CALIBRATION_CONFIDENCE_THRESHOLD) {
        return; // stay in "Detecting calibration reference..." state
      }

      const pixelsPerCm = paperDetection.pixelWidth / A4_WIDTH_CM;

      // NOTE (spec Section 6 accuracy caveat): this assumes the paper and the
      // subject are in the same focal plane. cameraToSubjectM here is a rough
      // placeholder -- a real implementation needs device camera intrinsics
      // (focal length / sensor size) to convert paper size -> distance
      // accurately. Treat downstream measurements as estimates until that's
      // wired in.
      const cameraToSubjectM = estimateDistanceFromPaperWidth(paperDetection.pixelWidth);

      setCalibration({
        pixelsPerCm,
        cameraToSubjectM,
        paperCorners: paperDetection.corners,
        confidence: paperDetection.confidence,
        source: 'paper',
      });
    },
    [fallbackHeightCm]
  );

  // Fallback path: user enters height, we derive pixelsPerCm from
  // nose-to-ankle landmark distance in pixels. Caller should also verify
  // device is roughly level (gyroscope check) before accepting this --
  // see spec Section 6 caveat on foreshortening.
  const calibrateFromHeight = useCallback((heightCm: number, landmarks: Landmark[]) => {
    const nose = landmarks.find((l) => l.name === 'nose');
    const leftAnkle = landmarks.find((l) => l.name === 'left_ankle');
    const rightAnkle = landmarks.find((l) => l.name === 'right_ankle');
    const ankle = leftAnkle ?? rightAnkle;

    if (!nose || !ankle) return false;

    const pixelHeight = Math.hypot(ankle.x - nose.x, ankle.y - nose.y);
    if (pixelHeight <= 0) return false;

    const pixelsPerCm = pixelHeight / heightCm;

    setFallbackHeightCm(heightCm);
    setCalibration({
      pixelsPerCm,
      cameraToSubjectM: 2.0, // unknown without a real reference; assume typical capture distance
      paperCorners: [],
      confidence: 1, // fallback is user-provided, treated as "confident enough" but flagged as fallback source
      source: 'height_fallback',
    });
    return true;
  }, []);

  const reset = useCallback(() => {
    setCalibration(null);
    setFallbackHeightCm(null);
    frameCounter.current = 0;
  }, []);

  return { calibration, calibrationReady, onFrame, calibrateFromHeight, reset };
}

function estimateDistanceFromPaperWidth(pixelWidthOfPaper: number): number {
  // Placeholder heuristic pending real camera-intrinsics-based estimation
  // (spec Section 6). Larger pixel width of a fixed-size object -> closer
  // subject. Tuned loosely against a 1080p-equivalent frame width.
  const REFERENCE_PIXEL_WIDTH_AT_2M = 220;
  return (REFERENCE_PIXEL_WIDTH_AT_2M / Math.max(pixelWidthOfPaper, 1)) * 2.0;
}
