# Illustrious XL API Integration

This document explains how the Illustrious XL API integration handles image URLs and displays generated images in the application.

## Image URL Handling

The integration supports both URL-based and Base64-encoded image responses from the Illustrious XL API.

### Supported Response Formats

The API endpoint (`/api/generate-image-illustrious.ts`) automatically detects and handles multiple response formats:

1. **Array of Image URLs**: `{ "images": ["url1", "url2"] }`
2. **Single Image URL**: `{ "image": "url" }`
3. **Output Field**: `{ "output": ["url1", "url2"] }` or `{ "output": "url" }`
4. **Image URL Field**: `{ "image_url": "url" }`
5. **Base64 Data**: `{ "image_data": "base64string" }`
6. **Data Array**: `{ "data": ["url1", "url2"] }` (mixed URLs and Base64)

### URL Processing

- **HTTP/HTTPS URLs**: Used directly for image display
- **Data URLs**: Used directly (already formatted as `data:image/...`)
- **Base64 Data**: Converted to data URLs with `data:image/png;base64,` prefix
- **Relative URLs**: Passed through as-is (may need API base URL prepending)

## Frontend Display Features

### Image Display
- **Responsive Grid**: Images displayed in a responsive grid layout
- **Aspect Ratio**: Maintains square aspect ratio for consistent layout
- **Error Handling**: Shows error message if image fails to load
- **URL Information**: Displays URL type and truncated URL for debugging

### URL Information Display
Each generated image shows:
- **URL Type**: 🔗 External URL, 📄 Base64 Data, or ❓ Unknown Format
- **URL Preview**: Truncated URL or Base64 data size
- **Full URL**: Available in browser console logs
- **View Full**: Link to open image in new tab

### Debugging Features
- **Console Logging**: Detailed logs of API responses and image URLs
- **Metadata**: Response format detection and image count
- **Error Tracking**: Failed image loads are logged with full URLs

## Usage Examples

### Basic Generation
```javascript
const response = await fetch('/api/generate-image-illustrious', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful anime character',
    settings: {
      width: 1024,
      height: 1024,
      steps: 28
    }
  })
});
```

### With LoRAs
```javascript
const response = await fetch('/api/generate-image-illustrious', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'a beautiful anime character',
    settings: {
      width: 1024,
      height: 1024,
      steps: 28,
      loras: 'https://example.com/lora1.safetensors:0.8,https://example.com/lora2.safetensors:1.0'
    }
  })
});
```

## Testing

Visit `/test-illustrious` to test the API integration with sample prompts and see detailed URL information.

## Environment Setup

Add your Illustrious XL API key to the environment variables:

```bash
ILLUSTRIOUS_API_KEY="your_actual_api_key_here"
```

## Troubleshooting

### Images Not Loading
1. Check browser console for error messages
2. Verify the API key is correctly set
3. Check if the URL format is supported
4. Test with the `/test-illustrious` page

### URL Format Issues
- External URLs should start with `http://` or `https://`
- Base64 data should start with `data:image/` or be raw Base64
- Check the API response format in the console logs

### LoRA Issues
- Ensure LoRA URLs are accessible
- Check the format: `URL1:weight1,URL2:weight2`
- Verify the Illustrious XL API supports the LoRA format

