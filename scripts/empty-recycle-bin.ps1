# Empty recycle bin using Windows API
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Shell32 {
    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern int SHEmptyRecycleBin(IntPtr hwnd, string pszRootPath, uint dwFlags);
    
    // Flags for SHEmptyRecycleBin
    public const uint SHERB_NOCONFIRMATION = 0x00000001;
    public const uint SHERB_NOPROGRESSUI = 0x00000002;
    public const uint SHERB_NOSOUND = 0x00000004;
}
"@

try {
    # Empty recycle bin without confirmation dialog
    $flags = [Shell32]::SHERB_NOCONFIRMATION -bor [Shell32]::SHERB_NOPROGRESSUI -bor [Shell32]::SHERB_NOSOUND
    $result = [Shell32]::SHEmptyRecycleBin([IntPtr]::Zero, $null, $flags)
    
    if ($result -eq 0) {
        Write-Output "Recycle bin emptied successfully"
    } else {
        Write-Output "Recycle bin was already empty or operation failed (code: $result)"
    }
} catch {
    # Fallback method using COM
    try {
        $shell = New-Object -ComObject Shell.Application
        $recycleBin = $shell.Namespace(0xA)
        $items = $recycleBin.Items()
        
        if ($items.Count -gt 0) {
            $recycleBin.InvokeVerb("empty")
            Write-Output "Recycle bin emptied (COM method)"
        } else {
            Write-Output "Recycle bin is already empty"
        }
    } catch {
        Write-Output "Failed to empty recycle bin: $($_.Exception.Message)"
        exit 1
    }
}