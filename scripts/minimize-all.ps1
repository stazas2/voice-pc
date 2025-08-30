# Minimize all windows using Windows API
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Shell32 {
    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, 
        ref SHFILEINFO psfi, uint cbSizeFileInfo, uint uFlags);

    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public struct SHFILEINFO {
        public IntPtr hIcon;
        public IntPtr iIcon;
        public uint dwAttributes;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szDisplayName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)]
        public string szTypeName;
    };
}
"@

# Find and minimize all visible windows
$minimizedCount = 0
$callback = {
    param($hwnd, $lParam)
    
    if ([Shell32]::IsWindowVisible($hwnd)) {
        $title = New-Object System.Text.StringBuilder 256
        [Shell32]::GetWindowText($hwnd, $title, $title.Capacity)
        
        if ($title.Length -gt 0) {
            [Shell32]::ShowWindow($hwnd, 6) # SW_MINIMIZE = 6
            $script:minimizedCount++
        }
    }
    
    return $true
}

[Shell32]::EnumWindows($callback, [IntPtr]::Zero)

Write-Output "Minimized $minimizedCount windows"