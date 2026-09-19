import type React from 'react';

type CameraPermission = {
  granted: boolean;
};

type CameraPermissionHook = readonly [
  CameraPermission | null,
  () => Promise<CameraPermission>
];

export declare const CameraView: React.ComponentType<{
  className?: string;
  style?: unknown;
  facing?: 'front' | 'back';
  active?: boolean;
  barcodeScannerSettings?: { barcodeTypes?: string[] };
  onBarcodeScanned?: (result: { data: string }) => void;
  onMountError?: (event: { message: string }) => void;
}>;

export declare function useCameraPermissions(): CameraPermissionHook;
