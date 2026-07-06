import React from 'react';
import './ConsentScreen.css';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Explicit, separate consent screen -- spec Section 11. Distinct from
 * general app ToS: states plainly what's captured and why, before the
 * camera ever opens.
 */
export function ConsentScreen({ onAccept, onDecline }: Props) {
  return (
    <div className="consent-container">
      <div className="consent-content">
        <h1 className="consent-heading">Before we start</h1>
        <p className="consent-paragraph">
          This app captures 2-3 photos of your body (front, side, and optionally back) to estimate your measurements
          and body shape.
        </p>
        <p className="consent-paragraph">What we do with your photos:</p>
        <p className="consent-bullet">- Pose landmarks are detected on your device.</p>
        <p className="consent-bullet">
          - Photos and landmark data are sent securely to our servers to calculate measurements and shape
          classification.
        </p>
        <p className="consent-bullet">
          - By default, we do not keep your original photos after measurements are extracted. You can request
          deletion of any retained data at any time from Settings.
        </p>
        <p className="consent-paragraph">
          Measurements shown are estimates based on photo calibration and may differ from a tape-measure
          measurement.
        </p>
      </div>

      <div className="consent-actions">
        <button className="consent-decline-button" onClick={onDecline}>
          Not now
        </button>
        <button className="consent-accept-button" onClick={onAccept}>
          I understand, continue
        </button>
      </div>
    </div>
  );
}
