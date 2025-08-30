import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandRequest, ApiResponse } from './types';
import { logger } from './logger';

// Edge-js интеграция с fallback
let WindowsCommandsEdge: any = null;
let edgeJsAvailable = false;

try {
  WindowsCommandsEdge = require('./windows-commands-edge');
  edgeJsAvailable = true;
  logger.info('✅ Edge-js API loaded successfully');
} catch (error) {
  logger.warn('⚠️ Edge-js not available, using PowerShell fallback:', error instanceof Error ? error.message : 'Unknown error');
}

const execFileAsync = promisify(execFile);

export class WindowsCommands {
  private appsConfig: Record<string, string> = {};

  constructor() {
    this.loadAppsConfig();
  }

  private shouldUseEdgeJs(command: string): boolean {
    // Команды, которые поддерживают edge-js
    const edgeJsCommands = [
      'lock_screen',
      'minimize_all', 
      'show_desktop',
      'empty_recycle_bin',
      'volume_mute',
      'volume_unmute',
      'volume_set',
      'close_window',
      'focus_window',
      'maximize_window'
    ];
    return edgeJsAvailable && edgeJsCommands.includes(command);
  }

  private async executeEdgeJsCommand(request: CommandRequest): Promise<ApiResponse> {
    if (!WindowsCommandsEdge) {
      throw new Error('Edge-js not available');
    }

    try {
      let result: any;
      const startTime = Date.now();
      
      switch (request.command) {
        case 'lock_screen':
          result = await WindowsCommandsEdge.lockScreen();
          break;
        case 'minimize_all':
          result = await WindowsCommandsEdge.minimizeAllWindows();
          break;
        case 'show_desktop':
          result = await WindowsCommandsEdge.showDesktop();
          break;
        case 'empty_recycle_bin':
          result = await WindowsCommandsEdge.emptyRecycleBin();
          break;
        case 'volume_mute':
        case 'volume_unmute':
          result = await WindowsCommandsEdge.volumeMute();
          break;
        case 'volume_set':
          result = await WindowsCommandsEdge.volumeSet(request.level || 50);
          break;
        case 'close_window':
          result = await WindowsCommandsEdge.closeWindow(request.processName || 'unknown');
          break;
        case 'focus_window':
          result = await WindowsCommandsEdge.focusWindow(request.processName || 'unknown');
          break;
        case 'maximize_window':
          result = await WindowsCommandsEdge.maximizeWindow(request.processName || 'unknown');
          break;
        default:
          throw new Error(`Edge-js command not implemented: ${request.command}`);
      }

      const duration = Date.now() - startTime;
      
      if (result.success) {
        return { 
          ok: true, 
          action: request.command, 
          details: { 
            method: 'edge-js', 
            duration: `${duration}ms`,
            ...result
          } 
        };
      } else {
        return { 
          ok: false, 
          error: `Edge-js command failed: ${result.error}` 
        };
      }
    } catch (error) {
      // Fallback на PowerShell при ошибке Edge-js
      logger.warn(`Edge-js error for ${request.command}, falling back to PowerShell:`, error);
      return this.executePowerShellCommand(request);
    }
  }

  private async executePowerShellCommand(request: CommandRequest): Promise<ApiResponse> {
    // Оригинальная PowerShell логика для fallback
    const startTime = Date.now();
    let result: any;

    try {
      switch (request.command) {
        case 'lock_screen':
          result = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'lock-screen.ps1')], 5000);
          break;
        case 'minimize_all':
          result = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'minimize-all.ps1')], 5000);
          break;
        case 'show_desktop':
          result = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'show-desktop.ps1')], 5000);
          break;
        case 'empty_recycle_bin':
          result = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'empty-recycle-bin.ps1')], 5000);
          break;
        case 'volume_set':
          const level = request.level || 50;
          result = await this.executeCommand('powershell', ['-Command', `$vol = ${level}; $wshShell = new-object -com wscript.shell; for($i=0;$i -lt 50;$i++){$wshShell.SendKeys([char]174)}; for($i=0;$i -lt $vol;$i+=2){$wshShell.SendKeys([char]175)}`], 5000);
          break;
        case 'close_window':
          const processName = request.processName || 'unknown';
          result = await this.executeCommand('powershell', ['-Command', `Get-Process -Name "*${processName}*" -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() }; Start-Sleep -Milliseconds 500; Get-Process -Name "*${processName}*" -ErrorAction SilentlyContinue | Stop-Process -Force`], 5000);
          break;
        case 'focus_window':
          const focusProcessName = request.processName || 'unknown';
          result = await this.executeCommand('powershell', ['-Command', `Add-Type -AssemblyName Microsoft.VisualBasic; Get-Process -Name "*${focusProcessName}*" -ErrorAction SilentlyContinue | ForEach-Object { [Microsoft.VisualBasic.Interaction]::AppActivate($_.Id) }`], 5000);
          break;
        case 'maximize_window':
          const maxProcessName = request.processName || 'unknown';
          result = await this.executeCommand('powershell', ['-Command', `Add-Type -AssemblyName System.Windows.Forms; Get-Process -Name "*${maxProcessName}*" -ErrorAction SilentlyContinue | ForEach-Object { [System.Windows.Forms.SendKeys]::SendWait("^{UP}") }`], 5000);
          break;
        default:
          throw new Error(`PowerShell fallback not available for: ${request.command}`);
      }

      const duration = Date.now() - startTime;

      return result.success ? 
        { ok: true, action: request.command, details: { method: 'powershell', duration: `${duration}ms` } } :
        { ok: false, error: `PowerShell command failed: ${result.error}` };

    } catch (error) {
      return { ok: false, error: `PowerShell fallback error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
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

        // Media control commands
        case 'media_pause':
          const pauseResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_PLAY_PAUSE}")'], 3000);
          return pauseResult.success ? 
            { ok: true, action: 'media_pause', details: { message: 'Media paused' } } :
            { ok: false, error: `Failed to pause media: ${pauseResult.error}` };

        case 'media_play':
          const playResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_PLAY_PAUSE}")'], 3000);
          return playResult.success ? 
            { ok: true, action: 'media_play', details: { message: 'Media resumed' } } :
            { ok: false, error: `Failed to resume media: ${playResult.error}` };

        case 'media_next':
          const nextResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_NEXT_TRACK}")'], 3000);
          return nextResult.success ? 
            { ok: true, action: 'media_next', details: { message: 'Next track' } } :
            { ok: false, error: `Failed to next track: ${nextResult.error}` };

        case 'media_previous':
          const prevResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_PREV_TRACK}")'], 3000);
          return prevResult.success ? 
            { ok: true, action: 'media_previous', details: { message: 'Previous track' } } :
            { ok: false, error: `Failed to previous track: ${prevResult.error}` };

        case 'media_stop':
          const stopResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_STOP}")'], 3000);
          return stopResult.success ? 
            { ok: true, action: 'media_stop', details: { message: 'Media stopped' } } :
            { ok: false, error: `Failed to stop media: ${stopResult.error}` };

        case 'volume_up':
          const volUpResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{VOLUME_UP}")'], 3000);
          return volUpResult.success ? 
            { ok: true, action: 'volume_up', details: { message: 'Volume increased' } } :
            { ok: false, error: `Failed to increase volume: ${volUpResult.error}` };

        case 'volume_down':
          const volDownResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{VOLUME_DOWN}")'], 3000);
          return volDownResult.success ? 
            { ok: true, action: 'volume_down', details: { message: 'Volume decreased' } } :
            { ok: false, error: `Failed to decrease volume: ${volDownResult.error}` };

        case 'volume_mute':
          const muteResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{VOLUME_MUTE}")'], 3000);
          return muteResult.success ? 
            { ok: true, action: 'volume_mute', details: { message: 'Volume muted' } } :
            { ok: false, error: `Failed to mute volume: ${muteResult.error}` };

        case 'volume_unmute':
          const unmuteResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{VOLUME_MUTE}")'], 3000);
          return unmuteResult.success ? 
            { ok: true, action: 'volume_unmute', details: { message: 'Volume unmuted' } } :
            { ok: false, error: `Failed to unmute volume: ${unmuteResult.error}` };

        // File operations
        case 'open_downloads':
          const downloadsResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'open-downloads.ps1')], 5000);
          return downloadsResult.success ? 
            { ok: true, action: 'open_downloads', details: { path: 'Downloads folder' } } :
            { ok: false, error: `Failed to open downloads: ${downloadsResult.error}` };

        case 'open_documents':
          const docsResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'open-documents.ps1')], 5000);
          return docsResult.success ? 
            { ok: true, action: 'open_documents', details: { path: 'Documents folder' } } :
            { ok: false, error: `Failed to open documents: ${docsResult.error}` };

        case 'open_desktop':
          const desktopResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'open-desktop.ps1')], 5000);
          return desktopResult.success ? 
            { ok: true, action: 'open_desktop', details: { path: 'Desktop folder' } } :
            { ok: false, error: `Failed to open desktop: ${desktopResult.error}` };

        case 'open_latest_download':
          const latestResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'open-latest-download.ps1')], 5000);
          return latestResult.success ? 
            { ok: true, action: 'open_latest_download', details: { message: 'Latest download opened' } } :
            { ok: false, error: `Failed to open latest download: ${latestResult.error}` };

        // System information commands
        case 'system_cpu':
          const cpuResult = await this.executeCommand('powershell', ['-Command', 
            'Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select -ExpandProperty Average'
          ], 5000);
          return cpuResult.success ? 
            { ok: true, action: 'system_cpu', data: { cpu: cpuResult.output?.trim() + '%' } } :
            { ok: false, error: `Failed to get CPU info: ${cpuResult.error}` };

        case 'system_memory':
          const memResult = await this.executeCommand('powershell', ['-Command', 
            '$total = (Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory; $available = (Get-WmiObject -Class Win32_OperatingSystem).FreePhysicalMemory * 1024; [math]::Round(($total - $available) / $total * 100, 1)'
          ], 5000);
          return memResult.success ? 
            { ok: true, action: 'system_memory', data: { memory: memResult.output?.trim() + '%' } } :
            { ok: false, error: `Failed to get memory info: ${memResult.error}` };

        case 'system_disk':
          const diskResult = await this.executeCommand('powershell', ['-Command', 
            'Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" | Select-Object @{Name="Drive";Expression={$_.DeviceID}}, @{Name="FreeGB";Expression={[math]::Round($_.FreeSpace/1GB,1)}}, @{Name="TotalGB";Expression={[math]::Round($_.Size/1GB,1)}} | Format-Table -AutoSize | Out-String'
          ], 5000);
          return diskResult.success ? 
            { ok: true, action: 'system_disk', data: { disk: diskResult.output?.trim() } } :
            { ok: false, error: `Failed to get disk info: ${diskResult.error}` };

        case 'system_ip':
          const ipResult = await this.executeCommand('powershell', ['-Command', 
            '(Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing).Content.Trim()'
          ], 5000);
          return ipResult.success ? 
            { ok: true, action: 'system_ip', data: { ip: ipResult.output?.trim() } } :
            { ok: false, error: `Failed to get IP info: ${ipResult.error}` };

        case 'system_info':
          const infoResult = await this.executeCommand('powershell', ['-Command', 
            'Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory, CsProcessors | Format-List | Out-String'
          ], 5000);
          return infoResult.success ? 
            { ok: true, action: 'system_info', data: { info: infoResult.output?.trim() } } :
            { ok: false, error: `Failed to get system info: ${infoResult.error}` };

        // Windows management commands (Edge-js приоритет)
        case 'minimize_all':
        case 'show_desktop':
        case 'lock_screen':
        case 'empty_recycle_bin':
        case 'volume_mute':
        case 'volume_unmute':
          return this.executeEdgeJsCommand(request);
        case 'volume_set':
        case 'close_window':
        case 'focus_window':
          if (this.shouldUseEdgeJs(request.command)) {
            return this.executeEdgeJsCommand(request);
          } else {
            return this.executePowerShellCommand(request);
          }
        case 'maximize_window':
          if (this.shouldUseEdgeJs(request.command)) {
            return this.executeEdgeJsCommand(request);
          } else {
            return this.executePowerShellCommand(request);
          }

        // Screenshot and screen recording
        case 'screenshot':
          const screenshotResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'screenshot.ps1')], 10000);
          return screenshotResult.success ? 
            { ok: true, action: 'screenshot', details: { path: screenshotResult.output?.trim() } } :
            { ok: false, error: `Failed to take screenshot: ${screenshotResult.error}` };

        case 'screen_record':
          const recordResult = await this.executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'scripts', 'screen-record.ps1'), '-Duration', (request.duration || 10).toString()], (request.duration || 10) * 1000 + 5000);
          return recordResult.success ? 
            { ok: true, action: 'screen_record', details: { duration: request.duration || 10, message: 'Screen recorded' } } :
            { ok: false, error: `Failed to record screen: ${recordResult.error}` };

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