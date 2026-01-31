/**
 * Electron Preload Script
 * 
 * Securely exposes IPC communication to the renderer process.
 * This is the ONLY bridge between the main process and renderer.
 * 
 * Security:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
interface ElectronAPI {
  // Service management
  getServiceStatus: () => Promise<ServiceStatus[]>;
  restartService: (serviceName: string) => Promise<{ success: boolean }>;
  checkInternet: () => Promise<boolean>;
  
  // Event listeners
  onStartupProgress: (callback: (data: StartupProgress) => void) => void;
}

interface ServiceStatus {
  name: string;
  running: boolean;
  pid: number | undefined;
}

interface StartupProgress {
  service: string;
  message: string;
}

// Expose protected methods to renderer
const electronAPI: ElectronAPI = {
  // Service status
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  
  // Restart a specific service
  restartService: (serviceName: string) => 
    ipcRenderer.invoke('restart-service', serviceName),
  
  // Check internet connectivity
  checkInternet: () => ipcRenderer.invoke('check-internet'),
  
  // Listen for startup progress updates
  onStartupProgress: (callback) => {
    ipcRenderer.on('startup-progress', (_, data) => callback(data));
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer (add this to a .d.ts file)
export type { ElectronAPI, ServiceStatus, StartupProgress };
