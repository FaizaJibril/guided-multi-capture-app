import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { DetectedPose, Landmark, LandmarkName, PoseFrameResult } from '../types/capture';

// Order MediaPipe's BlazePose model returns its 33 keypoints in. Identical
// indices to the RN/native MediaPipe plugin -- this is the same standard
// landmark layout across all MediaPipe pose runtimes (web, Android, iOS).
const LANDMARK_INDEX: Partial<Record<number, LandmarkName>> = {
  0: 'nose',
  2: 'left_eye',
  5: 'right_eye',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle',
};

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

function mapResultToPoses(landmarksPerPose: { x: number; y: number; visibility?: number }[][]): DetectedPose[] {
  return landmarksPerPose.map((lms) => {
    const landmarks: Landmark[] = [];
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    lms.forEach((lm, i) => {
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
      const name = LANDMARK_INDEX[i];
      if (!name) return;
      landmarks.push({ x: lm.x, y: lm.y, score: lm.visibility ?? 0, name });
    });
    const boundingBoxArea = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
    return { landmarks, boundingBoxArea };
  });
}

/**
 * Web equivalent of the RN usePoseDetection hook: loads MediaPipe's
 * PoseLandmarker (WASM, runs entirely client-side) instead of the native
 * react-native-mediapipe-posedetection plugin. Same landmark index mapping
 * and PoseFrameResult output shape, so useCaptureFlow/usePoseValidation don't
 * need to change. The caller drives detection per-frame via `detectFrame`
 * (e.g. from a requestAnimationFrame loop reading a <video> element),
 * replacing vision-camera's frame-processor worklet.
 */
export function usePoseDetection(onResult: (result: PoseFrameResult) => void) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: PoseLandmarker | null = null;

    (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 2, // detect up to 2 so we can flag multi-person frames (spec Section 4)
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (cancelled) {
        landmarker.close();
        return;
      }
      created = landmarker;
      landmarkerRef.current = landmarker;
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
      created?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const detectFrame = useCallback(
    (video: HTMLVideoElement) => {
      const landmarker = landmarkerRef.current;
      if (!landmarker || video.readyState < 2) return;
      const timestamp = performance.now();
      const result = landmarker.detectForVideo(video, timestamp);
      onResult({ poses: mapResultToPoses(result.landmarks), timestamp });
    },
    [onResult]
  );

  return { isReady, detectFrame };
}
