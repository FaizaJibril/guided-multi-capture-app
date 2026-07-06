import React from 'react';
import { CalibrationData } from '../types/capture';
import './CalibrationIndicator.css';

interface Props {
  calibration: CalibrationData | null;
}

export function CalibrationIndicator({ calibration }: Props) {
  if (!calibration) {
    return (
      <div className="calibration-pill calibration-pending">
        <span>Calibrating...</span>
      </div>
    );
  }

  const label =
    calibration.source === 'paper'
      ? `Calibrated (${Math.round(calibration.confidence * 100)}%)`
      : 'Calibrated (height fallback)';

  return (
    <div className="calibration-pill calibration-ready">
      <span>{label}</span>
    </div>
  );
}
