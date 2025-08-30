# Screen recording using PowerShell and ffmpeg (if available) or PSR
param(
    [int]$Duration = 10
)

$outputPath = "$env:USERPROFILE\Desktop\screen_recording_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"

# Try ffmpeg first (if available)
$ffmpegPath = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpegPath) {
    Write-Output "Starting screen recording with ffmpeg for $Duration seconds..."
    $ffmpegProcess = Start-Process -FilePath "ffmpeg" -ArgumentList @(
        "-f", "gdigrab",
        "-i", "desktop", 
        "-t", $Duration,
        "-y", "$outputPath.mp4"
    ) -NoNewWindow -PassThru
    
    Wait-Process -InputObject $ffmpegProcess -Timeout ($Duration + 5)
    Write-Output "Screen recording saved to: $outputPath.mp4"
} else {
    # Fallback: Use Windows Problem Steps Recorder (PSR)
    Write-Output "Starting screen recording with PSR for $Duration seconds..."
    $psrProcess = Start-Process -FilePath "psr.exe" -ArgumentList @(
        "/start", 
        "/output", "$outputPath.zip",
        "/maxsc", "100"
    ) -PassThru
    
    Start-Sleep -Seconds $Duration
    Stop-Process -InputObject $psrProcess -Force
    Write-Output "Screen recording saved to: $outputPath.zip"
}

Write-Output "Recording completed"