# Lock screen using Windows API
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class User32 {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool LockWorkStation();
}
"@

# Lock the workstation
$result = [User32]::LockWorkStation()

if ($result) {
    Write-Output "Screen locked successfully"
} else {
    Write-Output "Failed to lock screen"
    exit 1
}