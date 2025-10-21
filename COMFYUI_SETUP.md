# ComfyUI Setup for Illustrious XL + LoRA

This guide will help you set up ComfyUI to use the Illustrious XL model with LoRA support.

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Git** installed
3. **Your LoRA file**: `LoisGriffinIllustrious1.0.safetensors`

## Step 1: Install ComfyUI

```bash
# Clone ComfyUI repository
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Download Illustrious XL Model

1. Download the Illustrious XL model from [Hugging Face](https://huggingface.co/OnomaAIResearch/Illustrious-XL-v1.0)
2. Place the model file in: `ComfyUI/models/checkpoints/`
3. Rename it to: `illustrious_xl.safetensors`

## Step 3: Add Your LoRA File

1. Create the LoRA directory if it doesn't exist:
   ```bash
   mkdir -p ComfyUI/models/loras
   ```

2. Copy your LoRA file:
   ```bash
   cp /path/to/LoisGriffinIllustrious1.0.safetensors ComfyUI/models/loras/
   ```

## Step 4: Start ComfyUI

```bash
# Start ComfyUI server
python main.py --listen 0.0.0.0 --port 8000
```

ComfyUI will be available at: `http://localhost:8000`

## Step 5: Test the Setup

1. Open your browser and go to `http://localhost:8000`
2. You should see the ComfyUI interface
3. The Illustrious XL model should be available in the checkpoint loader
4. The Lois Griffin LoRA should be available in the LoRA loader

## Step 6: Configure the Application

Add the ComfyUI URL to your environment variables:

```bash
# In your .env file or environment
COMFYUI_URL=http://localhost:8000
```

## Step 7: Test Image Generation

1. Go to `/test-illustrious` in your application
2. Enter a prompt with Lois Griffin trigger words:
   ```
   lois, dot pupils, 1girl, blue earrings, jewelry, short hair, solo, lipstick, orange hair, aqua shirt, beige pants, sleeves rolled up, pumps, beautiful anime character with flowing hair
   ```
3. Set LoRA field to `true`
4. Click "Test Generation"

## Troubleshooting

### ComfyUI Not Starting
- Check if port 8000 is available
- Try a different port: `python main.py --listen 0.0.0.0 --port 8001`

### Model Not Found
- Ensure the Illustrious XL model is in `ComfyUI/models/checkpoints/`
- Check the filename is exactly `illustrious_xl.safetensors`

### LoRA Not Working
- Ensure the LoRA file is in `ComfyUI/models/loras/`
- Check the filename is exactly `LoisGriffinIllustrious1.0.safetensors`
- Verify the LoRA is compatible with Illustrious XL

### API Connection Issues
- Check if ComfyUI is running on the correct port
- Verify the `COMFYUI_URL` environment variable
- Check firewall settings

## File Structure

```
ComfyUI/
├── models/
│   ├── checkpoints/
│   │   └── illustrious_xl.safetensors
│   └── loras/
│       └── LoisGriffinIllustrious1.0.safetensors
├── main.py
└── requirements.txt
```

## Benefits of ComfyUI Approach

- ✅ **Full LoRA Support**: Native LoRA integration
- ✅ **Local Control**: Run everything locally
- ✅ **No API Limits**: No external API restrictions
- ✅ **Custom Workflows**: Advanced control over generation
- ✅ **Free**: No API costs

## Next Steps

Once ComfyUI is running, your application will automatically use it for image generation with full LoRA support!

