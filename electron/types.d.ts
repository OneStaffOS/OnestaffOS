/**
 * Type definitions for Electron API
 * Add this to make TypeScript recognize window.electronAPI
 */

export interface ServiceStatus {
  name: string;
  running: boolean;
  pid: number | undefined;
}

export interface StartupProgress {
  service: string;
  message: string;
}

export interface ElectronAPI {
  getServiceStatus: () => Promise<ServiceStatus[]>;
  restartService: (serviceName: string) => Promise<{ success: boolean }>;
  checkInternet: () => Promise<boolean>;
  onStartupProgress: (callback: (data: StartupProgress) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
