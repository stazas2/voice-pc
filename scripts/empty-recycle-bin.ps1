# Empty recycle bin
Add-Type -AssemblyName Microsoft.VisualBasic

# Use VB.NET FileSystem to empty recycle bin
[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory("C:\`$Recycle.Bin", "DeleteAllContents")

# Alternative method using Shell.Application COM object
$shell = New-Object -ComObject Shell.Application
$recycleBin = $shell.Namespace(0xA)
$recycleBin.Items() | ForEach-Object { $_.InvokeVerb("delete") }

Write-Output "Emptied recycle bin"