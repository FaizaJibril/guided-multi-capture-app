import React from 'react';
import { AnalysisResponse, MeasurementWithMargin } from '../types/capture';
import './ResultsScreen.css';

interface Props {
  result: AnalysisResponse;
}

const MEASUREMENT_LABELS: Record<keyof AnalysisResponse['measurements'], string> = {
  bust_cm: 'Bust',
  waist_cm: 'Waist',
  hip_cm: 'Hip',
  shoulder_cm: 'Shoulder',
  torso_length_cm: 'Torso length',
  leg_length_cm: 'Leg length',
};

function formatMeasurement(m: MeasurementWithMargin): string {
  return `${m.value.toFixed(1)} cm ± ${m.marginCm.toFixed(1)} cm`;
}

/**
 * Results screen surfaces error margins per spec Section 9/15 -- measurements
 * from single-image calibration are estimates, not precise figures, and the
 * UI should say so rather than implying tape-measure-level accuracy.
 */
export function ResultsScreen({ result }: Props) {
  const measurementEntries = Object.entries(result.measurements) as [
    keyof AnalysisResponse['measurements'],
    MeasurementWithMargin
  ][];

  return (
    <div className="results-container">
      <h1 className="results-heading">Your measurements</h1>
      <p className="results-disclaimer">
        Estimated from your photos. Actual measurements may vary within the ranges shown.
      </p>

      {measurementEntries.map(([key, m]) => (
        <div key={key} className="results-row">
          <span className="results-row-label">{MEASUREMENT_LABELS[key]}</span>
          <span className="results-row-value">{formatMeasurement(m)}</span>
        </div>
      ))}

      <h1 className="results-heading">Shape</h1>
      <div className="results-row">
        <span className="results-row-label">Standard shape</span>
        <span className="results-row-value">
          {result.classifications.standard_shape} ({Math.round(result.classifications.standard_confidence * 100)}%)
        </span>
      </div>
      <div className="results-row">
        <span className="results-row-label">Kibbe type</span>
        <span className="results-row-value">
          {result.classifications.kibbe_type} ({Math.round(result.classifications.kibbe_confidence * 100)}%)
        </span>
      </div>
      <p className="results-disclaimer">
        Kibbe typing is traditionally a stylist's qualitative judgment -- treat this as a starting point, not a
        definitive label.
      </p>
    </div>
  );
}
