import React from 'react';
import { CaptureStep } from '../types/capture';
import { STEP_LABELS } from '../constants/instructions';
import './StepIndicator.css';

interface Props {
  steps: CaptureStep[]; // e.g. ['front', 'side'] if the user skipped 'back' -- spec Section 2
  currentStep: CaptureStep;
  completedSteps: Set<CaptureStep>;
}

export function StepIndicator({ steps, currentStep, completedSteps }: Props) {
  return (
    <div className="step-indicator">
      {steps.map((step, i) => {
        const isCurrent = step === currentStep;
        const isDone = completedSteps.has(step);
        return (
          <React.Fragment key={step}>
            <div className={`step-dot ${isCurrent ? 'step-dot-current' : ''} ${isDone ? 'step-dot-done' : ''}`}>
              <span className="step-dot-text">{i + 1}</span>
            </div>
            <span className={`step-label ${isCurrent ? 'step-label-current' : ''}`}>{STEP_LABELS[step]}</span>
            {i < steps.length - 1 && <div className="step-separator" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
