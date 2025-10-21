import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { owner, name } = req.query;
      
      const apiToken = process.env.REPLICATE_API_TOKEN;
      
      if (!apiToken) {
        return res.status(500).json({ error: 'Replicate API token not configured' });
      }

      if (!owner || typeof owner !== 'string' || !name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Owner and name are required' });
      }

      const url = `https://api.replicate.com/v1/models/${owner}/${name}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'Model not found' });
        }
        throw new Error(`Replicate API error: ${response.statusText}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching model:', error);
      return res.status(500).json({ error: 'Failed to fetch model' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}



