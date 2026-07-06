import React from 'react';
import './LoadingOverlay.css';

interface Props {
  visible: boolean;
  label?: string;
}

export function LoadingOverlay({ visible, label = 'Analyzing your photos...' }: Props) {
  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <span className="loading-text">{label}</span>
    </div>
  );
}
