<#
.SYNOPSIS
    Adds or removes a Startup shortcut for start-voice-pc-final.bat that runs minimized.
.PARAMETER Remove
    Pass -Remove to delete the Startup shortcut instead of creating it.
#>
[CmdletBinding()]
param(
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
$batchPath = Join-Path $repoRoot 'start-voice-pc-final.bat'

if (-not (Test-Path $batchPath)) {
    throw "Batch file not found at $batchPath"
}

$batchPath = (Resolve-Path $batchPath).Path

$startupDir = [Environment]::GetFolderPath('Startup')
if (-not (Test-Path $startupDir)) {
    throw "Could not resolve Startup folder for the current user."
}

$shortcutName = 'Voice PC Controller.lnk'
$shortcutPath = Join-Path $startupDir $shortcutName

if ($Remove) {
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "Removed startup shortcut: $shortcutPath"
    } else {
        Write-Host "No startup shortcut to remove at: $shortcutPath"
    }
    return
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batchPath
$shortcut.WorkingDirectory = Split-Path $batchPath
$shortcut.WindowStyle = 7 # Minimized window

$iconPath = Join-Path $repoRoot 'public\favicon.ico'
if (Test-Path $iconPath) {
    $shortcut.IconLocation = (Resolve-Path $iconPath).Path
}
$shortcut.Description = 'Voice PC controller (runs minimized on login)'
$shortcut.Save()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null

Write-Host "Created startup shortcut (minimized) at: $shortcutPath"
