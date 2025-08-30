# Open Downloads folder
$DownloadsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile) + "\Downloads"

if (Test-Path $DownloadsPath) {
    Invoke-Item $DownloadsPath
    Write-Output "Opened Downloads folder: $DownloadsPath"
} else {
    Write-Output "Downloads folder not found: $DownloadsPath"
    exit 1
}