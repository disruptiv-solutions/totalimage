import type { NextApiRequest, NextApiResponse } from 'next';

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  let comfyuiUrl = process.env.COMFYUI_URL || '';
  comfyuiUrl = comfyuiUrl.replace(/(https?:\/\/[^/]+).*(https?:\/\/[^/]+)/, '$1');
  comfyuiUrl = comfyuiUrl.replace(/\/+$/, '');
  if (!comfyuiUrl) return res.status(500).json({ error: 'COMFYUI_URL not set' });

  try {
    const [ckptResp, loraResp] = await Promise.all([
      fetch(`${comfyuiUrl}/object_info/CheckpointLoaderSimple`),
      fetch(`${comfyuiUrl}/object_info/LoraLoader`).catch(() => null as any),
    ]);

    let checkpoints: string[] = [];
    if (ckptResp && ckptResp.ok) {
      const info = await safeJson(ckptResp);
      const arr = info?.CheckpointLoaderSimple?.input?.required?.ckpt_name;
      if (Array.isArray(arr) && Array.isArray(arr[0])) checkpoints = arr[0] as string[];
    }

    let loras: string[] = [];
    if (loraResp && loraResp.ok) {
      const info = await safeJson(loraResp);
      const arr = info?.LoraLoader?.input?.required?.lora_name;
      if (Array.isArray(arr) && Array.isArray(arr[0])) loras = arr[0] as string[];
    }

    return res.status(200).json({ checkpoints, loras });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to fetch ComfyUI options' });
  }
}


