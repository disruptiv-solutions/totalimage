import { useState } from 'react';
import { Loader, Download, Copy, Check } from 'lucide-react';

export default function TestHF() {
  const [prompt, setPrompt] = useState('lois griffin waving hello, 1girl, detailed, high quality');
  const [loraUrl, setLoraUrl] = useState('');
  const [loraScale, setLoraScale] = useState(0.8);
  const [steps, setSteps] = useState(28);
  const [guidanceScale, setGuidanceScale] = useState(5.0);
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, ugly');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(-1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generationTime, setGenerationTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setImageUrl('');
    
    const startTime = Date.now();

    try {
      // For testing: Get token from localStorage or prompt user
      let hfToken = localStorage.getItem('hf_token');
      
      if (!hfToken) {
        hfToken = window.prompt('Enter your Hugging Face token (hf_...):\n\nGet it from: https://huggingface.co/settings/tokens\n\n(It will be saved in localStorage for this session)');
        if (hfToken) {
          localStorage.setItem('hf_token', hfToken);
        } else {
          throw new Error('Hugging Face token required');
        }
      }

      // Build payload
      const payload: any = {
        inputs: prompt,
        parameters: {}
      };

      if (steps) payload.parameters.num_inference_steps = steps;
      if (guidanceScale) payload.parameters.guidance_scale = guidanceScale;
      if (negativePrompt) payload.parameters.negative_prompt = negativePrompt;
      if (width) payload.parameters.width = width;
      if (height) payload.parameters.height = height;
      if (seed !== -1) payload.parameters.seed = seed;
      if (loraUrl.trim()) {
        payload.parameters.lora_url = loraUrl.trim();
        payload.parameters.lora_scale = loraScale;
      }

      console.log('=== CALLING HF ENDPOINT DIRECTLY ===');
      console.log('Payload:', payload);

      // Call HF endpoint directly from browser
      const response = await fetch('https://vrejxat1x5ukm592.us-east-1.aws.endpoints.huggingface.cloud', {
        method: 'POST',
        headers: {
          'Accept': 'image/png',
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HF Error:', errorText);
        throw new Error(`HF Endpoint error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('Response content-type:', contentType);

      if (contentType.includes('application/json')) {
        // JSON response - could be base64 string or object with image field
        const data = await response.json();
        console.log('=== JSON RESPONSE ===');
        console.log('Type:', typeof data);
        console.log('Is Array:', Array.isArray(data));
        
        if (typeof data === 'string') {
          // Direct base64 string
          console.log('✓ Got base64 string, length:', data.length);
          setImageUrl(`data:image/png;base64,${data}`);
        } else if (data.image) {
          // Object with image field (custom handler)
          console.log('✓ Got object with image field');
          setImageUrl(`data:image/png;base64,${data.image}`);
        } else {
          console.error('Unexpected JSON structure:', Object.keys(data));
          throw new Error(`Unexpected JSON response structure`);
        }
      } else if (contentType.includes('image/')) {
        // Direct image blob response
        console.log('✓ Got image blob');
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImageUrl(imageUrl);
      } else {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      setGenerationTime((Date.now() - startTime) / 1000);
      console.log('✓ Generation successful');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate image');
      
      // If token error, clear it so user can re-enter
      if (err.message?.includes('token') || err.message?.includes('401') || err.message?.includes('403')) {
        localStorage.removeItem('hf_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hf-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearToken = () => {
    localStorage.removeItem('hf_token');
    alert('Token cleared! You will be prompted to enter it again on next generation.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤗 Hugging Face Endpoint Tester
          </h1>
          <p className="text-gray-600">
            Test your deployed endpoint with custom parameters
          </p>
          <code className="text-xs bg-gray-200 px-3 py-1 rounded mt-2 inline-block text-gray-700">
            https://vrejxat1x5ukm592.us-east-1.aws.endpoints.huggingface.cloud
          </code>
          <button
            onClick={clearToken}
            className="ml-3 text-xs text-red-600 hover:text-red-700 underline"
          >
            Clear Token
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-4">
            {/* Prompt */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Prompt
                </label>
                <button
                  onClick={copyPrompt}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Enter your prompt..."
              />
            </div>

            {/* LoRA Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">LoRA (Optional)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">LoRA URL</label>
                  <input
                    type="text"
                    value={loraUrl}
                    onChange={(e) => setLoraUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="https://civitai.com/models/..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    LoRA Scale: {loraScale}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={loraScale}
                    onChange={(e) => setLoraScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Generation Parameters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Generation Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Steps</label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Guidance Scale</label>
                  <input
                    type="number"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="1"
                    max="20"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="512"
                    max="2048"
                    step="64"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="512"
                    max="2048"
                    step="64"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Seed (-1 for random)</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Negative Prompt
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="What to avoid..."
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6 min-h-[600px] flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Output</h3>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Generating your image...</p>
                  </div>
                </div>
              )}

              {imageUrl && !loading && (
                <div className="flex-1 flex flex-col">
                  <div className="relative flex-1 bg-gray-50 rounded-lg overflow-hidden mb-4">
                    <img
                      src={imageUrl}
                      alt="Generated"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Generated in <strong>{generationTime.toFixed(2)}s</strong>
                    </span>
                    <button
                      onClick={downloadImage}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {!imageUrl && !loading && !error && (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-lg mb-2">No image yet</p>
                    <p className="text-sm">Configure parameters and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

