from typing import Dict, Any
from diffusers import DiffusionPipeline
import torch
import io
import base64
from PIL import Image

class EndpointHandler:
    def __init__(self, path=""):
        """
        Initialize the model on endpoint startup.
        This is like loading the base model in ComfyUI.
        """
        print("🚀 Initializing endpoint...")
        
        # Load base SDXL model
        # You can change this to any SDXL-based model
        self.pipe = DiffusionPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        )

        # Move to GPU if available, otherwise stay on CPU
        try:
            self.pipe.to("cuda")
            print("✓ Model loaded on CUDA (GPU)")
        except RuntimeError:
            # No GPU available, use CPU (slower but works)
            print("⚠ No GPU available, using CPU (will be slower)")
            self.pipe.to("cpu")
        
        # Enable memory optimizations
        self.pipe.enable_attention_slicing()
        
        # Track currently loaded LoRA
        self.current_lora = None
        self.current_lora_url = None
        
        print("✓ Model loaded successfully")
    
    def __call__(self, data: Dict[str, Any]) -> str:
        """
        Handle each inference request.
        This is like running the workflow in ComfyUI.
        
        Expected input format:
        {
            "inputs": "your prompt here",
            "parameters": {
                "lora_url": "https://civitai.com/models/291088",  # Optional
                "lora_scale": 0.8,  # Optional, default 0.8
                "num_inference_steps": 28,
                "guidance_scale": 5.0,
                "negative_prompt": "low quality",
                "width": 1024,
                "height": 1024,
                "seed": null
            }
        }
        
        Returns: base64 encoded PNG image as a string
        """
        try:
            # Extract inputs
            prompt = data.get("inputs", "")
            params = data.get("parameters", {})
            
            print(f"\n=== Generation Request ===")
            print(f"Prompt: {prompt[:100]}...")
            
            # LoRA handling (like ComfyUI's Load LoRA node)
            lora_url = params.get("lora_url")
            lora_scale = params.get("lora_scale", 0.8)
            
            if lora_url:
                print(f"LoRA requested: {lora_url}")
                print(f"LoRA scale: {lora_scale}")
                
                # Only reload if it's a different LoRA
                if lora_url != self.current_lora_url:
                    print("Loading new LoRA...")
                    
                    # Unload previous LoRA if exists
                    if self.current_lora_url:
                        try:
                            self.pipe.unload_lora_weights()
                            print("✓ Unloaded previous LoRA")
                        except Exception as e:
                            print(f"⚠ Warning unloading LoRA: {e}")
                    
                    try:
                        # Load the new LoRA
                        # This works with:
                        # - CivitAI model page URLs
                        # - Direct .safetensors URLs
                        # - Hugging Face model IDs
                        self.pipe.load_lora_weights(lora_url)
                        self.current_lora_url = lora_url
                        print(f"✓ LoRA loaded: {lora_url}")
                    except Exception as e:
                        print(f"✗ Failed to load LoRA: {e}")
                        print("⚠ Continuing without LoRA")
                        self.current_lora_url = None
                else:
                    print("✓ LoRA already loaded (cached)")
            else:
                # No LoRA requested - unload if one is active
                if self.current_lora_url:
                    try:
                        self.pipe.unload_lora_weights()
                        self.current_lora_url = None
                        print("✓ Unloaded LoRA (none requested)")
                    except Exception as e:
                        print(f"⚠ Warning unloading LoRA: {e}")
            
            # Extract generation parameters
            num_inference_steps = params.get("num_inference_steps", 28)
            guidance_scale = params.get("guidance_scale", 5.0)
            negative_prompt = params.get("negative_prompt", "")
            width = params.get("width", 1024)
            height = params.get("height", 1024)
            seed = params.get("seed")
            
            # Set seed if provided
            generator = None
            if seed is not None and seed != -1:
                # Use the same device as the model
                device = next(self.pipe.parameters()).device
                generator = torch.Generator(device=device).manual_seed(seed)
                print(f"Using seed: {seed} on {device}")
            
            print(f"Steps: {num_inference_steps}, Guidance: {guidance_scale}")
            print(f"Size: {width}x{height}")
            
            # Generate image (like running the KSampler in ComfyUI)
            print("🎨 Generating...")
            image = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                width=width,
                height=height,
                generator=generator,
                # Apply LoRA scale if LoRA is loaded
                cross_attention_kwargs={"scale": lora_scale} if self.current_lora_url else None
            ).images[0]
            
            print("✓ Image generated")
            
            # Convert to base64 (for JSON response)
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            print(f"✓ Returning image ({len(img_base64)} bytes)")
            
            # Return base64 string directly
            # HF will wrap this in JSON automatically
            return img_base64
            
        except Exception as e:
            print(f"✗✗✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
            raise

