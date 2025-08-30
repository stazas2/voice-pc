# Open latest download
$DownloadsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::UserProfile) + "\Downloads"

if (Test-Path $DownloadsPath) {
    $LatestFile = Get-ChildItem -Path $DownloadsPath -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($LatestFile) {
        Invoke-Item $LatestFile.FullName
        Write-Output "Opened latest download: $($LatestFile.Name)"
    } else {
        Write-Output "No files found in Downloads folder"
        exit 1
    }
} else {
    Write-Output "Downloads folder not found: $DownloadsPath"
    exit 1
}