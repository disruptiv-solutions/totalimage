// pages/api/generate-image-comfyui.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type LoRAConfig = {
  id: string;
  name: string;
  strengthModel: number;
  strengthClip: number;
  enabled: boolean;
};

type GenSettings = {
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  loras?: string | LoRAConfig[]; // Support both old format and new LoRA array
  referenceImages?: string[];
};

function num(n: any, fallback: number) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function getText(res: Response) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, settings, referenceImages } = req.body as {
      prompt?: string;
      settings?: GenSettings;
      referenceImages?: string[];
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const normalizedReferenceImages = Array.isArray(referenceImages)
      ? referenceImages.filter((x) => typeof x === 'string' && x.trim()).slice(0, 14)
      : Array.isArray(settings?.referenceImages)
        ? settings.referenceImages.filter((x) => typeof x === 'string' && x.trim()).slice(0, 14)
        : [];

    if (normalizedReferenceImages.length > 0) {
      console.log(
        `[ComfyUI API] Received ${normalizedReferenceImages.length} reference images (brand/style refs).`
      );
    }

    // Normalize COMFYUI_URL (remove trailing slashes and accidental duplicates)
    let comfyuiUrl = process.env.COMFYUI_URL || '';
    // Collapse accidental duplication like "https://hosthttps://host"
    comfyuiUrl = comfyuiUrl.replace(/(https?:\/\/[^/]+).*(https?:\/\/[^/]+)/, '$1');
    comfyuiUrl = comfyuiUrl.replace(/\/+$/, ''); // no trailing slash
    if (!comfyuiUrl) {
      return res.status(500).json({
        error: 'COMFYUI_URL not set',
        details: 'Set COMFYUI_URL to your current trycloudflare URL (e.g. https://back-gained-lights-lake.trycloudflare.com)',
      });
    }

    // Parse LoRA configurations - support both old and new format
    let loraConfigs: LoRAConfig[] = [];
    if (Array.isArray(settings?.loras)) {
      loraConfigs = settings.loras.filter((lora: any) => lora.enabled);
    } else if (typeof settings?.loras === 'string' && settings.loras.trim().toLowerCase() === 'true') {
      // Backwards compatibility with old format
      loraConfigs = [{
        id: 'default',
        name: 'Lois-Griffin-ill-v1-sadvideocard.safetensors',
        strengthModel: 1.0,
        strengthClip: 1.0,
        enabled: true,
      }];
    }
    
    const useLora = loraConfigs.length > 0;
    console.log(`[ComfyUI API] LoRA configurations: ${JSON.stringify(loraConfigs.map(l => ({
      name: l.name,
      strengthModel: l.strengthModel,
      strengthClip: l.strengthClip
    })), null, 2)}`);

    // ---- Health check: prove we're talking to ComfyUI
    console.log(`[ComfyUI API] Health check: ${comfyuiUrl}/object_info`);
    const infoResp = await fetch(`${comfyuiUrl}/object_info`, { method: 'GET' });
    if (!infoResp.ok) {
      const body = await getText(infoResp);
      console.error(`[ComfyUI API] Health check failed: ${infoResp.status} - ${body}`);
      return res.status(502).json({
        error: 'Not talking to ComfyUI (object_info failed)',
        details: body || `HTTP ${infoResp.status}`,
      });
    }
    console.log(`[ComfyUI API] Health check passed: ${infoResp.status}`);

    // Determine checkpoint name from settings (with fallback)
    const checkpointName = (typeof (settings as any)?.ckpt_name === 'string' && (settings as any)?.ckpt_name)
      ? (settings as any).ckpt_name
      : 'waiIllustriousSDXL_v150.safetensors';

    // Check available checkpoints to debug the issue
    try {
      const checkpointsResp = await fetch(`${comfyuiUrl}/object_info/CheckpointLoaderSimple`);
      if (checkpointsResp.ok) {
        const checkpointsInfo = await checkpointsResp.json();
        console.log(`[ComfyUI API] Full checkpoint info: ${JSON.stringify(checkpointsInfo, null, 2)}`);
        
        const ckptNameInfo = checkpointsInfo?.CheckpointLoaderSimple?.input?.required?.ckpt_name;
        console.log(`[ComfyUI API] Raw checkpoint info: ${JSON.stringify(ckptNameInfo)}`);
        
        // The structure is: [["file1.safetensors", "file2.safetensors"], {tooltip: "..."}]
        let availableCheckpoints: string[] = [];
        if (ckptNameInfo && Array.isArray(ckptNameInfo) && ckptNameInfo.length > 0 && Array.isArray(ckptNameInfo[0])) {
          availableCheckpoints = ckptNameInfo[0] as string[];
        }
        
        if (availableCheckpoints.length > 0) {
          console.log(`[ComfyUI API] Available checkpoints: ${availableCheckpoints.join(', ')}`);
          
          // Verify our target checkpoint exists
          const targetCheckpoint = checkpointName;
          if (!availableCheckpoints.includes(targetCheckpoint)) {
            console.warn(`[ComfyUI API] WARNING: Target checkpoint '${targetCheckpoint}' not found in available list!`);
            return res.status(400).json({
              error: 'Checkpoint not available',
              details: `The required checkpoint '${targetCheckpoint}' is not available on your ComfyUI server. Available checkpoints: ${availableCheckpoints.join(', ')}`
            });
          } else {
            console.log(`[ComfyUI API] ✅ Target checkpoint '${targetCheckpoint}' found and available`);
          }
        } else {
          console.warn(`[ComfyUI API] Could not parse checkpoint list from info structure`);
        }
      } else {
        console.error(`[ComfyUI API] Failed to get checkpoint info: ${checkpointsResp.status} ${checkpointsResp.statusText}`);
      }
    } catch (e) {
      console.log(`[ComfyUI API] Could not get checkpoint info: ${e}`);
    }

    // Polling config
    const pollIntervalMs = 500;
    const timeoutMs = 240_000; // allow longer first-run loads
    const stuckRunningPollThreshold = Math.floor((timeoutMs / pollIntervalMs) * 0.75); // ~180s
    const stuckPendingPollThreshold = Math.floor((timeoutMs / pollIntervalMs) * 0.5);  // ~120s

    // ---- Build workflow based on the working HTML example
    const seedValue = Number.isFinite(settings?.seed as number) && (settings?.seed as number) >= 0 
      ? (settings?.seed as number) 
      : Math.floor(Math.random() * 1000000);

    // Helper function to get the correct CLIP connection based on LoRA chain
    const getClipConnection = () => {
      if (loraConfigs.length > 0) {
        // Will be updated after LoRA nodes are created
        return ["18", 1];
      }
      return ["18", 1];
    };

    const w: Record<string, any> = {
      "2": {
        "inputs": {
          "text": "worst quality, normal quality, low quality, low res, blurry, distortion, text, watermark, logo, banner, extra digits, cropped, jpeg artifacts, signature, username, error, sketch, duplicate, ugly, monochrome, horror, geometry, mutation, disgusting, bad anatomy, bad proportions, bad quality, deformed, disconnected limbs, out of frame, out of focus, dehydrated, disfigured, extra arms, extra limbs, extra hands, fused fingers, gross proportions, long neck, jpeg, malformed limbs, mutated, mutated hands, mutated limbs, missing arms, missing fingers, picture frame, poorly drawn hands, poorly drawn face, collage, pixel, pixelated, grainy, color aberration, amputee, autograph, bad illustration, beyond the borders, blank background, body out of frame, boring background, branding, cut off, dismembered, disproportioned, distorted, draft, duplicated features, extra fingers, extra legs, fault, flaw, grains, hazy, identifying mark, improper scale, incorrect physiology, incorrect ratio, indistinct, kitsch, low resolution, macabre, malformed, mark, misshapen, missing hands, missing legs, mistake, morbid, mutilated, off-screen, outside the picture, poorly drawn feet, printed words, render, repellent, replicate, reproduce, revolting dimensions, script, shortened, sign, split image, squint, storyboard, tiling, trimmed, unfocused, unattractive, unnatural pose, unreal engine, unsightly, written language",
          "clip": getClipConnection()
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "text": `${prompt}, Lois Griffin, masterpiece, best quality, absurdres, 8k, ultra detailed, aesthetic`,
          "clip": getClipConnection()
        },
        "class_type": "CLIPTextEncode"
      },
      "5": {
        "inputs": {
          "width": num(settings?.width, 1024),
          "height": num(settings?.height, 1024),
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "seed": seedValue,
          "steps": num(settings?.steps, 28),
          "cfg": 8,
          "sampler_name": "dpmpp_2m_sde",
          "scheduler": "karras",
          "denoise": 1,
          "model": ["18", 0], // Will be updated after LoRA nodes if needed
          "positive": ["4", 0],
          "negative": ["2", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "7": {
        "inputs": {
          "samples": ["6", 0],
          "vae": ["18", 2]
        },
        "class_type": "VAEDecode"
      },
      "8": {
        "inputs": {
          "filename_prefix": "ComfyUI_Custom",
          "images": ["7", 0]
        },
        "class_type": "SaveImage"
      },
      "18": {
        "inputs": {
          "ckpt_name": checkpointName
        },
        "class_type": "CheckpointLoaderSimple"
      }
    };

    // Add multiple LoRA nodes if enabled - chain them together
    if (loraConfigs.length > 0) {
      let lastModelOutput = "18";
      let lastClipOutput = "18";
      let modelConnIdx = 0;
      let clipConnIdx = 1;

      // choose unique node ids beyond existing ids to avoid collisions (e.g., with 18 = checkpoint)
      const existingIds = Object.keys(w).map((k) => Number(k)).filter((n) => Number.isFinite(n));
      let nextId = (existingIds.length ? Math.max(...existingIds) : 18) + 1;

      loraConfigs.forEach((loraConfig) => {
        const loraNodeId = String(nextId++);

        w[loraNodeId] = {
          "inputs": {
            "lora_name": loraConfig.name,
            "strength_model": loraConfig.strengthModel,
            "strength_clip": loraConfig.strengthClip,
            "model": [lastModelOutput, modelConnIdx],
            "clip": [lastClipOutput, clipConnIdx]
          },
          "class_type": "LoraLoader"
        };

        // Update for next iteration - LoRA outputs are MODEL (0) and CLIP (1)
        lastModelOutput = loraNodeId;
        lastClipOutput = loraNodeId;
        modelConnIdx = 0;
        clipConnIdx = 1;
      });

      // Update workflow connections to use the last LoRA in the chain
      const finalId = String((nextId - 1));
      const finalModelSource = loraConfigs.length > 0 ? finalId : "18";
      const finalClipSource = loraConfigs.length > 0 ? finalId : "18";

      // Update CLIPTextEncode nodes (2 and 4) to use the last LoRA's CLIP output
      w["2"].inputs.clip = [finalClipSource, 1];
      w["4"].inputs.clip = [finalClipSource, 1];
      
      // Update KSampler (6) to use the last LoRA's MODEL output
      w["6"].inputs.model = [finalModelSource, 0];
    }

    // ---- Queue the prompt
    console.log(`[ComfyUI API] Queuing prompt to: ${comfyuiUrl}/prompt`);
    console.log(`[ComfyUI API] Workflow nodes: ${Object.keys(w).length}`);
    console.log(`[ComfyUI API] LoRA enabled: ${useLora}`);
    
    const queueResp = await fetch(`${comfyuiUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: w, client_id: 'illustrious-app' })
    });

    if (!queueResp.ok) {
      const details = await getText(queueResp);
      return res.status(queueResp.status).json({
        error: `ComfyUI /prompt returned ${queueResp.status}`,
        details
      });
    }

    const queueResult = await queueResp.json();
    console.log(`[ComfyUI API] Queue response: ${JSON.stringify(queueResult)}`);
    
    const { prompt_id: promptId } = queueResult;
    if (!promptId) {
      console.error(`[ComfyUI API] No prompt_id in queue response: ${JSON.stringify(queueResult)}`);
      return res.status(502).json({
        error: 'No prompt ID returned from ComfyUI',
        details: `Queue response: ${JSON.stringify(queueResult)}`
      });
    }
    
    console.log(`[ComfyUI API] Prompt queued with ID: ${promptId}`);

    // Small delay to let ComfyUI start processing
    await new Promise(r => setTimeout(r, 1000));

    // Also check the queue status initially
    try {
      const queueStatusResp = await fetch(`${comfyuiUrl}/queue`);
      if (queueStatusResp.ok) {
        const queueStatus = await queueStatusResp.json();
        console.log(`[ComfyUI API] Initial queue status: ${JSON.stringify(queueStatus)}`);
        
        // Check if our prompt is in the queue
        const queueRunning = queueStatus.queue_running || [];
        const queuePending = queueStatus.queue_pending || [];
        
        const isRunning = queueRunning.some((item: any) => item[1] === promptId);
        const isPending = queuePending.some((item: any) => item[1] === promptId);
        
        console.log(`[ComfyUI API] Prompt ${promptId} status - Running: ${isRunning}, Pending: ${isPending}`);
      }
    } catch (e) {
      console.log(`[ComfyUI API] Could not check queue status: ${e}`);
    }

    // ---- Poll history for completion
    const started = Date.now();
    let pollCount = 0;

    while (true) {
      pollCount++;
      const elapsed = Date.now() - started;
      
      if (elapsed > timeoutMs) {
        console.error(`[ComfyUI API] Timeout after ${elapsed}ms (${pollCount} polls)`);
        return res.status(504).json({ error: 'Timed out waiting for ComfyUI result', promptId });
      }

      console.log(`[ComfyUI API] Poll ${pollCount}: checking history for ${promptId} (${elapsed}ms elapsed)`);
      const histResp = await fetch(`${comfyuiUrl}/history/${promptId}`);
      if (!histResp.ok) {
        const details = await getText(histResp);
        console.error(`[ComfyUI API] History check failed: ${histResp.status} - ${details}`);
        return res.status(502).json({ error: 'Failed to check ComfyUI history', details });
      }

      const history = await histResp.json();
      const pd = history?.[promptId];

      // Enhanced debugging
      console.log(`[ComfyUI API] Poll ${pollCount}: history keys = ${Object.keys(history || {}).join(', ')}`);
      console.log(`[ComfyUI API] Poll ${pollCount}: prompt data exists = ${!!pd}`);
      if (pd) {
        console.log(`[ComfyUI API] Poll ${pollCount}: pd keys = ${Object.keys(pd).join(', ')}`);
        console.log(`[ComfyUI API] Poll ${pollCount}: pd.status = ${JSON.stringify(pd.status)}`);
      }

      // Don't bail early if prompt data doesn't exist yet - it might be completing
      // Only check this after we've given it enough time and confirmed it's not running

      const status = pd?.status?.status_str || pd?.status?.status;
      console.log(`[ComfyUI API] Poll ${pollCount}: status = ${status}`);
      console.log(`[ComfyUI API] Poll ${pollCount}: full status object = ${JSON.stringify(pd?.status, null, 2)}`);
      
      // Handle undefined status - might still be processing
      if (status === undefined) {
        if (pollCount > 5 && pollCount % 5 === 0) {
          console.log(`[ComfyUI API] Poll ${pollCount}: Still undefined, checking queue status...`);
          
          // Check queue status to see if prompt is still pending/running
          try {
            const queueStatusResp = await fetch(`${comfyuiUrl}/queue`);
            if (queueStatusResp.ok) {
              const queueStatus = await queueStatusResp.json();
              const queueRunning = queueStatus.queue_running || [];
              const queuePending = queueStatus.queue_pending || [];
              
              const isRunning = queueRunning.some((item: any) => item[1] === promptId);
              const isPending = queuePending.some((item: any) => item[1] === promptId);
              
              console.log(`[ComfyUI API] Poll ${pollCount}: Queue status - Running: ${isRunning}, Pending: ${isPending}`);
              
              // Check if there's a stuck prompt that's been running for too long
              if (queueRunning.length > 0 && pollCount > stuckRunningPollThreshold) {
                const runningPrompt = queueRunning[0];
                const runningPromptId = runningPrompt[1];
                console.warn(`[ComfyUI API] Poll ${pollCount}: Detected potential stuck prompt ${runningPromptId} in queue_running - this may be blocking new prompts`);
              }
              
              // Log full queue status for debugging (abbreviated for readability)
              console.log(`[ComfyUI API] Poll ${pollCount}: Queue summary - Running: ${queueRunning.length}, Pending: ${queuePending.length}`);
              
              // Check if our prompt is stuck in running state for too long (likely execution error)
              if (isRunning && pollCount > stuckRunningPollThreshold) {
                console.error(`[ComfyUI API] Poll ${pollCount}: Our prompt ${promptId} has been in running state for too long (${pollCount} polls)`);
                console.error(`[ComfyUI API] This indicates a workflow execution error - probably model loading or VRAM issues`);
                
                // Try to get more info about what's happening
                try {
                  const execInfoResp = await fetch(`${comfyuiUrl}/exec_info`);
                  if (execInfoResp.ok) {
                    const execInfo = await execInfoResp.json();
                    console.log(`[ComfyUI API] Execution info during stuck state: ${JSON.stringify(execInfo, null, 2)}`);
                  }
                } catch (e) {
                  console.log(`[ComfyUI API] Could not get exec info during stuck state: ${e}`);
                }
                
                return res.status(502).json({
                  error: 'Prompt stuck in execution',
                  details: `Prompt ${promptId} has been running for ${pollCount} polls without completing. This usually indicates a ComfyUI workflow execution error - check if the model file exists and there's sufficient VRAM available.`,
                  promptId
                });
              }
              
              // Check if our prompt is stuck in pending state for too long
              if (isPending && pollCount > stuckPendingPollThreshold && queueRunning.length > 0) {
                const stuckRunningPrompt = queueRunning[0];
                const stuckPromptId = stuckRunningPrompt[1];
                console.error(`[ComfyUI API] Poll ${pollCount}: Prompt ${promptId} stuck in pending state due to stuck running prompt ${stuckPromptId}`);
                return res.status(502).json({
                  error: 'ComfyUI queue is stuck',
                  details: `Prompt ${promptId} cannot proceed because ComfyUI has a stuck prompt (${stuckPromptId}) in the running state that never completes. You may need to restart ComfyUI to clear the stuck queue.`,
                  promptId
                });
              }
              
              // Check if prompt disappeared from queue - this might mean it completed successfully
              if (!isRunning && !isPending) {
                console.log(`[ComfyUI API] Poll ${pollCount}: Prompt ${promptId} disappeared from queue - checking if it completed successfully...`);
                
                // Give it a few more polls to appear in history since there might be a delay
                if (pollCount > 15) {
                  console.error(`[ComfyUI API] Poll ${pollCount}: Prompt ${promptId} was removed from queue but still not found in history after ${pollCount} polls`);
                  console.error(`[ComfyUI API] This suggests the workflow completed but results weren't properly saved`);
                  
                  // Try to get execution info if available
                  try {
                    const execInfoResp = await fetch(`${comfyuiUrl}/exec_info`);
                    if (execInfoResp.ok) {
                      const execInfo = await execInfoResp.json();
                      console.log(`[ComfyUI API] Poll ${pollCount}: Execution info = ${JSON.stringify(execInfo, null, 2)}`);
                    }
                  } catch (e) {
                    console.log(`[ComfyUI API] Could not get exec info: ${e}`);
                  }
                  
                  return res.status(502).json({
                    error: 'Prompt completed but results not found',
                    details: `Prompt ${promptId} was removed from queue but not found in history. It may have completed successfully but results weren't properly saved, or there's a timing issue with ComfyUI history updates.`
                  });
                } else {
                  console.log(`[ComfyUI API] Poll ${pollCount}: Prompt removed from queue, continuing to poll for results in history...`);
                }
              }
            }
          } catch (e) {
            console.log(`[ComfyUI API] Could not check queue status during polling: ${e}`);
          }
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
        continue;
      }

      // Some ComfyUI versions populate outputs even when status is undefined but completed.
      if (pd && (status === 'success' || (pd.outputs && Object.keys(pd.outputs).length > 0))) {
        const outputs = pd.outputs || {};
        const nodeKey = Object.keys(outputs).find(k => outputs[k]?.images?.length > 0);
        if (!nodeKey) {
          console.log(`[ComfyUI API] Success but no images found in outputs`);
          return res.status(200).json({ output: [], status: 'succeeded', promptId });
        }

        const images = outputs[nodeKey].images;
        console.log(`[ComfyUI API] Found ${images.length} image(s) in node ${nodeKey}`);
        const imageUrls = images.map((img: any) =>
          `${comfyuiUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`
        );
        console.log(`[ComfyUI API] Generated image URLs: ${imageUrls.join(', ')}`);
        return res.status(200).json({ output: imageUrls, status: 'succeeded', promptId });
      }

      if (status === 'error') {
        console.error(`[ComfyUI API] Generation error: ${pd?.status?.error}`);
        return res.status(502).json({
          error: 'ComfyUI generation error',
          details: pd?.status?.error ?? 'Unknown ComfyUI error',
          promptId
        });
      }

      // Final check: if we've polled many times and still no prompt data in history,
      // but we know ComfyUI completed execution, there might be a delay in history updates
      if (pollCount > 25 && !pd) {
        console.error(`[ComfyUI API] Poll ${pollCount}: Exceeded maximum polls without finding prompt in history`);
        console.error(`[ComfyUI API] This could indicate a ComfyUI history update delay or a deeper issue`);
        
        // One final attempt to check if it appeared in history during this last poll
        try {
          const finalHistResp = await fetch(`${comfyuiUrl}/history/${promptId}`);
          if (finalHistResp.ok) {
            const finalHistory = await finalHistResp.json();
            const finalPd = finalHistory?.[promptId];
            if (finalPd && (finalPd.status?.status_str === 'success' || finalPd.status?.status === 'success')) {
              console.log(`[ComfyUI API] Found prompt in final history check! Processing results...`);
              
              const outputs = finalPd.outputs || {};
              const nodeKey = Object.keys(outputs).find(k => outputs[k]?.images?.length > 0);
              if (nodeKey) {
                const images = outputs[nodeKey].images;
                const imageUrls = images.map((img: any) =>
                  `${comfyuiUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`
                );
                console.log(`[ComfyUI API] Final check succeeded! Generated image URLs: ${imageUrls.join(', ')}`);
                return res.status(200).json({ output: imageUrls, status: 'succeeded', promptId });
              }
            }
          }
        } catch (e) {
          console.log(`[ComfyUI API] Final history check failed: ${e}`);
        }
        
        return res.status(502).json({
          error: 'Prompt execution exceeded time limit',
          details: `Prompt ${promptId} was queued and likely executed successfully (based on ComfyUI logs) but results were not found in history after ${pollCount} polls. This may indicate a ComfyUI history synchronization issue.`,
          promptId
        });
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to generate image with ComfyUI' });
  }
}
