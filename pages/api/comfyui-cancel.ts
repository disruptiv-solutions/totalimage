import type { NextApiRequest, NextApiResponse } from 'next';

type QueueStatus = {
  queue_running?: any[];
  queue_pending?: any[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let comfyuiUrl = process.env.COMFYUI_URL || '';
  comfyuiUrl = comfyuiUrl.replace(/(https?:\/\/[^/]+).*(https?:\/\/[^/]+)/, '$1').replace(/\/+$/, '');
  if (!comfyuiUrl) return res.status(500).json({ error: 'COMFYUI_URL not set' });

  try {
    const { promptId } = (req.body || {}) as { promptId?: string };

    let targetPromptId = promptId?.trim();

    // If no promptId provided, try to grab the currently running prompt
    if (!targetPromptId) {
      const queueResp = await fetch(`${comfyuiUrl}/queue`);
      if (!queueResp.ok) {
        const details = await queueResp.text().catch(() => '');
        return res.status(502).json({ error: 'Failed to inspect queue', details });
      }
      const queue: QueueStatus = await queueResp.json();
      const running = queue.queue_running || [];
      if (running.length === 0) {
        return res.status(200).json({ ok: true, message: 'No running prompt to cancel' });
      }
      // ComfyUI queue entries look like [priority, prompt_id]
      targetPromptId = running[0]?.[1];
    }

    if (!targetPromptId) {
      return res.status(400).json({ error: 'No promptId found to cancel' });
    }

    const deleteResp = await fetch(`${comfyuiUrl}/queue/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: targetPromptId }),
    });

    if (!deleteResp.ok) {
      const details = await deleteResp.text().catch(() => '');
      return res.status(deleteResp.status).json({
        error: 'Failed to cancel prompt',
        details: details || `HTTP ${deleteResp.status}`,
        promptId: targetPromptId,
      });
    }

    return res.status(200).json({ ok: true, promptId: targetPromptId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to cancel ComfyUI prompt' });
  }
}










