import { useMemo, useState } from 'react';
import Head from 'next/head';

type ApiResult =
  | { status: 'succeeded'; output: string[] }
  | { error: string; details?: string };

const clamp64 = (n: number, min = 512, max = 2048) =>
  Math.min(max, Math.max(min, Math.round(n / 64) * 64));

const Presets = [
  { name: 'Square 1024', w: 1024, h: 1024 },
  { name: 'Portrait 896×1152', w: 896, h: 1152 },
  { name: 'Landscape 1152×896', w: 1152, h: 896 },
  { name: 'XL 1344×768', w: 1344, h: 768 },
];

export default function ComfyTestPage() {
  const [prompt, setPrompt] = useState(
    'Astronaut in a jungle, cold color palette, muted colors, highly detailed, filmic lighting, 35mm'
  );
  // Multiple LoRA support
  type LoRAConfig = {
    id: string;
    name: string;
    strengthModel: number;
    strengthClip: number;
    enabled: boolean;
  };

  const [loras, setLoras] = useState<LoRAConfig[]>([
    {
      id: '1',
      name: 'Lois-Griffin-ill-v1-sadvideocard.safetensors',
      strengthModel: 1.0,
      strengthClip: 1.0,
      enabled: false,
    }
  ]);

  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [seed, setSeed] = useState(-1);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string>('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>('');

  const disabled = useMemo(
    () => generating || !prompt.trim(),
    [generating, prompt]
  );

  const setPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 2 ** 31));
  const useRandomSeed = () => setSeed(-1);

  const safeNum = (v: string, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[ComfyUI Debug] ${message}`);
  };

  // LoRA management functions
  const addLora = () => {
    const newId = (Math.max(...loras.map(l => parseInt(l.id)), 0) + 1).toString();
    setLoras(prev => [...prev, {
      id: newId,
      name: 'LoisGriffinlllustrious1.0.safetensors',
      strengthModel: 1.0,
      strengthClip: 1.0,
      enabled: false,
    }]);
  };

  const removeLora = (id: string) => {
    setLoras(prev => prev.filter(l => l.id !== id));
  };

  const updateLora = (id: string, updates: Partial<LoRAConfig>) => {
    setLoras(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Available LoRA names based on the files you showed
  const availableLoras = [
    'LoisGriffinlllustrious1.0.safetensors',
    'Lois-Griffin-ill-v1-sadvideocard.safetensors',
    'LoisGriffinNoobXL_byKonan.safetensors',
  ];

  const enabledLoras = loras.filter(l => l.enabled);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      setResult(null);
      setElapsedMs(null);
      setDebugLogs([]);
      setProgress('Starting generation...');
      const t0 = performance.now();

      addDebugLog('🚀 Starting ComfyUI generation');
      addDebugLog(`Prompt: "${prompt}"`);
      addDebugLog(`Enabled LoRAs: ${enabledLoras.length}`);
      enabledLoras.forEach((lora, idx) => {
        addDebugLog(`  LoRA ${idx + 1}: ${lora.name} (model: ${lora.strengthModel}, clip: ${lora.strengthClip})`);
      });

      // sanitize inputs
      const w = clamp64(width);
      const h = clamp64(height);
      const st = Math.max(1, Math.min(100, Math.floor(steps)));
      const sd = Number.isFinite(seed) ? Math.floor(seed) : -1;

      addDebugLog(`Settings: ${w}x${h}, ${st} steps, seed: ${sd}`);

      // build payload
      const body = {
        prompt,
        settings: {
          width: w,
          height: h,
          steps: st,
          seed: sd,
          loras: enabledLoras, // Send the full LoRA configurations
        },
      };

      setProgress('Sending request to ComfyUI...');
      addDebugLog('📤 Sending request to /api/generate-image-comfyui');

      const response = await fetch('/api/generate-image-comfyui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      addDebugLog(`📡 Response received: ${response.status} ${response.statusText}`);

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
        addDebugLog('✅ Response parsed successfully');
        if (data?.output) {
          addDebugLog(`🖼️ Generated ${data.output.length} image(s)`);
        }
      } catch (e) {
        addDebugLog('❌ Failed to parse response as JSON');
        addDebugLog(`Raw response: ${text.substring(0, 200)}...`);
      }

      const t1 = performance.now();
      const elapsed = Math.max(0, Math.round(t1 - t0));
      setElapsedMs(elapsed);
      addDebugLog(`⏱️ Total time: ${elapsed}ms`);

      if (!response.ok) {
        const msg = [
          `${response.status} ${response.statusText}`,
          data?.error || '',
          typeof data?.details === 'string' ? data.details : '',
          !data && text ? text : '',
        ]
          .filter(Boolean)
          .join('\n');
        setError(msg || 'Generation failed');
        addDebugLog(`❌ Error: ${msg}`);
        return;
      }

      addDebugLog('🎉 Generation completed successfully!');
      setResult(data as ApiResult);
      setProgress('Generation completed!');
    } catch (err: any) {
      const errorMsg = err?.message || 'Generation failed';
      setError(errorMsg);
      addDebugLog(`💥 Exception: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <Head>
        <title>ComfyUI Test — Illustrious XL</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">ComfyUI Test — Illustrious XL</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Generation Settings</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your prompt…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-2">
                    Width (64-step)
                  </label>
                  <input
                    id="width"
                    type="number"
                    inputMode="numeric"
                    value={width}
                    onChange={(e) => setWidth(clamp64(safeNum(e.target.value, width)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={512}
                    max={2048}
                    step={64}
                  />
                </div>

                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
                    Height (64-step)
                  </label>
                  <input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    value={height}
                    onChange={(e) => setHeight(clamp64(safeNum(e.target.value, height)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={512}
                    max={2048}
                    step={64}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-2">
                    Steps (1–100)
                  </label>
                  <input
                    id="steps"
                    type="number"
                    inputMode="numeric"
                    value={steps}
                    onChange={(e) => setSteps(Math.max(1, Math.min(100, safeNum(e.target.value, steps))))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={1}
                    max={100}
                  />
                </div>

                <div>
                  <label htmlFor="seed" className="block text-sm font-medium text-gray-700 mb-2">
                    Seed (-1 = random)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="seed"
                      type="number"
                      inputMode="numeric"
                      value={seed}
                      onChange={(e) => setSeed(safeNum(e.target.value, seed))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 border rounded-lg text-sm"
                      onClick={randomizeSeed}
                      title="Randomize seed"
                    >
                      🎲
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 border rounded-lg text-sm"
                      onClick={useRandomSeed}
                      title="Use -1 (random each run)"
                    >
                      -1
                    </button>
                  </div>
                </div>
              </div>

              {/* Multiple LoRA Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">LoRA Settings</h3>
                  <button
                    type="button"
                    onClick={addLora}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add LoRA
                  </button>
                </div>

                {loras.map((lora, index) => (
                  <div key={lora.id} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={lora.enabled}
                          onChange={(e) => updateLora(lora.id, { enabled: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          LoRA {index + 1}
                        </label>
                      </div>
                      {loras.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLora(lora.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        LoRA Name
                      </label>
                      <select
                        value={lora.name}
                        onChange={(e) => updateLora(lora.id, { name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={!lora.enabled}
                      >
                        {availableLoras.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Strength Model
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={lora.strengthModel}
                          onChange={(e) => updateLora(lora.id, { 
                            strengthModel: Math.max(0, Math.min(2, parseFloat(e.target.value) || 1))
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={!lora.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Strength CLIP
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={lora.strengthClip}
                          onChange={(e) => updateLora(lora.id, { 
                            strengthClip: Math.max(0, Math.min(2, parseFloat(e.target.value) || 1))
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={!lora.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {enabledLoras.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    No LoRAs enabled. Click "Add LoRA" and enable to include LoRA effects.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {Presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPreset(p.w, p.h)}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={disabled}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {generating ? 'Generating…' : 'Generate Image'}
              </button>

              {elapsedMs !== null && (
                <div className="text-xs text-gray-600">
                  Elapsed: <span className="font-mono">{elapsedMs} ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="text-red-800 font-semibold mb-1">Error</h3>
                <pre className="text-red-700 whitespace-pre-wrap text-sm">{error}</pre>
              </div>
            )}

            {/* Progress and Debug Logs */}
            {(generating || debugLogs.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-blue-800 font-semibold mb-2">
                  {generating ? '🔄 Progress' : '📋 Debug Logs'}
                </h3>
                {generating && progress && (
                  <div className="text-blue-700 mb-2 font-medium">{progress}</div>
                )}
                {debugLogs.length > 0 && (
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className="mb-1">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result && 'status' in result && (
              <div className="space-y-4">
                <div className="mb-2">
                  <h3 className="font-medium text-gray-700 mb-1">Status:</h3>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      result.status === 'succeeded'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                {'output' in result && Array.isArray(result.output) && result.output.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Generated Images</h3>
                    <div className="space-y-4">
                      {result.output.map((imageUrl: string, idx: number) => (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`Generated image ${idx + 1}`}
                            className="w-full h-auto"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.replaceWith(document.createTextNode(`⚠️ Failed to load image: ${imageUrl}`));
                            }}
                          />
                          <div className="p-3 bg-gray-50 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Image {idx + 1}</span>
                              <div className="flex gap-3">
                                <a
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View
                                </a>
                                <a
                                  href={imageUrl}
                                  download
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">
                              <div className="font-medium mb-1">URL</div>
                              <div className="bg-white p-2 rounded border font-mono text-[11px] break-all">
                                {imageUrl}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View Raw Response
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {!result && !error && (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🎨</div>
                <p>Enter a prompt and click “Generate Image”.</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <h3 className="font-semibold mb-2">ComfyUI Integration Tips</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Tunnel must point to the ComfyUI port (default 8000).</li>
            <li>Set <code>COMFYUI_URL</code> in the shell where you run <code>next dev</code>.</li>
            <li>If you see 400/502, the UI now shows the exact error body from the API.</li>
            <li>LoRA is a simple checkbox. Off = baseline model; On = requires the LoRA file to exist server-side.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
