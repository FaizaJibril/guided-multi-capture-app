import { AnalysisRequest, AnalysisResponse } from '../features/capture/types/capture';

// Multipart chosen per spec Section 15/16 ("simpler backend"). Point this at
// the mock FastAPI server in /backend for local end-to-end testing, or your
// real API in production via VITE_API_BASE_URL.
// render.yaml wires this from the backend service's bare hostname (Render's
// `fromService`/`host` blueprint property has no scheme), so add https:// if
// what we got doesn't already look like a full URL.
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_BASE_URL = rawApiBaseUrl.startsWith('http') ? rawApiBaseUrl : `https://${rawApiBaseUrl}`;

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append('userId', request.userId);
  form.append('heightCm', String(request.heightCm));
  form.append('metadata', JSON.stringify(request.metadata));

  request.views.forEach((view, i) => {
    form.append(
      `views[${i}][meta]`,
      JSON.stringify({
        step: view.step,
        calibration: view.calibration,
        landmarks: view.landmarks,
        poseValidation: view.poseValidation,
        timestamp: view.timestamp,
      })
    );
    form.append(`views[${i}][image]`, view.image.blob, `${view.step}.jpg`);
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
    method: 'POST',
    body: form,
    // Do not set Content-Type manually -- fetch needs to generate the
    // multipart boundary itself. Setting it here breaks the upload.
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Analysis request failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as AnalysisResponse;
}
