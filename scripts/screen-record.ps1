# Screen recording using Windows Game Bar
param(
    [int]$Duration = 10
)

Add-Type -AssemblyName System.Windows.Forms

# Send Windows + G to open Game Bar, then Windows + Alt + R to start recording
[System.Windows.Forms.SendKeys]::SendWait("{LWIN}%(r)")

Write-Output "Started screen recording for $Duration seconds"

# Wait for specified duration
Start-Sleep -Seconds $Duration

# Stop recording with Windows + Alt + R
[System.Windows.Forms.SendKeys]::SendWait("{LWIN}%(r)")

Write-Output "Stopped screen recording"