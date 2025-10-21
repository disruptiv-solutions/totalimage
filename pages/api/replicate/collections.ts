import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { slug } = req.query;
      
      const apiToken = process.env.REPLICATE_API_TOKEN;
      
      if (!apiToken) {
        return res.status(500).json({ error: 'Replicate API token not configured' });
      }

      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Collection slug is required' });
      }

      const url = `https://api.replicate.com/v1/collections/${slug}`;

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
      console.error('Error fetching collection:', error);
      return res.status(500).json({ error: 'Failed to fetch collection' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}






