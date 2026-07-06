import React from 'react';
import { CapturePhase } from '../types/capture';
import './ValidationStatus.css';

interface Props {
  phase: CapturePhase;
  multiPersonDetected: boolean;
  calibrationReady: boolean;
  errorMessage?: string;
}

export function ValidationStatus({ phase, multiPersonDetected, calibrationReady, errorMessage }: Props) {
  const { label, tone } = getStatus(phase, multiPersonDetected, calibrationReady, errorMessage);

  return (
    <div className={`validation-status validation-status-${tone}`}>
      <span>{label}</span>
    </div>
  );
}

function getStatus(
  phase: CapturePhase,
  multiPersonDetected: boolean,
  calibrationReady: boolean,
  errorMessage?: string
): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (multiPersonDetected) {
    return { label: "Make sure you're the only person in frame", tone: 'bad' };
  }
  if (!calibrationReady) {
    return { label: 'Detecting calibration reference...', tone: 'neutral' };
  }
  if (errorMessage) {
    return { label: errorMessage, tone: 'bad' };
  }
  switch (phase) {
    case 'guiding':
      return { label: 'Adjust position', tone: 'neutral' };
    case 'validating':
      return { label: 'Hold still...', tone: 'neutral' };
    case 'captured':
      return { label: 'Pose locked', tone: 'good' };
    case 'confirming':
      return { label: 'Review your photo', tone: 'neutral' };
  }
}
