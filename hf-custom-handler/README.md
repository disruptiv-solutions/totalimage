# Hugging Face Custom Handler for LoRA Support

This custom handler adds LoRA support to your Hugging Face Inference Endpoint, similar to how ComfyUI loads and applies LoRAs.

## 🎯 What This Does

**Before (Stock Endpoint):**
```
Base Model → Generate
❌ No LoRA support
```

**After (Custom Handler):**
```
Base Model → Load LoRA → Apply LoRA → Generate
✅ Full LoRA support (like ComfyUI)
```

## 📦 Files Included

- `handler.py` - The custom inference handler with LoRA loading logic
- `requirements.txt` - Python dependencies needed

## 🚀 Deployment Steps

### 1. Prepare the Files

**On Windows:**
```powershell
cd C:\Users\ianmc\Downloads\total-1\hf-custom-handler
Compress-Archive -Path handler.py,requirements.txt -DestinationPath custom-handler.zip
```

**On Mac/Linux:**
```bash
cd hf-custom-handler
zip custom-handler.zip handler.py requirements.txt
```

### 2. Deploy to Hugging Face

1. **Go to:** https://ui.endpoints.huggingface.co/

2. **If you already have an endpoint:**
   - Click on your existing endpoint
   - Click **"Update"** or **"Settings"**
   - Look for **"Custom Handler"** section
   - Upload `custom-handler.zip`
   - Click **"Update Endpoint"**

3. **If creating a new endpoint:**
   - Click **"New Endpoint"**
   - **Model Repository:** Choose your model (or enter: `stabilityai/stable-diffusion-xl-base-1.0`)
   - **Endpoint Name:** `my-sdxl-lora-endpoint`
   - **Cloud:** AWS
   - **Region:** `us-east-1` (or your preference)
   - **Instance Type:** `GPU [medium] - 1x Nvidia A10G` (24GB VRAM)
   - **Custom Handler:** ✅ Enable
   - **Upload:** `custom-handler.zip`
   - **Auto-scaling:**
     - Min replicas: `0` (pauses when idle to save money)
     - Max replicas: `1`
   - Click **"Create Endpoint"**

### 3. Wait for Deployment

- Initial deployment: **~10-15 minutes**
- You'll see: "Building..." → "Starting..." → "Running"
- Watch the logs for: `✓ Model loaded successfully`

### 4. Update Your Endpoint URL

Once deployed, copy your new endpoint URL. It will look like:
```
https://xxxxx.us-east-1.aws.endpoints.huggingface.cloud
```

Update this in `pages/test-hf.tsx` (line 62):
```typescript
const response = await fetch('https://YOUR-NEW-ENDPOINT-URL', {
```

## 🧪 Testing

Once deployed, test with:

**Basic Generation (No LoRA):**
```json
{
  "inputs": "beautiful landscape, mountains, sunset, detailed",
  "parameters": {
    "num_inference_steps": 28,
    "width": 1024,
    "height": 1024
  }
}
```

**With LoRA:**
```json
{
  "inputs": "lois griffin waving hello, 1girl, detailed",
  "parameters": {
    "lora_url": "https://civitai.com/models/291088",
    "lora_scale": 0.8,
    "num_inference_steps": 28,
    "width": 1024,
    "height": 1024
  }
}
```

## 📊 Expected Logs

In the HF endpoint logs, you should see:

```
🚀 Initializing endpoint...
✓ Model loaded successfully

=== Generation Request ===
Prompt: lois griffin waving hello...
LoRA requested: https://civitai.com/models/291088
LoRA scale: 0.8
Loading new LoRA...
✓ LoRA loaded: https://civitai.com/models/291088
Steps: 28, Guidance: 5.0
Size: 1024x1024
🎨 Generating...
✓ Image generated
✓ Returning image (1234567 bytes)
```

## ✅ Supported LoRA Sources

- ✅ CivitAI model page URLs: `https://civitai.com/models/291088`
- ✅ Direct `.safetensors` URLs: `https://example.com/lora.safetensors`
- ✅ Hugging Face model IDs: `username/model-name`

## 💰 Cost

- **GPU Time:** ~$1/hour for A10G
- **Auto-pause:** Stops charging when idle (no requests for 15 min)
- **Per Image:** Essentially free (just hourly GPU cost)

**Example:**
- 100 images/hour = ~$0.01 per image
- Much cheaper than Replicate for high volume!

## 🔧 Troubleshooting

**"Build failed":**
- Check the build logs in HF dashboard
- Make sure `requirements.txt` has correct versions

**"LoRA not loading":**
- Check endpoint logs for error messages
- Some LoRAs may be incompatible with your base model
- CivitAI URLs may expire (use model page URL, not direct download)

**"Out of memory":**
- Reduce `width` and `height`
- Use a larger GPU (A100)

## 📝 Notes

- LoRAs are **cached in memory** after first load
- Switching LoRAs automatically unloads the previous one
- Setting `lora_url: null` or omitting it generates without LoRA
- The handler uses `diffusers` library (same as ComfyUI uses under the hood)

## 🎉 Success!

Once deployed, your HF endpoint will work exactly like your Replicate setup, but:
- ✅ Cheaper for high volume
- ✅ Full control over the code
- ✅ Can add more features (controlnet, inpainting, etc.)



