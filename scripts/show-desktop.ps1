# Show desktop using Windows API
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Shell32 {
    [DllImport("shell32.dll")]
    public static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, 
        ref SHFILEINFO psfi, uint cbSizeFileInfo, uint uFlags);

    [DllImport("shell32.dll")]
    public static extern void SHGetDesktopFolder(out IntPtr ppshf);
    
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
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

# Find and show desktop window
$desktopWindow = [Shell32]::FindWindow("WorkerW", $null)
if ($desktopWindow -eq [IntPtr]::Zero) {
    $desktopWindow = [Shell32]::FindWindow("Progman", "Program Manager")
}

if ($desktopWindow -ne [IntPtr]::Zero) {
    [Shell32]::ShowWindow($desktopWindow, 3) # SW_MAXIMIZE = 3
    [Shell32]::SetForegroundWindow($desktopWindow)
    Write-Output "Desktop shown successfully"
} else {
    # Fallback: minimize all windows instead
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("{LWIN}d")
    Write-Output "Desktop shown (fallback method)"
}