/**
 * Electron Main Process
 * 
 * Manages the lifecycle of:
 * - NestJS Backend (port 3000)
 * - Next.js Frontend (port 3001)
 * - Gunicorn Python Service (port 5050)
 * 
 * Security: Node integration disabled in renderer, IPC through preload script
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import * as dns from 'dns';
import * as fs from 'fs';

// Service configuration
interface ServiceConfig {
  name: string;
  port: number;
  startCommand: string;
  startArgs: string[];
  cwd: string;
  healthCheckPath: string;
  startupTimeout: number;
}

class ServiceManager {
  private processes: Map<string, ChildProcess> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private isQuitting = false;
  private ipcHandlersSetup = false;
  private logFilePath: string;
  private logStream: fs.WriteStream;

  // Get workspace root - different paths for dev vs packaged
  // In packaged apps, extraResources go to process.resourcesPath directly
  private workspaceRoot = app.isPackaged 
    ? process.resourcesPath
    : path.join(__dirname, '..', '..');

  private services: ServiceConfig[] = [
    {
      name: 'Backend',
      port: 3000,
      startCommand: './start-electron.sh',
      startArgs: [],
      cwd: path.join(this.workspaceRoot, 'Backend'),
      healthCheckPath: '/api/v1/health',
      startupTimeout: 60000, // 60 seconds
    },
    {
      name: 'Gunicorn',
      port: 5050,
      startCommand: './start-production.sh',
      startArgs: [],
      cwd: path.join(this.workspaceRoot, 'Backend', 'src', 'chatbot'),
      healthCheckPath: '/health',
      startupTimeout: 60000, // 60 seconds (needs time for 4 workers to initialize)
    },
    {
      name: 'Biometrics',
      port: 6000,
      startCommand: './start-production.sh',
      startArgs: [],
      cwd: path.join(this.workspaceRoot, 'Backend', 'src', 'biometrics-service'),
      healthCheckPath: '/health',
      startupTimeout: 60000,
    },
    {
      name: 'Frontend',
      port: 3001,
      startCommand: './start-electron.sh',
      startArgs: [],
      cwd: path.join(this.workspaceRoot, 'frontend'),
      healthCheckPath: '/',
      startupTimeout: 60000, // 60 seconds
    },
  ];

  constructor() {
    // Setup log file
    const logsDir = app.getPath('logs');
    this.logFilePath = path.join(logsDir, 'onestaff-os.log');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create write stream for logging
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    
    this.log('='.repeat(80));
    this.log(`OneStaff OS starting at ${new Date().toISOString()}`);
    this.log(`App version: ${app.getVersion()}`);
    this.log(`Electron version: ${process.versions.electron}`);
    this.log(`Node version: ${process.versions.node}`);
    this.log(`Platform: ${process.platform} ${process.arch}`);
    this.log(`Packaged: ${app.isPackaged}`);
    this.log(`Workspace root: ${this.workspaceRoot}`);
    this.log(`Log file: ${this.logFilePath}`);
    this.log('='.repeat(80));
    
    this.setupAppHandlers();
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.logStream.write(logMessage + '\n');
  }

  private logError(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage, error);
    this.logStream.write(logMessage + '\n');
    if (error) {
      this.logStream.write(`  ${error.stack || error}\n`);
    }
  }

  private setupAppHandlers(): void {
    app.on('ready', () => this.onAppReady());
    app.on('window-all-closed', () => this.onWindowsClosed());
    app.on('activate', () => this.onActivate());
    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  private async onAppReady(): Promise<void> {
    try {
      // Check internet connectivity first
      const hasInternet = await this.checkInternetConnectivity();
      if (!hasInternet) {
        await this.showNoInternetDialog();
        app.quit();
        return;
      }

      // Create the main window (hidden initially)
      this.createMainWindow();

      // Start all services
      await this.startAllServices();

      // Load the actual application and show the window
      if (this.mainWindow) {
        this.log('📱 Loading application UI...');
        await this.mainWindow.loadURL('http://localhost:3001');
        this.mainWindow.show();
        this.mainWindow.focus();
        this.log('✅ Application window ready');
      }
    } catch (error) {
      this.logError('Failed to start application', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.showErrorDialog('Startup Failed', errorMessage);
      app.quit();
    }
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      show: false, // Don't show until services are ready
      backgroundColor: '#667eea',
      title: 'OneStaff OS',
      webPreferences: {
        nodeIntegration: false, // Security: disable Node.js in renderer
        contextIsolation: true, // Security: isolate context
        sandbox: true, // Security: enable sandbox
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Show loading screen
    this.mainWindow.loadFile(path.join(__dirname, 'loading.html'));

    // Setup application menu
    this.setupMenu();

    // Handle window close
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.handleWindowClose();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Setup IPC handlers
    this.setupIpcHandlers();
  }

  private setupMenu(): void {
    const template: any[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Log File',
            accelerator: 'CmdOrCtrl+L',
            click: () => {
              shell.openPath(this.logFilePath).then(error => {
                if (error) {
                  dialog.showMessageBox({
                    type: 'info',
                    title: 'Log File Location',
                    message: `Log file is located at:\n\n${this.logFilePath}\n\nYou can open this file with Console.app or any text editor.`,
                    buttons: ['OK', 'Open Folder', 'Copy Path'],
                  }).then(result => {
                    if (result.response === 1) {
                      shell.showItemInFolder(this.logFilePath);
                    } else if (result.response === 2) {
                      require('electron').clipboard.writeText(this.logFilePath);
                    }
                  });
                }
              });
            },
          },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Prevent duplicate handler registration
    if (this.ipcHandlersSetup) {
      this.log('⚠️  IPC handlers already setup, skipping...');
      return;
    }

    this.log('🔧 Setting up IPC handlers...');
    
    ipcMain.handle('get-service-status', () => {
      return Array.from(this.processes.entries()).map(([name, process]) => ({
        name,
        running: process.exitCode === null,
        pid: process.pid,
      }));
    });

    ipcMain.handle('restart-service', async (_, serviceName: string) => {
      const service = this.services.find((s) => s.name === serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      await this.stopService(service);
      await this.startService(service);
      return { success: true };
    });

    ipcMain.handle('check-internet', async () => {
      return await this.checkInternetConnectivity();
    });

    this.ipcHandlersSetup = true;
    this.log('✅ IPC handlers setup complete');
  }

  private async checkInternetConnectivity(): Promise<boolean> {
    // Try multiple methods to check connectivity
    
    // Method 1: Try to reach Google DNS
    const dnsCheck = new Promise<boolean>((resolve) => {
      dns.resolve('google.com', (err) => {
        resolve(!err);
      });
    });

    // Method 2: Try a simple HTTP request
    const httpCheck = new Promise<boolean>((resolve) => {
      const req = http.get('http://www.google.com', { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });

    try {
      // If either method succeeds, we have internet
      const [dns, http] = await Promise.all([dnsCheck, httpCheck]);
      return dns || http;
    } catch (error) {
      // If both fail, assume no internet
      return false;
    }
  }

  private async startAllServices(): Promise<void> {
    this.log('🚀 Starting all services...');

    // Start services in order: Backend → Gunicorn → Frontend
    for (const service of this.services) {
      await this.startService(service);
    }

    this.log('✅ All services started successfully');
  }

  private async startService(service: ServiceConfig): Promise<void> {
    this.log(`Starting ${service.name}...`);
    this.log(`  Working directory: ${service.cwd}`);
    this.log(`  Command: ${service.startCommand}`);

    // Check if port is already in use
    const portAvailable = await this.isPortAvailable(service.port);
    if (!portAvailable) {
      throw new Error(
        `Port ${service.port} is already in use (required for ${service.name})`
      );
    }

    // Spawn the process
    // Use absolute path to shell to avoid ENOENT errors
    const childProcess = spawn(service.startCommand, service.startArgs, {
      cwd: service.cwd,
      stdio: 'pipe',
      shell: '/bin/bash',
      env: {
        ...process.env,
        PORT: service.port.toString(),
        NODE_ENV: 'production',
      },
    });

    // Store the process
    this.processes.set(service.name, childProcess);

    // Log output
    childProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      this.log(`[${service.name}] ${output}`);
    });

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      this.logError(`[${service.name}]`, output);
    });

    // Handle process spawn errors
    childProcess.on('error', (err) => {
      this.logError(`[${service.name}] Failed to start process`, err);
    });

    // Handle process exit
    childProcess.on('exit', (code, signal) => {
      this.log(
        `[${service.name}] Process exited with code ${code}, signal ${signal}`
      );
      this.processes.delete(service.name);

      // If not quitting, restart the service
      if (!this.isQuitting) {
        this.log(`[${service.name}] Restarting in 5 seconds...`);
        setTimeout(() => {
          this.startService(service).catch((err) => {
            this.logError(`Failed to restart ${service.name}`, err);
          });
        }, 5000);
      }
    });

    // Wait for service to be healthy
    await this.waitForService(service);
    this.log(`✅ ${service.name} is ready`);
  }

  private async stopService(service: ServiceConfig): Promise<void> {
    const process = this.processes.get(service.name);
    if (!process) return;

    return new Promise((resolve) => {
      process.once('exit', () => resolve());
      process.kill('SIGTERM');

      // Force kill after 10 seconds
      setTimeout(() => {
        if (this.processes.has(service.name)) {
          process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  private async stopAllServices(): Promise<void> {
    this.log('🛑 Stopping all services...');

    // Stop in reverse order: Frontend → Gunicorn → Backend
    const reverseServices = [...this.services].reverse();

    for (const service of reverseServices) {
      await this.stopService(service);
    }

    this.log('✅ All services stopped');
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();

      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  private async waitForService(service: ServiceConfig): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 3000; // Check every 3 seconds

    // Gunicorn: Skip health checks due to slow AI model loading
    // Just wait a fixed period for the process to initialize
    if (service.name === 'Gunicorn') {
      this.log('⏳ Waiting 15 seconds for Gunicorn to initialize (AI model loading)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      this.log(`✅ ${service.name} initialization period complete`);
      return;
    }

    let attemptCount = 0;
    while (Date.now() - startTime < service.startupTimeout) {
      try {
        attemptCount++;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.log(`[${service.name}] Health check attempt ${attemptCount} (${elapsed}s elapsed)...`);
        
        const isHealthy = await this.checkServiceHealth(service);
        if (isHealthy) {
          this.log(`✅ ${service.name} is ready (took ${elapsed}s)`);
          return;
        }
        this.log(`[${service.name}] Not healthy yet, will retry...`);
      } catch (error: any) {
        this.log(`[${service.name}] Health check error: ${error.message || error}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      // Update loading screen
      if (this.mainWindow) {
        this.mainWindow.webContents.send('startup-progress', {
          service: service.name,
          message: `Starting ${service.name}...`,
        });
      }
    }

    throw new Error(
      `${service.name} failed to start within ${service.startupTimeout / 1000} seconds`
    );
  }

  private async checkServiceHealth(service: ServiceConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          hostname: 'localhost',
          port: service.port,
          path: service.healthCheckPath,
          timeout: 3000,
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  private async handleWindowClose(): Promise<void> {
    const choice = await dialog.showMessageBox(this.mainWindow!, {
      type: 'question',
      buttons: ['Minimize to Tray', 'Quit Application'],
      defaultId: 0,
      title: 'Close OneStaff OS',
      message: 'Do you want to minimize to system tray or quit the application?',
      detail: 'Minimizing will keep the application running in the background.',
    });

    if (choice.response === 1) {
      // Quit
      this.isQuitting = true;
      await this.stopAllServices();
      app.quit();
    } else {
      // Minimize to tray (implement if needed)
      this.mainWindow?.hide();
    }
  }

  private onWindowsClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private async onActivate(): Promise<void> {
    if (this.mainWindow === null) {
      this.createMainWindow();
    } else {
      this.mainWindow.show();
    }
  }

  private async showNoInternetDialog(): Promise<void> {
    await dialog.showErrorBox(
      'No Internet Connection',
      'OneStaff OS requires an internet connection to access MongoDB Atlas.\n\n' +
        'Please check your network connection and try again.'
    );
  }

  private async showErrorDialog(title: string, message: string): Promise<void> {
    await dialog.showErrorBox(title, message);
  }
}

// Start the application
new ServiceManager();
