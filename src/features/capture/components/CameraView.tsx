import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { ImageAsset, PoseFrameResult } from '../types/capture';
import './CameraView.css';

export interface CameraViewHandle {
  takePhoto: () => Promise<ImageAsset | null>;
}

interface Props {
  onPoseFrame: (result: PoseFrameResult) => void;
  active: boolean;
}

/**
 * Web equivalent of the RN vision-camera CameraView: getUserMedia + <video>
 * instead of the native Camera component, and a requestAnimationFrame loop
 * driving MediaPipe detection instead of a vision-camera frame processor.
 * Same CameraViewHandle.takePhoto() contract, now producing a real Blob via
 * canvas instead of RN's native file-path photo capture.
 */
export const CameraView = forwardRef<CameraViewHandle, Props>(({ onPoseFrame, active }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');

  const { detectFrame } = usePoseDetection(onPoseFrame);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPermissionState('granted');
      })
      .catch(() => setPermissionState('denied'));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active || permissionState !== 'granted') return;

    const loop = () => {
      if (videoRef.current) detectFrame(videoRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, permissionState, detectFrame]);

  useImperativeHandle(ref, () => ({
    takePhoto: async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return null;

      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) return null;

      return { objectUrl: URL.createObjectURL(blob), blob, width, height };
    },
  }));

  if (permissionState === 'denied') {
    // Permission-denial handling per spec Section 10 -- a real implementation
    // should render a dedicated "camera access needed" state with guidance to
    // re-enable it in browser site settings.
    return <div className="camera-placeholder" />;
  }

  return (
    <div className="camera-container">
      <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="camera-canvas-hidden" />
    </div>
  );
});
