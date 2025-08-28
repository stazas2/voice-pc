import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandRequest, ApiResponse } from './types';
import { logger } from './logger';

const execFileAsync = promisify(execFile);

export class WindowsCommands {
  private appsConfig: Record<string, string> = {};

  constructor() {
    this.loadAppsConfig();
  }

  private loadAppsConfig(): void {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'apps.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.appsConfig = JSON.parse(configData);
      logger.info('Apps configuration loaded', { appCount: Object.keys(this.appsConfig).length });
    } catch (error) {
      logger.error('Failed to load apps configuration', error);
      this.appsConfig = {};
    }
  }

  private expandPath(appPath: string): string {
    if (appPath.includes('%USERNAME%')) {
      const username = process.env.USERNAME || process.env.USER || '';
      return appPath.replace(/%USERNAME%/g, username);
    }
    return appPath;
  }

  private async executeCommand(command: string, args: string[] = [], timeout: number = 10000): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      logger.info(`Executing command: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Command timed out after ${timeout}ms`
        });
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0 || code === null) {
          resolve({
            success: true,
            output: stdout.trim()
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Command exited with code ${code}`
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  private findChrome(): string | null {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe')
    ];

    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        return chromePath;
      }
    }

    return null;
  }

  async executeCommandRequest(request: CommandRequest): Promise<ApiResponse> {
    logger.info('Executing command request', request);

    try {
      switch (request.command) {
        case 'say_ok':
          return { ok: true, action: 'say_ok', details: { message: 'System is operational' } };

        case 'open_notepad':
          const notepadResult = await this.executeCommand('start', ['""', 'notepad.exe'], 5000);
          if (notepadResult.success) {
            return { ok: true, action: 'open_notepad', details: { app: 'notepad.exe' } };
          } else {
            return { ok: false, error: `Failed to open notepad: ${notepadResult.error}` };
          }

        case 'open_chrome':
          if (!request.url) {
            return { ok: false, error: 'URL is required for open_chrome command' };
          }

          const chromePath = this.findChrome();
          let chromeResult;

          if (chromePath) {
            chromeResult = await this.executeCommand('start', ['""', `"${chromePath}"`, request.url], 5000);
          } else {
            // Fallback to default browser
            chromeResult = await this.executeCommand('start', ['""', request.url], 5000);
          }

          if (chromeResult.success) {
            return { 
              ok: true, 
              action: 'open_chrome', 
              details: { 
                url: request.url, 
                method: chromePath ? 'chrome' : 'default_browser' 
              } 
            };
          } else {
            return { ok: false, error: `Failed to open URL: ${chromeResult.error}` };
          }

        case 'shutdown_now':
          const shutdownResult = await this.executeCommand('shutdown', ['/s', '/t', '0'], 3000);
          if (shutdownResult.success) {
            return { ok: true, action: 'shutdown_now', details: { delay: '0 seconds' } };
          } else {
            return { ok: false, error: `Failed to shutdown: ${shutdownResult.error}` };
          }

        case 'sleep_now':
          // Use PowerShell for reliable sleep
          const sleepResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $true, $true)'], 5000);
          if (sleepResult.success) {
            return { ok: true, action: 'sleep_now', details: { method: 'powershell_suspend' } };
          } else {
            // Fallback method
            const fallbackResult = await this.executeCommand('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'], 5000);
            if (fallbackResult.success) {
              return { ok: true, action: 'sleep_now', details: { method: 'rundll32_powrprof' } };
            } else {
              return { ok: false, error: `Failed to sleep system: ${fallbackResult.error}` };
            }
          }

        case 'open_app':
          if (!request.alias) {
            return { ok: false, error: 'Alias is required for open_app command' };
          }

          const appPath = this.appsConfig[request.alias.toLowerCase()];
          if (!appPath) {
            return { 
              ok: false, 
              error: `Unknown app alias: ${request.alias}. Available: ${Object.keys(this.appsConfig).join(', ')}` 
            };
          }

          const expandedPath = this.expandPath(appPath);
          
          // Check if it's a simple executable name or full path
          let appResult;
          if (expandedPath.includes('\\') || expandedPath.includes('/')) {
            // Full path - check if exists
            if (!fs.existsSync(expandedPath)) {
              return { ok: false, error: `Application not found at path: ${expandedPath}` };
            }
            appResult = await this.executeCommand('start', ['""', `"${expandedPath}"`], 5000);
          } else {
            // Simple executable name
            appResult = await this.executeCommand('start', ['""', expandedPath], 5000);
          }

          if (appResult.success) {
            return { 
              ok: true, 
              action: 'open_app', 
              details: { 
                alias: request.alias, 
                path: expandedPath 
              } 
            };
          } else {
            return { ok: false, error: `Failed to open app: ${appResult.error}` };
          }

        default:
          return { ok: false, error: `Unknown command: ${request.command}` };
      }
    } catch (error) {
      logger.error('Command execution failed', error);
      return { ok: false, error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  getAvailableApps(): string[] {
    return Object.keys(this.appsConfig);
  }

  reloadConfig(): void {
    this.loadAppsConfig();
  }
}

export const windowsCommands = new WindowsCommands();