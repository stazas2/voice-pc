// Базовый edge-js Windows API модуль
const edge = require('edge-js');

// Промисификация edge-js callback функций
function promisifyEdge(func) {
    return (input) => {
        return new Promise((resolve, reject) => {
            func(input, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    };
}

// C# код для Windows API вызовов
const lockScreenCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                bool result = LockWorkStation();
                return new { success = result, method = "edge-js" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message, method = "edge-js" };
            }
        }
    }
`);

const showDesktopCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                IntPtr progman = FindWindow("Progman", "Program Manager");
                if (progman != IntPtr.Zero)
                {
                    SetForegroundWindow(progman);
                    bool result = ShowWindow(progman, 3); // SW_MAXIMIZE
                    return new { success = result, method = "edge-js" };
                }
                return new { success = false, error = "Desktop window not found", method = "edge-js" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message, method = "edge-js" };
            }
        }
    }
`);

const minimizeAllCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        
        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);
        
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                int minimizedCount = 0;
                
                EnumWindows((hWnd, lParam) => {
                    if (IsWindowVisible(hWnd) && !IsIconic(hWnd))
                    {
                        if (ShowWindow(hWnd, 6)) // SW_MINIMIZE
                        {
                            minimizedCount++;
                        }
                    }
                    return true;
                }, IntPtr.Zero);
                
                return new { success = true, minimized = minimizedCount, method = "edge-js" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message, method = "edge-js" };
            }
        }
    }
`);

const emptyRecycleBinCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        [DllImport("shell32.dll")]
        public static extern int SHEmptyRecycleBin(IntPtr hwnd, string pszRootPath, uint dwFlags);
        
        const uint SHERB_NOCONFIRMATION = 0x00000001;
        const uint SHERB_NOPROGRESSUI = 0x00000002;
        const uint SHERB_NOSOUND = 0x00000004;
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                uint flags = SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND;
                int result = SHEmptyRecycleBin(IntPtr.Zero, null, flags);
                return new { success = result == 0, result = result, method = "edge-js" };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message, method = "edge-js" };
            }
        }
    }
`);

const volumeSetCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    
    public class Startup
    {
        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam);
        
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        
        const uint WM_APPCOMMAND = 0x319;
        const uint APPCOMMAND_VOLUME_UP = 10;
        const uint APPCOMMAND_VOLUME_DOWN = 9;
        const uint APPCOMMAND_VOLUME_MUTE = 8;
        
        private static IntPtr MakeLParam(uint loWord, uint hiWord)
        {
            return new IntPtr((hiWord << 16) | (loWord & 0xFFFF));
        }
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                dynamic inputData = input;
                int targetLevel = inputData != null ? (int)inputData : 50;
                
                // Ограничиваем диапазон 0-100
                if (targetLevel < 0) targetLevel = 0;
                if (targetLevel > 100) targetLevel = 100;
                
                IntPtr hWnd = FindWindow("Shell_TrayWnd", null);
                if (hWnd == IntPtr.Zero)
                    hWnd = new IntPtr(-1); // HWND_BROADCAST
                
                // Простой алгоритм: сбросить в 0, затем поднять до нужного уровня
                // Сначала mute чтобы сбросить
                SendMessage(hWnd, WM_APPCOMMAND, UIntPtr.Zero, MakeLParam(0, APPCOMMAND_VOLUME_MUTE));
                SendMessage(hWnd, WM_APPCOMMAND, UIntPtr.Zero, MakeLParam(0, APPCOMMAND_VOLUME_MUTE));
                
                // Поднимаем до нужного уровня (каждый шаг ~2%)
                int steps = targetLevel / 2;
                for (int i = 0; i < steps; i++)
                {
                    SendMessage(hWnd, WM_APPCOMMAND, UIntPtr.Zero, MakeLParam(0, APPCOMMAND_VOLUME_UP));
                }
                
                return new { 
                    success = true, 
                    level = targetLevel,
                    steps = steps,
                    method = "edge-js" 
                };
            }
            catch (Exception ex)
            {
                return new { 
                    success = false, 
                    error = ex.Message, 
                    method = "edge-js" 
                };
            }
        }
    }
`);

const closeWindowCs = edge.func(`
    using System;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;
    using System.Diagnostics;
    
    public class Startup
    {
        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        
        [DllImport("user32.dll")]
        public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
        
        const uint WM_CLOSE = 0x0010;
        
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        
        public async Task<object> Invoke(object input)
        {
            try 
            {
                string processName = input != null ? input.ToString().ToLower() : "";
                if (string.IsNullOrEmpty(processName))
                {
                    return new { success = false, error = "Process name required", method = "edge-js" };
                }
                
                int closedCount = 0;
                
                EnumWindows((hWnd, lParam) => {
                    if (!IsWindowVisible(hWnd)) return true;
                    
                    uint processId;
                    GetWindowThreadProcessId(hWnd, out processId);
                    
                    try
                    {
                        Process process = Process.GetProcessById((int)processId);
                        string currentName = process.ProcessName.ToLower();
                        
                        if (currentName.Contains(processName))
                        {
                            if (PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero))
                            {
                                closedCount++;
                            }
                        }
                    }
                    catch
                    {
                        // Skip access errors
                    }
                    
                    return true;
                }, IntPtr.Zero);
                
                return new { 
                    success = true, 
                    processName = processName,
                    closedCount = closedCount,
                    method = "edge-js" 
                };
            }
            catch (Exception ex)
            {
                return new { 
                    success = false, 
                    error = ex.Message, 
                    method = "edge-js" 
                };
            }
        }
    }
`);

module.exports = {
    lockScreen: promisifyEdge(lockScreenCs),
    showDesktop: promisifyEdge(showDesktopCs),
    minimizeAll: promisifyEdge(minimizeAllCs),
    emptyRecycleBin: promisifyEdge(emptyRecycleBinCs),
    volumeSet: promisifyEdge(volumeSetCs),
    closeWindow: promisifyEdge(closeWindowCs)
};