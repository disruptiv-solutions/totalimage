import { useState } from 'react';
import Head from 'next/head';

const TestIllustriousPage: React.FC = () => {
  const [prompt, setPrompt] = useState('a beautiful anime character with flowing hair');
  const [loras, setLoras] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleTest = async () => {
    try {
      setGenerating(true);
      setError('');
      setResult(null);

      const response = await fetch('/api/generate-image-comfyui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          settings: {
            width: 1024,
            height: 1024,
            steps: 28,
            // Note: Illustrious XL API doesn't support negative_prompt
            loras: loras,
            seed: -1
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <Head>
        <title>Test Illustrious XL API</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Illustrious XL API</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Parameters</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your prompt here..."
              />
            </div>
            
            <div>
              <label htmlFor="loras" className="block text-sm font-medium text-gray-700 mb-2">
                Use Lois Griffin LoRA
              </label>
              <input
                id="loras"
                type="text"
                value={loras}
                onChange={(e) => setLoras(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 'true' to use the actual LoRA file"
              />
              <p className="text-xs text-green-600 mt-1">
                ✅ Full LoRA support via ComfyUI! Make sure ComfyUI is running locally.
              </p>
            </div>
            
            <button
              onClick={handleTest}
              disabled={generating || !prompt.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Test Generation'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Status:</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                result.status === 'succeeded' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.status}
              </span>
            </div>

            {result.output && result.output.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Generated Images:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.output.map((imageUrl: string, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="relative">
                        <img
                          src={imageUrl}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-auto"
                          onError={(e) => {
                            console.error(`Failed to load image ${index + 1}:`, imageUrl);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const errorDiv = target.nextElementSibling as HTMLElement;
                            if (errorDiv) errorDiv.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 text-sm hidden"
                          style={{ display: 'none' }}
                        >
                          <div className="text-center">
                            <div className="text-red-500 mb-2">⚠️</div>
                            <div>Failed to load image</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Image {index + 1}</span>
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Full Size
                          </a>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div className="font-medium mb-1">URL Type:</div>
                          <div className="bg-white p-2 rounded border font-mono">
                            {imageUrl.startsWith('data:image/') 
                              ? `Base64 Data (${Math.round(imageUrl.length / 1024)}KB)`
                              : imageUrl.startsWith('http') 
                                ? `External URL (${imageUrl.length} chars)`
                                : `Unknown Format (${imageUrl.length} chars)`
                            }
                          </div>
                          <div className="mt-1 text-gray-500 break-all">
                            {imageUrl.length > 80 
                              ? `${imageUrl.substring(0, 80)}...`
                              : imageUrl
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                View Raw Response
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestIllustriousPage;
