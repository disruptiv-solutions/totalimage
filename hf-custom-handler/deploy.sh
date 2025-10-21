#!/bin/bash

# Bash script to create the deployment zip file

echo "🚀 Creating HF Custom Handler deployment package..."

# Check if files exist
if [ ! -f "handler.py" ]; then
    echo "❌ Error: handler.py not found!"
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found!"
    exit 1
fi

# Remove old zip if exists
if [ -f "custom-handler.zip" ]; then
    rm custom-handler.zip
    echo "🗑️  Removed old custom-handler.zip"
fi

# Create zip file
zip custom-handler.zip handler.py requirements.txt

echo "✅ Created custom-handler.zip successfully!"
echo ""
echo "📦 Package contents:"
echo "  - handler.py"
echo "  - requirements.txt"
echo ""
echo "🎯 Next steps:"
echo "  1. Go to https://ui.endpoints.huggingface.co/"
echo "  2. Create a new endpoint or update existing one"
echo "  3. Enable 'Custom Handler' and upload custom-handler.zip"
echo "  4. Deploy and wait ~10-15 minutes"
echo ""
echo "📖 See README.md for detailed instructions"



