import React, { useState } from 'react';
import { ConsentScreen } from './src/features/consent/screens/ConsentScreen';
import { useConsent } from './src/features/consent/hooks/useConsent';
import { CaptureFlowScreen } from './src/features/capture/screens/CaptureFlowScreen';
import { ResultsScreen } from './src/features/capture/screens/ResultsScreen';
import { AnalysisResponse, CaptureStep } from './src/features/capture/types/capture';

// Back view is optional per spec Key Decisions (Section 16) -- flip this to
// include 'back' once the product decides it should be required by default.
const CAPTURE_STEPS: CaptureStep[] = ['front', 'side'];
const DEMO_USER_ID = 'demo-user';
const DEMO_HEIGHT_CM = 168;

type Phase = 'capture' | 'results';

export default function App() {
  const { loading, consented, giveConsent } = useConsent();
  const [phase, setPhase] = useState<Phase>('capture');
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  if (loading) return null;

  if (!consented) {
    return (
      <ConsentScreen
        onAccept={async () => {
          await giveConsent();
        }}
        onDecline={() => {
          /* Respect the decline -- do not proceed into camera flow. */
        }}
      />
    );
  }

  if (phase === 'results' && result) {
    return <ResultsScreen result={result} />;
  }

  return (
    <CaptureFlowScreen
      steps={CAPTURE_STEPS}
      heightCm={DEMO_HEIGHT_CM}
      userId={DEMO_USER_ID}
      onComplete={(analysisResult) => {
        setResult(analysisResult);
        setPhase('results');
      }}
    />
  );
}
