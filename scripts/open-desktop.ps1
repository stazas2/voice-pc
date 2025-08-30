# Open Desktop folder
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)

if (Test-Path $DesktopPath) {
    Invoke-Item $DesktopPath
    Write-Output "Opened Desktop folder: $DesktopPath"
} else {
    Write-Output "Desktop folder not found: $DesktopPath"
    exit 1
}