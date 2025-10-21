# PowerShell script to create the deployment zip file

Write-Host "🚀 Creating HF Custom Handler deployment package..." -ForegroundColor Green

# Check if files exist
if (-not (Test-Path "handler.py")) {
    Write-Host "❌ Error: handler.py not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "requirements.txt")) {
    Write-Host "❌ Error: requirements.txt not found!" -ForegroundColor Red
    exit 1
}

# Remove old zip if exists
if (Test-Path "custom-handler.zip") {
    Remove-Item "custom-handler.zip"
    Write-Host "🗑️  Removed old custom-handler.zip" -ForegroundColor Yellow
}

# Create zip file
Compress-Archive -Path handler.py,requirements.txt -DestinationPath custom-handler.zip

Write-Host "✅ Created custom-handler.zip successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Package contents:" -ForegroundColor Cyan
Write-Host "  - handler.py"
Write-Host "  - requirements.txt"
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Go to https://ui.endpoints.huggingface.co/" -ForegroundColor White
Write-Host "  2. Create a new endpoint or update existing one" -ForegroundColor White
Write-Host "  3. Enable 'Custom Handler' and upload custom-handler.zip" -ForegroundColor White
Write-Host "  4. Deploy and wait ~10-15 minutes" -ForegroundColor White
Write-Host ""
Write-Host "📖 See README.md for detailed instructions" -ForegroundColor Cyan



