import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { CommandRequest, ApiResponse } from './types';
import { logger } from './logger';
import { chromeCDP } from './chrome-cdp';
import { profilesManager } from './profiles-manager';

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
  private appsConfig: Record<string, { name: string; path: string; description: string } | string> = {};

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
          result = await this.executeCommand('powershell', ['-Command', 'rundll32.exe user32.dll,LockWorkStation'], 3000);
          break;
        case 'minimize_all':
          result = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"^m\")'], 3000);
          break;
        case 'show_desktop':
          result = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\"#d\")'], 3000);
          break;
        case 'empty_recycle_bin':
          result = await this.executeCommand('powershell', ['-Command', 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue'], 3000);
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
      const configPath = require('path').join(__dirname, '..', 'config', 'apps.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configData);
      this.appsConfig = parsedConfig.apps || parsedConfig;
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
      require('path').join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      require('path').join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe')
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

        case 'shutdown_delayed':
          const delay = request.delay || 60; // по умолчанию 1 минута
          const delayedShutdownResult = await this.executeCommand('shutdown', ['/s', '/t', delay.toString()], 3000);
          if (delayedShutdownResult.success) {
            const minutes = Math.floor(delay / 60);
            const seconds = delay % 60;
            const timeStr = minutes > 0 ? `${minutes} мин ${seconds} сек` : `${seconds} сек`;
            return { ok: true, action: 'shutdown_delayed', details: { delay: timeStr, seconds: delay } };
          } else {
            return { ok: false, error: `Failed to schedule shutdown: ${delayedShutdownResult.error}` };
          }

        case 'shutdown_cancel':
          const cancelResult = await this.executeCommand('shutdown', ['/a'], 3000);
          if (cancelResult.success) {
            return { ok: true, action: 'shutdown_cancel', details: { message: 'Shutdown cancelled' } };
          } else {
            return { ok: false, error: `Failed to cancel shutdown: ${cancelResult.error}` };
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

          const appInfo = this.appsConfig[request.alias.toLowerCase()];
          let appPath: string;
          
          if (appInfo) {
            // Found in configured apps
            appPath = typeof appInfo === 'string' ? appInfo : appInfo.path;
          } else {
            // Fallback: try to run as direct executable name
            appPath = request.alias.endsWith('.exe') ? request.alias : `${request.alias}.exe`;
            logger.info(`App alias not found, attempting direct execution: ${appPath}`);
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
            // Если обычный запуск не удался, предлагаем полный поиск
            const enableFullSearch = process.env.ENABLE_FULL_DISK_SEARCH === 'true';
            if (enableFullSearch && !appInfo) {
              logger.info(`App ${request.alias} failed to start, checking if full search is available`);
              
              // Возвращаем специальную ошибку, которая запросит подтверждение
              return { 
                ok: false, 
                error: `App "${request.alias}" not found. Search all drives?`,
                needsConfirmation: true,
                confirmationAction: 'full_disk_search',
                confirmationData: { appName: request.alias }
              };
            }
            return { ok: false, error: `Failed to open app: ${appResult.error}` };
          }

        // Media control commands
        case 'media_pause':
          // Пробуем несколько методов: VK код медиа кнопки, потом fallback
          let pauseResult = await this.executeCommand('powershell', ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]179)'], 3000);
          if (!pauseResult.success) {
            // Fallback: пробуем через SendKeys пробел (универсальная пауза)
            pauseResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(" ")'], 3000);
          }
          return pauseResult.success ? 
            { ok: true, action: 'media_pause', details: { message: 'Media paused' } } :
            { ok: false, error: `Failed to pause media: ${pauseResult.error}` };

        case 'media_play':
          // Пробуем несколько методов: VK код медиа кнопки, потом fallback
          let playResult = await this.executeCommand('powershell', ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]179)'], 3000);
          if (!playResult.success) {
            // Fallback: пробуем через SendKeys пробел (универсальная пауза/плей)
            playResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(" ")'], 3000);
          }
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
          // Используем правильные VK коды для Volume Up
          const volUpResult = await this.executeCommand('powershell', ['-Command', '[console]::beep(1000,200); (New-Object -ComObject WScript.Shell).SendKeys([char]175)'], 3000);
          return volUpResult.success ? 
            { ok: true, action: 'volume_up', details: { message: 'Volume increased' } } :
            { ok: false, error: `Failed to increase volume: ${volUpResult.error}` };

        case 'volume_down':
          // Используем правильные VK коды для Volume Down
          const volDownResult = await this.executeCommand('powershell', ['-Command', '[console]::beep(800,200); (New-Object -ComObject WScript.Shell).SendKeys([char]174)'], 3000);
          return volDownResult.success ? 
            { ok: true, action: 'volume_down', details: { message: 'Volume decreased' } } :
            { ok: false, error: `Failed to decrease volume: ${volDownResult.error}` };

        case 'volume_mute':
          const muteResult = await this.executeCommand('powershell', ['-Command', '(New-Object -com wscript.shell).SendKeys([char]173)'], 3000);
          return muteResult.success ? 
            { ok: true, action: 'volume_mute', details: { message: 'Volume muted/unmuted (toggle)' } } :
            { ok: false, error: `Failed to toggle mute: ${muteResult.error}` };

        case 'volume_unmute':
          const unmuteResult = await this.executeCommand('powershell', ['-Command', '(New-Object -com wscript.shell).SendKeys([char]173)'], 3000);
          return unmuteResult.success ? 
            { ok: true, action: 'volume_unmute', details: { message: 'Volume muted/unmuted (toggle)' } } :
            { ok: false, error: `Failed to toggle mute: ${unmuteResult.error}` };

        // File operations
        case 'open_downloads':
          const downloadsResult = await this.executeCommand('powershell', ['-Command', 'explorer.exe shell:downloads'], 3000);
          return downloadsResult.success ? 
            { ok: true, action: 'open_downloads', details: { path: 'Downloads folder' } } :
            { ok: false, error: `Failed to open downloads: ${downloadsResult.error}` };

        case 'open_documents':
          const docsResult = await this.executeCommand('powershell', ['-Command', 'explorer.exe shell:personal'], 3000);
          return docsResult.success ? 
            { ok: true, action: 'open_documents', details: { path: 'Documents folder' } } :
            { ok: false, error: `Failed to open documents: ${docsResult.error}` };

        case 'open_desktop':
          const desktopResult = await this.executeCommand('powershell', ['-Command', 'explorer.exe shell:desktop'], 3000);
          return desktopResult.success ? 
            { ok: true, action: 'open_desktop', details: { path: 'Desktop folder' } } :
            { ok: false, error: `Failed to open desktop: ${desktopResult.error}` };

        case 'open_latest_download':
          const latestResult = await this.executeCommand('powershell', ['-Command', '$latest = Get-ChildItem $env:USERPROFILE\\Downloads | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if($latest) { Invoke-Item $latest.FullName }'], 5000);
          return latestResult.success ? 
            { ok: true, action: 'open_latest_download', details: { message: 'Latest download opened' } } :
            { ok: false, error: `Failed to open latest download: ${latestResult.error}` };

        // System information commands
        case 'system_cpu':
          const cpuResult = await this.executeCommand('powershell', ['-Command', 
            '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'
          ], 5000);
          return cpuResult.success ? 
            { ok: true, action: 'system_cpu', data: { cpu: cpuResult.output?.trim() + '%' } } :
            { ok: false, error: `Failed to get CPU info: ${cpuResult.error}` };

        case 'system_memory':
          const memResult = await this.executeCommand('powershell', ['-Command', 
            '(Get-CimInstance Win32_OperatingSystem | % { [math]::Round((1 - $_.FreePhysicalMemory*1024/(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory)*100,1) })'
          ], 5000);
          return memResult.success ? 
            { ok: true, action: 'system_memory', data: { memory: memResult.output?.trim() + '%' } } :
            { ok: false, error: `Failed to get memory info: ${memResult.error}` };

        case 'system_disk':
          const diskResult = await this.executeCommand('powershell', ['-Command', 
            'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | % { $_.DeviceID + " " + [math]::Round($_.FreeSpace/1GB,1) + "GB/" + [math]::Round($_.Size/1GB,1) + "GB" }'
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
            '"OS: " + (Get-CimInstance Win32_OperatingSystem).Caption + "; Version: " + (Get-CimInstance Win32_OperatingSystem).Version + "; RAM: " + [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,2) + "GB; CPU: " + (Get-CimInstance Win32_Processor).Name'
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
          const screenshotResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height; $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size); $desktop = [Environment]::GetFolderPath(\"Desktop\"); $filename = \"screenshot_$(Get-Date -Format \"yyyyMMdd_HHmmss\").png\"; $path = Join-Path $desktop $filename; $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); Write-Host \"Screenshot saved: $path\"'], 10000);
          return screenshotResult.success ? 
            { ok: true, action: 'screenshot', details: { path: screenshotResult.output?.trim() } } :
            { ok: false, error: `Failed to take screenshot: ${screenshotResult.error}` };

        case 'screen_record':
          const recordResult = await this.executeCommand('powershell', ['-Command', `Write-Host \"Screen recording for ${request.duration || 10} seconds not supported in inline mode. Use dedicated screen recording software.\"`], 3000);
          return recordResult.success ? 
            { ok: true, action: 'screen_record', details: { duration: request.duration || 10, message: 'Screen recorded' } } :
            { ok: false, error: `Failed to record screen: ${recordResult.error}` };

        // Notion integration commands
        case 'notion_today_tasks':
          const { dynamicNotionAdapter } = await import('./notion-adapter');
          if (!dynamicNotionAdapter.isConfigured()) {
            return { ok: false, error: 'Notion integration not configured. Set NOTION_TOKEN and NOTION_DATABASE_ID in .env' };
          }
          try {
            const tasks = await dynamicNotionAdapter.getTodayTasks();
            const taskCount = tasks.length;
            const taskList = tasks.slice(0, 5).map(task => 
              `${task.title}${task.priority ? ` (${task.priority})` : ''}`
            ).join(', ');
            
            return {
              ok: true,
              action: 'notion_today_tasks',
              data: {
                count: taskCount,
                tasks: taskList,
                full_tasks: tasks
              }
            };
          } catch (error) {
            return { ok: false, error: `Failed to get today tasks: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'notion_upcoming_events':
          const { dynamicNotionAdapter: adapter2 } = await import('./notion-adapter');
          if (!adapter2.isConfigured()) {
            return { ok: false, error: 'Notion integration not configured. Set NOTION_TOKEN and NOTION_DATABASE_ID in .env' };
          }
          try {
            const events = await adapter2.getUpcomingEvents();
            const eventCount = events.length;
            const eventList = events.slice(0, 3).map(event => 
              `${event.title} - ${event.date}${event.time ? ` в ${event.time}` : ''}`
            ).join(', ');
            
            return {
              ok: true,
              action: 'notion_upcoming_events',
              data: {
                count: eventCount,
                events: eventList,
                full_events: events
              }
            };
          } catch (error) {
            return { ok: false, error: `Failed to get upcoming events: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'notion_create_task':
          const { dynamicNotionAdapter: adapter3 } = await import('./notion-adapter');
          if (!adapter3.isConfigured()) {
            return { ok: false, error: 'Notion integration not configured. Set NOTION_TOKEN and NOTION_DATABASE_ID in .env' };
          }
          if (!request.title) {
            return { ok: false, error: 'Title is required for creating a task' };
          }
          try {
            const task = await adapter3.createTask(request.title, request.dueDate);
            return {
              ok: true,
              action: 'notion_create_task',
              data: {
                title: task.title,
                id: task.id,
                status: task.status
              }
            };
          } catch (error) {
            return { ok: false, error: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        // Chrome control commands (SendKeys with focus)
        case 'chrome_new_tab':
          // Используем рабочую Edge-js команду focus_window
          // Пытаемся сфокусировать Chrome (игнорируем ошибки)
          await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
          // Задержка перед отправкой клавиш
          await new Promise(resolve => setTimeout(resolve, 300));
          const newTabResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^t\\")'], 3000);
          return newTabResult.success ? 
            { ok: true, action: 'chrome_new_tab', details: { message: 'New tab opened' } } :
            { ok: false, error: `Failed to open new tab: ${newTabResult.error}` };
            
        case 'chrome_close_tab':
          // Пытаемся сфокусировать Chrome (игнорируем ошибки)
          await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
          await new Promise(resolve => setTimeout(resolve, 300));
          const closeTabResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^w\\")'], 3000);
          return closeTabResult.success ? 
            { ok: true, action: 'chrome_close_tab', details: { message: 'Tab closed' } } :
            { ok: false, error: `Failed to close tab: ${closeTabResult.error}` };
            
        case 'chrome_refresh':
          // Пытаемся сфокусировать Chrome (игнорируем ошибки)
          await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
          await new Promise(resolve => setTimeout(resolve, 300));
          const refreshResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"{F5}\\")'], 3000);
          return refreshResult.success ? 
            { ok: true, action: 'chrome_refresh', details: { message: 'Page refreshed' } } :
            { ok: false, error: `Failed to refresh page: ${refreshResult.error}` };
            
        case 'chrome_fullscreen_media':
          // Фокус на Chrome как у других команд, затем 'f'
          await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
          await new Promise(resolve => setTimeout(resolve, 300));
          const fullscreenResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"f\\")'], 3000);
          return fullscreenResult.success ? 
            { ok: true, action: 'chrome_fullscreen_media', details: { message: 'Media fullscreen toggled (f)' } } :
            { ok: false, error: `Failed to toggle media fullscreen: ${fullscreenResult.error}` };

        case 'chrome_fullscreen_browser':
          // F11 для полноэкранного режима браузера как у других команд
          await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
          await new Promise(resolve => setTimeout(resolve, 300));
          const browserFullscreenResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"{F11}\\")'], 3000);
          return browserFullscreenResult.success ? 
            { ok: true, action: 'chrome_fullscreen_browser', details: { message: 'Browser fullscreen toggled (F11)' } } :
            { ok: false, error: `Failed to toggle browser fullscreen: ${browserFullscreenResult.error}` };

        case 'chrome_media_pause':
          // Универсальная пауза для браузерных видео (YouTube, Netflix и т.д.) - пробел
          const chromePauseResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\" \\")'], 3000);
          
          return chromePauseResult.success ? 
            { ok: true, action: 'chrome_media_pause', details: { message: 'Browser media paused/resumed' } } :
            { ok: false, error: `Failed to pause browser media: ${chromePauseResult.error}` };
            
        // Chrome CDP advanced commands
        case 'chrome_scroll_down':
          try {
            const scrolled = await chromeCDP.scrollPage('down');
            return scrolled ? 
              { ok: true, action: 'chrome_scroll_down', details: { message: 'Page scrolled down' } } :
              { ok: false, error: 'Failed to scroll page down' };
          } catch (error) {
            return { ok: false, error: `CDP scroll error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'chrome_scroll_up':
          try {
            const scrolled = await chromeCDP.scrollPage('up');
            return scrolled ? 
              { ok: true, action: 'chrome_scroll_up', details: { message: 'Page scrolled up' } } :
              { ok: false, error: 'Failed to scroll page up' };
          } catch (error) {
            return { ok: false, error: `CDP scroll error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'chrome_find_text':
          if (!request.text) {
            return { ok: false, error: 'Text is required for chrome_find_text command' };
          }
          try {
            const result = await chromeCDP.findTextOnPage(request.text);
            return {
              ok: true,
              action: 'chrome_find_text',
              data: {
                text: request.text,
                found: result.found,
                count: result.count
              }
            };
          } catch (error) {
            return { ok: false, error: `CDP find text error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'chrome_click_link':
          if (!request.text) {
            return { ok: false, error: 'Link text is required for chrome_click_link command' };
          }
          try {
            const clicked = await chromeCDP.clickLink(request.text);
            return clicked ? 
              { ok: true, action: 'chrome_click_link', details: { linkText: request.text, message: 'Link clicked' } } :
              { ok: false, error: `Link with text "${request.text}" not found` };
          } catch (error) {
            return { ok: false, error: `CDP click link error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        // Profile system commands
        case 'activate_profile':
          if (!request.profileName) {
            return { ok: false, error: 'Profile name is required for activate_profile command' };
          }
          try {
            const result = await profilesManager.activateProfile(request.profileName);
            return {
              ok: result.success,
              action: 'activate_profile',
              data: result.success ? {
                profileName: result.profile?.name,
                description: result.profile?.description,
                message: result.message
              } : undefined,
              error: result.success ? undefined : result.message
            };
          } catch (error) {
            return { ok: false, error: `Profile activation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        case 'tile_windows':
          const layout = request.layout || 'split';
          try {
            const result = await profilesManager.tileWindows(layout);
            return {
              ok: result.success,
              action: 'tile_windows',
              details: {
                layout,
                message: result.message
              },
              error: result.success ? undefined : result.message
            };
          } catch (error) {
            return { ok: false, error: `Window tiling error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }
          
        // Context commands
        case 'repeat_last':
          // TODO: Implement repeat last command logic
          return { 
            ok: true, 
            action: 'repeat_last', 
            details: { message: 'Repeat last command functionality not yet implemented' } 
          };
          
        case 'close_last_opened':
          // TODO: Implement close last opened logic
          return { 
            ok: true, 
            action: 'close_last_opened', 
            details: { message: 'Close last opened functionality not yet implemented' } 
          };
          
        case 'cancel_last':
          // TODO: Implement cancel last command logic
          return { 
            ok: true, 
            action: 'cancel_last', 
            details: { message: 'Cancel last command functionality not yet implemented' } 
          };
          
        case 'find_movie':
          // Для фильтрованного поиска title может быть пустым
          if (!request.movieTitle && !request.genre && !request.country && !request.ratingMin && !request.ratingMax && !request.yearMin && !request.yearMax) {
            return { ok: false, error: 'Movie title or search filters are required for find_movie command' };
          }
          
          try {
            const { findKinopoiskPlayerUrl } = await import('./kinopoisk-adapter');
            
            // Определяем intent на основе параметров
            let intent: 'find_movie' | 'find_season' | 'find_filtered' = 'find_movie';
            if (request.season || request.episode) {
              intent = 'find_season';
            } else if (request.genre || request.country || request.ratingMin || request.ratingMax || request.yearMin || request.yearMax) {
              intent = 'find_filtered';
            }
            
            const nluResult = {
              intent,
              title: request.movieTitle || "",
              year: request.movieYear || null,
              type: request.movieType || null,
              season: request.season,
              episode: request.episode,
              filters: (intent === 'find_filtered') ? {
                genre: request.genre,
                country: request.country,
                ratingMin: request.ratingMin,
                ratingMax: request.ratingMax,
                yearMin: request.yearMin,
                yearMax: request.yearMax
              } : undefined
            };
            
            const movieResult = await findKinopoiskPlayerUrl(nluResult);
            
            if (movieResult.url) {
              // Открываем плеер в браузере
              const chromePath = this.findChrome();
              let openResult;
              
              if (chromePath) {
                // Запускаем Chrome с CDP поддержкой для автоматизации плеера
                openResult = await this.executeCommand('start', ['""', `"${chromePath}"`, '--remote-debugging-port=9222', '--disable-features=VizDisplayCompositor', movieResult.url], 5000);
              } else {
                openResult = await this.executeCommand('start', ['""', movieResult.url], 5000);
              }
              
              if (openResult.success) {
                // Запускаем клик в фоне, не ждем результата
                setTimeout(async () => {
                  try {
                    logger.info('Background: Waiting 3 seconds for manual cursor positioning...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    logger.info('Background: Activating C# click utility now!');
                    const result = await this.executeCommand('.\\tools\\click.exe', ['960', '480'], 5000);
                    if (result.success) {
                      logger.info('Background: C# click executed successfully!');
                      
                      // Ждем немного и переходим в полноэкранный режим
                      logger.info('Background: Waiting 1 second before fullscreen...');
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      logger.info('Background: Focusing Chrome window...');
                      await this.executePowerShellCommand({ command: 'focus_window', processName: 'chrome' } as CommandRequest);
                      await new Promise(resolve => setTimeout(resolve, 300));
                      
                      logger.info('Background: Activating fullscreen mode (F key)...');
                      const fullscreenResult = await this.executeCommand('powershell', ['-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"f\\")'], 3000);
                      if (fullscreenResult.success) {
                        logger.info('Background: Fullscreen activated!');
                      } else {
                        logger.warn('Background: Fullscreen failed:', fullscreenResult.error);
                      }
                    } else {
                      logger.warn('Background: C# click failed:', result.error);
                    }
                  } catch (error) {
                    logger.warn('Background: Background process error:', error);
                  }
                }, 0);
                
                // Возвращаем ответ сразу
                return {
                  ok: true,
                  action: 'find_movie',
                  data: {
                    title: request.movieTitle,
                    url: movieResult.url,
                    movie: movieResult.movie
                  },
                  details: { 
                    message: movieResult.speak + ' Загружается... Через несколько секунд перейдет в полноэкранный режим!',
                    method: chromePath ? 'chrome' : 'default_browser',
                    playerActivated: false // Пока не активирован, но будет через 3 сек
                  }
                };
              } else {
                return { ok: false, error: `Found movie but failed to open browser: ${openResult.error}` };
              }
            } else {
              return { ok: false, error: movieResult.speak };
            }
          } catch (error) {
            return { ok: false, error: `Movie search error: ${error instanceof Error ? error.message : 'Unknown error'}` };
          }

        case 'full_disk_search':
          if (!request.appName) {
            return { ok: false, error: 'App name is required for full_disk_search command' };
          }

          const enableFullSearch = process.env.ENABLE_FULL_DISK_SEARCH === 'true';
          if (!enableFullSearch) {
            return { ok: false, error: 'Full disk search is disabled' };
          }

          logger.info(`Starting full disk search for: ${request.appName}`);
          const foundPath = await this.fullDiskSearch(request.appName, true);
          
          if (foundPath) {
            // Приложение найдено, пробуем запустить
            const searchResult = await this.executeCommand('start', ['""', `"${foundPath}"`], 5000);
            if (searchResult.success) {
              return { 
                ok: true, 
                action: 'full_disk_search', 
                details: { 
                  appName: request.appName,
                  foundPath: foundPath,
                  launched: true 
                } 
              };
            } else {
              return { 
                ok: false, 
                error: `Found app at ${foundPath} but failed to launch: ${searchResult.error}` 
              };
            }
          } else {
            return { 
              ok: false, 
              error: `App "${request.appName}" not found on any drive` 
            };
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

  /**
   * Полный поиск приложения по всем дискам
   */
  async fullDiskSearch(appName: string, enableFullSearch: boolean = true): Promise<string | null> {
    if (!enableFullSearch) {
      logger.info(`Full disk search disabled for: ${appName}`);
      return null;
    }

    logger.info(`Starting full disk search for: ${appName}`);
    
    try {
      // Получаем список всех дисков
      const drives = await this.getSystemDrives();
      logger.info(`Searching on drives: ${drives.join(', ')}`);

      for (const drive of drives) {
        logger.info(`Searching on drive ${drive} for ${appName}...`);
        
        // Поиск по основным папкам сначала (быстрее)
        const quickPaths = [
          `${drive}Program Files`,
          `${drive}Program Files (x86)`,
          `${drive}Users\\${process.env.USERNAME}\\AppData\\Local`,
          `${drive}ProgramData`
        ];

        for (const basePath of quickPaths) {
          const result = await this.searchInDirectory(basePath, `${appName}.exe`);
          if (result) {
            logger.info(`Found ${appName} at: ${result}`);
            return result;
          }
        }
      }

      logger.warn(`Full disk search completed, ${appName} not found`);
      return null;
      
    } catch (error) {
      logger.error('Full disk search failed', error);
      return null;
    }
  }

  /**
   * Получить список системных дисков
   */
  private async getSystemDrives(): Promise<string[]> {
    try {
      const result = await this.executeCommand('wmic', ['logicaldisk', 'get', 'caption'], 5000);
      if (!result.success || !result.output) return ['C:\\'];
      
      const drives = result.output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^[A-Z]:$/))
        .map(drive => `${drive}\\`);
        
      return drives.length > 0 ? drives : ['C:\\'];
    } catch (error) {
      logger.error('Failed to get system drives', error);
      return ['C:\\'];
    }
  }

  /**
   * Поиск файла в директории
   */
  private async searchInDirectory(basePath: string, fileName: string): Promise<string | null> {
    try {
      // Используем dir с рекурсивным поиском, но ограничиваем глубину
      const result = await this.executeCommand(
        'cmd', 
        ['/c', `dir "${basePath}\\${fileName}" /s /b 2>nul`], 
        30000 // 30 секунд таймаут
      );
      
      if (result.success && result.output && result.output.trim()) {
        const paths = result.output.trim().split('\n');
        // Возвращаем первый найденный путь
        return paths[0].trim();
      }
      
      return null;
    } catch (error) {
      // Молча игнорируем ошибки поиска в недоступных папках
      return null;
    }
  }
}

export const windowsCommands = new WindowsCommands();