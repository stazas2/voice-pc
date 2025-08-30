# Show desktop
Add-Type -AssemblyName System.Windows.Forms

# Send Windows + D (show desktop)
[System.Windows.Forms.SendKeys]::SendWait("{LWIN}d")

Write-Output "Showing desktop"