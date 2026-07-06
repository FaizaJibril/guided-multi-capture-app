"""
Mock FastAPI backend for local end-to-end testing of the capture flow.

This is NOT the real measurement/classification model -- it returns
plausible-looking values in the exact response shape from
guided-multi-capture-spec.md Section 9, so the mobile app's upload path,
error handling, and Results screen can be exercised without a trained model
in place. Replace `fake_analyze()` with a real pipeline before shipping.

Run locally:
    pip install fastapi uvicorn python-multipart
    uvicorn main:app --reload
"""

import os
import random
import time
from typing import List

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Guided Multi-Capture Mock API")

# Browsers enforce CORS (RN didn't), so the web frontend's origin needs to be
# allow-listed explicitly. Set ALLOWED_ORIGIN to the deployed frontend's URL
# in production (see render.yaml); defaults to the local Vite dev server.
# render.yaml wires this from the frontend service's bare hostname (Render's
# `fromService`/`host` blueprint property has no scheme), so add https:// if
# what we got doesn't already look like a full origin.
_raw_allowed_origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")
ALLOWED_ORIGIN = _raw_allowed_origin if _raw_allowed_origin.startswith("http") else f"https://{_raw_allowed_origin}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MeasurementWithMargin(BaseModel):
    value: float
    marginCm: float


class Measurements(BaseModel):
    bust_cm: MeasurementWithMargin
    waist_cm: MeasurementWithMargin
    hip_cm: MeasurementWithMargin
    shoulder_cm: MeasurementWithMargin
    torso_length_cm: MeasurementWithMargin
    leg_length_cm: MeasurementWithMargin


class Classifications(BaseModel):
    standard_shape: str
    standard_confidence: float
    kibbe_type: str
    kibbe_confidence: float
    kibbe_family: str


class AnalysisResponse(BaseModel):
    measurements: Measurements
    classifications: Classifications
    recommendations: dict
    affiliate_links: list
    processing_time_ms: int


def fake_analyze(height_cm: float) -> AnalysisResponse:
    # Loosely height-scaled random values so the demo doesn't look absurd.
    # Explicit error margin per measurement -- spec Section 9 "[REVISED]".
    scale = height_cm / 168.0

    def m(base: float, margin: float = 2.0) -> MeasurementWithMargin:
        return MeasurementWithMargin(value=round(base * scale + random.uniform(-1, 1), 1), marginCm=margin)

    return AnalysisResponse(
        measurements=Measurements(
            bust_cm=m(92.0),
            waist_cm=m(71.0),
            hip_cm=m(98.0),
            shoulder_cm=m(40.0, margin=1.5),
            torso_length_cm=m(45.0, margin=2.5),
            leg_length_cm=m(82.0, margin=2.5),
        ),
        classifications=Classifications(
            standard_shape="hourglass",
            standard_confidence=0.72,  # deliberately not overclaiming confidence in a mock
            kibbe_type="Soft Classic",
            kibbe_family="Classic",
            kibbe_confidence=0.55,
        ),
        recommendations={},
        affiliate_links=[],
        processing_time_ms=0,
    )


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    userId: str = Form(...),
    heightCm: float = Form(...),
    metadata: str = Form(...),
    # views[i] and views[i][image] fields arrive as additional form fields;
    # FastAPI doesn't have a first-class "dynamic indexed multipart array"
    # binder, so in a real implementation parse `request.form()` directly.
    # Omitted here as accepted-but-unused to keep the mock simple.
):
    start = time.time()
    result = fake_analyze(heightCm)
    result.processing_time_ms = int((time.time() - start) * 1000)
    return result


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
