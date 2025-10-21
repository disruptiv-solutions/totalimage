import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import { join } from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Path to the LoRA file in the public directory
    const loraPath = join(process.cwd(), 'public', 'LoisGriffinIllustrious1.0.safetensors');
    
    // Read the LoRA file
    const loraFile = await readFile(loraPath);
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="LoisGriffinIllustrious1.0.safetensors"');
    res.setHeader('Content-Length', loraFile.length);
    
    // Send the file
    res.send(loraFile);
  } catch (error: any) {
    console.error('Error serving LoRA file:', error);
    res.status(500).json({ error: 'Failed to serve LoRA file' });
  }
}

