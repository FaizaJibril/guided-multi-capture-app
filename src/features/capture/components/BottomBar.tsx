import React from 'react';
import './BottomBar.css';

interface Props {
  visible: boolean;
  onRetake: () => void;
  onConfirm: () => void;
}

export function BottomBar({ visible, onRetake, onConfirm }: Props) {
  if (!visible) return null;

  return (
    <div className="bottom-bar">
      <button className="bottom-bar-button bottom-bar-retake" onClick={onRetake}>
        Retake
      </button>
      <button className="bottom-bar-button bottom-bar-confirm" onClick={onConfirm}>
        Confirm
      </button>
    </div>
  );
}
