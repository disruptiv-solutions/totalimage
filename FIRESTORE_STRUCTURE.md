# Firestore Database Structure

## Collections

### `aiModels`

Stores AI models selected by admins from Replicate, including their complete schema information.

#### Document Structure

**Document ID:** `{owner}/{name}` (e.g., `delta-lock/ponynai3`)

**Fields:**

```typescript
{
  id: string;                      // "owner/name" format
  owner: string;                   // Model owner username
  name: string;                    // Model name
  description: string;             // Model description
  url: string;                     // Replicate model URL
  visibility: string;              // "public" | "private"
  github_url: string | null;       // GitHub repository URL
  paper_url: string | null;        // Research paper URL
  license_url: string | null;      // License information URL
  run_count: number;               // Total number of runs on Replicate
  cover_image_url: string | null;  // Model cover image
  latest_version: {                // Latest model version info
    id: string;                    // Version ID
    created_at: string;            // ISO timestamp
  } | null;
  schema: {                        // Model input/output schema
    input: object;                 // OpenAPI schema for inputs
    output: object;                // OpenAPI schema for outputs
  } | null;
  created_at: string;              // ISO timestamp when added to Firestore
  updated_at: string;              // ISO timestamp of last update
}
```

#### Example Document

```json
{
  "id": "delta-lock/ponynai3",
  "owner": "delta-lock",
  "name": "ponynai3",
  "description": "Models fine-tuned from Pony-XL series.",
  "url": "https://replicate.com/delta-lock/ponynai3",
  "visibility": "public",
  "github_url": null,
  "paper_url": null,
  "license_url": "https://...",
  "run_count": 764900,
  "cover_image_url": "https://...",
  "latest_version": {
    "id": "abc123...",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "schema": {
    "input": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "The prompt for image generation"
        },
        "width": {
          "type": "integer",
          "minimum": 1,
          "maximum": 4096,
          "default": 1184
        },
        "height": {
          "type": "integer",
          "minimum": 1,
          "maximum": 4096,
          "default": 864
        }
        // ... more input fields
      }
    },
    "output": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri"
      }
    }
  },
  "created_at": "2025-10-14T12:00:00.000Z",
  "updated_at": "2025-10-14T12:00:00.000Z"
}
```

## API Endpoints

### `GET /api/admin/models`
Retrieves all saved AI models from Firestore.

**Response:**
```json
{
  "models": [/* array of model objects */]
}
```

### `POST /api/admin/models`
Saves a new AI model to Firestore with its schema.

**Request Body:**
```json
{
  "modelData": {
    "owner": "delta-lock",
    "name": "ponynai3"
  }
}
```

**Response:**
```json
{
  "model": {/* saved model object */}
}
```

### `DELETE /api/admin/models?modelId={owner/name}`
Deletes a saved AI model from Firestore.

**Response:**
```json
{
  "success": true
}
```

## Usage

Models saved through the admin config page will:
1. Be fetched from Replicate API
2. Have their latest version schema retrieved
3. Be stored in Firestore with complete metadata
4. Be available for use in the image generation flow



