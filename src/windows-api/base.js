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

module.exports = {
    lockScreen: promisifyEdge(lockScreenCs),
    showDesktop: promisifyEdge(showDesktopCs),
    minimizeAll: promisifyEdge(minimizeAllCs),
    emptyRecycleBin: promisifyEdge(emptyRecycleBinCs)
};