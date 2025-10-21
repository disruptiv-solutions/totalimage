import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { query } = req.query;
      
      const apiToken = process.env.REPLICATE_API_TOKEN;
      
      if (!apiToken) {
        return res.status(500).json({ error: 'Replicate API token not configured' });
      }

      let url = 'https://api.replicate.com/v1/models';
      
      // If query parameter exists, use search endpoint
      if (query && typeof query === 'string') {
        url = `https://api.replicate.com/v1/models?query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.statusText}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}


