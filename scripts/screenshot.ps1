# Take screenshot using Windows Forms
param(
    [string]$OutputPath = "$env:USERPROFILE\Desktop\screenshot_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').png"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get screen bounds
$Screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
$Width = $Screen.Width
$Height = $Screen.Height
$Left = $Screen.Left
$Top = $Screen.Top

# Create bitmap
$bitmap = New-Object System.Drawing.Bitmap $Width, $Height

# Create graphics object
$graphic = [System.Drawing.Graphics]::FromImage($bitmap)

# Capture screen
$graphic.CopyFromScreen($Left, $Top, 0, 0, $bitmap.Size)

# Save to file
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphic.Dispose()
$bitmap.Dispose()

Write-Output "Screenshot saved to: $OutputPath"