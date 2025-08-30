# Open Documents folder
$DocumentsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::MyDocuments)

if (Test-Path $DocumentsPath) {
    Invoke-Item $DocumentsPath
    Write-Output "Opened Documents folder: $DocumentsPath"
} else {
    Write-Output "Documents folder not found: $DocumentsPath"
    exit 1
}