import React, { useMemo } from 'react';
import { CaptureStep, Landmark } from '../types/capture';
import { POSE_CONNECTIONS, TARGET_SILHOUETTES } from '../constants/targetSilhouettes';

interface Props {
  step: CaptureStep;
  landmarks: Landmark[];
  invalidLandmarks: Set<string>;
  multiPersonDetected: boolean;
}

const VISIBILITY_THRESHOLD = 0.5;

export function PoseOverlay({ step, landmarks, invalidLandmarks, multiPersonDetected }: Props) {
  const byName = useMemo(() => {
    const map = new Map<string, Landmark>();
    landmarks.forEach((l) => map.set(l.name, l));
    return map;
  }, [landmarks]);

  return (
    <div className="pose-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        {/* Target silhouette guide */}
        <path
          d={TARGET_SILHOUETTES[step]}
          fill="none"
          stroke="#cccccc"
          strokeWidth={0.006}
          strokeDasharray="0.015,0.01"
          opacity={multiPersonDetected ? 0.15 : 0.5}
        />

        {!multiPersonDetected &&
          POSE_CONNECTIONS.map(([a, b]) => {
            const pa = byName.get(a);
            const pb = byName.get(b);
            if (!pa || !pb) return null;
            if (pa.score < VISIBILITY_THRESHOLD || pb.score < VISIBILITY_THRESHOLD) return null;
            const isInvalid = invalidLandmarks.has(a) || invalidLandmarks.has(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={isInvalid ? '#ff4444' : '#22cc66'}
                strokeWidth={0.005}
              />
            );
          })}

        {!multiPersonDetected &&
          landmarks
            .filter((l) => l.score >= VISIBILITY_THRESHOLD)
            .map((l) => (
              <circle
                key={l.name}
                cx={l.x}
                cy={l.y}
                r={0.008}
                fill={invalidLandmarks.has(l.name) ? '#ff4444' : '#22cc66'}
              />
            ))}
      </svg>
    </div>
  );
}
