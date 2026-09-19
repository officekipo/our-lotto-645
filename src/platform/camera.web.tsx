import React, { useEffect, useRef } from 'react';
import jsQR from 'jsqr';

type CameraPermission = { granted: boolean };
type CameraPermissionHook = readonly [CameraPermission | null, () => Promise<CameraPermission>];

type Props = {
  className?: string;
  style?: React.CSSProperties;
  facing?: 'front' | 'back';
  active?: boolean;
  barcodeScannerSettings?: { barcodeTypes?: string[] };
  onBarcodeScanned?: (result: { data: string }) => void;
  onMountError?: (event: { message: string }) => void;
};

function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotFoundError') return '카메라를 찾을 수 없습니다. PC에 카메라가 연결되어 있는지 확인해 주세요.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return '브라우저의 카메라 권한을 허용해 주세요. HTTPS 또는 localhost 환경이 필요합니다.';
  if (name === 'NotReadableError') return '카메라가 다른 앱에서 사용 중입니다. 다른 카메라 앱을 종료한 후 다시 시도해 주세요.';
  return error instanceof Error ? error.message : '카메라를 시작할 수 없습니다.';
}

export function useCameraPermissions(): CameraPermissionHook {
  const requestPermission = async (): Promise<CameraPermission> => {
    // Web에서는 실제 권한/카메라 요청을 CameraView의 getUserMedia()에서 수행합니다.
    // 여기서 별도 getUserMedia()를 먼저 호출하면 권한 실패 시 CameraView 자체가
    // 마운트되지 않아 브라우저의 정확한 오류/설정 안내를 보여줄 수 없습니다.
    return { granted: true };
  };

  return [null, requestPermission];
}

export function CameraView({ className, style, facing = 'back', active = true, onBarcodeScanned, onMountError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let frameId = 0;

    const start = async () => {
      try {
        if (typeof window === 'undefined' || !window.isSecureContext) {
          throw new Error('웹 카메라는 HTTPS 또는 localhost에서만 사용할 수 있습니다. PC에서는 localhost로 접속하고, 모바일에서는 HTTPS 주소로 접속해 주세요.');
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('이 브라우저에서는 카메라 기능을 사용할 수 없습니다. 최신 Chrome 또는 Edge에서 다시 시도해 주세요.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facing === 'front' ? 'user' : { ideal: 'environment' } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;

        const scan = () => {
          if (cancelled || scannedRef.current || video.readyState < 2) return;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width && height) {
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);
            const image = context.getImageData(0, 0, width, height);
            const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
            if (code?.data) {
              scannedRef.current = true;
              onBarcodeScanned?.({ data: code.data });
              return;
            }
          }
          frameId = requestAnimationFrame(scan);
        };
        frameId = requestAnimationFrame(scan);
      } catch (error) {
        if (!cancelled) onMountError?.({ message: cameraMessage(error) });
      }
    };

    scannedRef.current = false;
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [active, facing, onBarcodeScanned, onMountError]);

  return React.createElement('video', {
    ref: videoRef,
    className,
    style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...(style ?? {}) },
    playsInline: true,
    muted: true,
    autoPlay: true,
  });
}
