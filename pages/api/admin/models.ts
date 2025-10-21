import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '../../../lib/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // TODO: Add authentication check here to verify admin user

  if (req.method === 'GET') {
    try {
      // Fetch all saved models from Firestore
      const modelsSnapshot = await adminDb.collection('aiModels').get();
      const models = modelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({ models });
    } catch (error) {
      console.error('Error fetching models:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
  } else if (req.method === 'POST') {
    try {
      const { modelData } = req.body;

      if (!modelData || !modelData.owner || !modelData.name) {
        return res.status(400).json({ error: 'Invalid model data' });
      }

      // Fetch the model details and schema from Replicate
      const apiToken = process.env.REPLICATE_API_TOKEN;
      
      if (!apiToken) {
        return res.status(500).json({ error: 'Replicate API token not configured' });
      }

      // Get model details
      const modelUrl = `https://api.replicate.com/v1/models/${modelData.owner}/${modelData.name}`;
      const modelResponse = await fetch(modelUrl, {
        headers: {
          'Authorization': `Token ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!modelResponse.ok) {
        throw new Error('Failed to fetch model from Replicate');
      }

      const model = await modelResponse.json();

      // Get latest version to fetch schema
      let schema = null;
      if (model.latest_version && model.latest_version.id) {
        const versionUrl = `https://api.replicate.com/v1/models/${modelData.owner}/${modelData.name}/versions/${model.latest_version.id}`;
        const versionResponse = await fetch(versionUrl, {
          headers: {
            'Authorization': `Token ${apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (versionResponse.ok) {
          const version = await versionResponse.json();
          schema = {
            input: version.openapi_schema?.components?.schemas?.Input || null,
            output: version.openapi_schema?.components?.schemas?.Output || null
          };
        }
      }

      // Prepare model document for Firestore
      // Replace / with _ for Firestore document ID (Firestore doesn't allow / in doc IDs)
      const firestoreId = `${model.owner}_${model.name}`;
      
      const modelDoc = {
        id: `${model.owner}/${model.name}`, // Keep original format for display
        firestoreId: firestoreId, // Firestore-safe ID
        owner: model.owner,
        name: model.name,
        description: model.description || '',
        url: model.url,
        visibility: model.visibility,
        github_url: model.github_url || null,
        paper_url: model.paper_url || null,
        license_url: model.license_url || null,
        run_count: model.run_count || 0,
        cover_image_url: model.cover_image_url || null,
        latest_version: model.latest_version ? {
          id: model.latest_version.id,
          created_at: model.latest_version.created_at
        } : null,
        schema: schema,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to Firestore using Firestore-safe ID
      await adminDb.collection('aiModels').doc(firestoreId).set(modelDoc);

      return res.status(200).json({ model: modelDoc });
    } catch (error) {
      console.error('Error saving model:', error);
      return res.status(500).json({ error: 'Failed to save model' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { modelId } = req.query;

      if (!modelId || typeof modelId !== 'string') {
        return res.status(400).json({ error: 'Model ID is required' });
      }

      // Convert owner/name format to Firestore-safe format
      const firestoreId = modelId.replace('/', '_');

      await adminDb.collection('aiModels').doc(firestoreId).delete();

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting model:', error);
      return res.status(500).json({ error: 'Failed to delete model' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

