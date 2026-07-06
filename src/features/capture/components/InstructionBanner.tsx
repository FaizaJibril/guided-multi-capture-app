import React from 'react';
import './InstructionBanner.css';

interface Props {
  text: string;
}

export function InstructionBanner({ text }: Props) {
  return (
    <div className="instruction-banner">
      <span>{text}</span>
    </div>
  );
}
