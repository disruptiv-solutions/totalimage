import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { AdminShell } from '../../components/admin/AdminShell';
import { 
  Sparkles,
  ChevronDown,
  X,
  Settings,
  Loader,
  ExternalLink,
  Plus,
  Mic,
  Send,
  Square,
  Edit3,
  Copy,
  FileText,
  Trash2,
  Dice6
} from 'lucide-react';

interface User {
  email: string;
  role?: string;
}

interface SavedModel {
  id: string;
  owner: string;
  name: string;
  description: string;
  url: string;
  latest_version?: {
    id: string;
    created_at: string;
  };
  schema?: {
    input: any;
    output: any;
  };
}

interface LoRAConfig {
  id: string;
  name: string;
  strengthModel: number;
  strengthClip: number;
  enabled: boolean;
}

interface ImageData {
  id: string;
  downloadUrl?: string;
  signedUrl?: string;
  metadata?: {
    prompt?: string;
    settings?: any;
    loras?: any;
    source?: string;
    createdAt?: string;
    seed?: number;
  };
  path?: string;
  contentType?: string;
  size?: number;
  createdAt?: number;
}

const GeneratePage: React.FC = () => {
  const { user } = useAuth() as { user: User | null };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const generationAbortController = useRef<AbortController | null>(null);
  // Sessions toggle + data
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const currentSessionName = useMemo(() => {
    const s = sessions.find((x: any) => x.id === selectedSession);
    if (s?.name) return s.name as string;
    if (selectedSession) return 'Session';
    return 'Default';
  }, [sessions, selectedSession]);

  // Prompts management
  const [showPrompts, setShowPrompts] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([]);
  
  // System prompts management
  const [systemPrompts, setSystemPrompts] = useState<any[]>([]);
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<string>('');
  const [showSystemPromptDropdown, setShowSystemPromptDropdown] = useState(false);

  // Session settings management
  const [sessionSettings, setSessionSettings] = useState<Record<string, any>>({});
  const [settingsChanged, setSettingsChanged] = useState(false);

  // Section collapse state
  const [modelSettingsExpanded, setModelSettingsExpanded] = useState(false);
  const [loraSettingsExpanded, setLoraSettingsExpanded] = useState(false);

  // Lightbox state (declare after generatedImages)
  const [prompt, setPrompt] = useState('');
  const [availableModels, setAvailableModels] = useState<SavedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageData[]>([]);
  // Lightbox (after images state exists)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const showPrev = () => setLightboxIndex((i) => (i - 1 + generatedImages.length) % Math.max(generatedImages.length, 1));
  const showNext = () => setLightboxIndex((i) => (i + 1) % Math.max(generatedImages.length, 1));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, generatedImages.length]);
  const [error, setError] = useState<string>('');
  const [buttonFeedback, setButtonFeedback] = useState<Record<string, string>>({});
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [modelInputs, setModelInputs] = useState<Record<string, any>>({});
  const [useRandomSeed, setUseRandomSeed] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const [cancelingPrompt, setCancelingPrompt] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  
  // Function to generate a random seed
  const generateRandomSeed = () => {
    return Math.floor(Math.random() * 2147483647); // Max 32-bit integer
  };

  const handleDiceClick = () => {
    const newSeed = generateRandomSeed();
    handleInputChange('seed', newSeed);
  };

  const [loras, setLoras] = useState<LoRAConfig[]>([
    {
      id: '1',
      name: '',
      strengthModel: 1.0,
      strengthClip: 1.0,
      enabled: false,
    }
  ]);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleToggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  const handleToggleSessions = async () => {
    const next = !showSessions;
    setShowSessions(next);
    if (next) {
      setShowPrompts(false); // Close prompts when opening sessions
      try {
        setSessionsLoading(true);
        const token = await (user as any)?.getIdToken?.();
        if (!token) return;
        const resp = await fetch('/api/generation-sessions', { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
        }
      } finally {
        setSessionsLoading(false);
      }
    }
  };

  const loadSessionImages = async (sessionId: string) => {
    try {
      const token = await (user as any)?.getIdToken?.();
      if (!token) return;
      const resp = await fetch(`/api/session-images?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const images = (data?.images || []).filter((img: any) => img.downloadUrl || img.signedUrl);
        setGeneratedImages(images);
      }
    } catch {}
  };

  // Prompts management functions
  const handleTogglePrompts = async () => {
    const next = !showPrompts;
    setShowPrompts(next);
    if (next) {
      setShowSessions(false); // Close sessions when opening prompts
      // Load saved prompts and system prompts from localStorage
      try {
        setPromptsLoading(true);
        const stored = localStorage.getItem('savedPrompts');
        if (stored) {
          setSavedPrompts(JSON.parse(stored));
        }
        loadSystemPrompts();
      } finally {
        setPromptsLoading(false);
      }
    }
  };

  const savePrompt = (name: string, promptText: string) => {
    const newPrompt = {
      id: Date.now().toString(),
      name: name,
      text: promptText,
      createdAt: new Date().toISOString()
    };
    const updated = [...savedPrompts, newPrompt];
    setSavedPrompts(updated);
    localStorage.setItem('savedPrompts', JSON.stringify(updated));
  };

  const deletePrompt = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem('savedPrompts', JSON.stringify(updated));
  };

  const loadPrompt = (promptText: string) => {
    setPrompt(promptText);
    setShowPrompts(false);
  };

  // System prompts management functions
  const saveSystemPrompt = (name: string, promptText: string) => {
    const newSystemPrompt = {
      id: Date.now().toString(),
      name: name,
      text: promptText,
      createdAt: new Date().toISOString(),
      type: 'system'
    };
    const updated = [...systemPrompts, newSystemPrompt];
    setSystemPrompts(updated);
    localStorage.setItem('systemPrompts', JSON.stringify(updated));
  };

  const deleteSystemPrompt = (id: string) => {
    const updated = systemPrompts.filter(p => p.id !== id);
    setSystemPrompts(updated);
    localStorage.setItem('systemPrompts', JSON.stringify(updated));
    // If we're deleting the selected system prompt, reset to default
    if (selectedSystemPrompt === id) {
      setSelectedSystemPrompt('');
    }
  };

  const loadSystemPrompts = () => {
    try {
      const stored = localStorage.getItem('systemPrompts');
      if (stored) {
        setSystemPrompts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load system prompts:', error);
    }
  };

  const getSystemPromptContent = (promptId: string) => {
    const systemPrompt = systemPrompts.find(p => p.id === promptId);
    return systemPrompt ? systemPrompt.text : 'You are a helpful AI assistant that helps users create prompts for image generation. Be creative and detailed in your suggestions.';
  };

  const startChatMode = () => {
    setChatMode(true);
    const systemPromptContent = getSystemPromptContent(selectedSystemPrompt);
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you create a great prompt for image generation. What kind of image are you looking to create?'
    }]);
  };

  const exitChatMode = () => {
    setChatMode(false);
    setChatMessages([]);
  };

  const saveCurrentPromptFromChat = () => {
    const name = window.prompt('Enter prompt name:');
    if (!name || !prompt.trim()) return;
    savePrompt(name, prompt);
    setShowPrompts(false);
    setChatMode(false);
    setChatMessages([]);
  };

  const saveAIResponseAsPrompt = (content: string, type: 'image' | 'system') => {
    const name = window.prompt(`Enter ${type} prompt name:`);
    if (!name || !content.trim()) return;
    
    if (type === 'image') {
      savePrompt(name, content);
    } else {
      saveSystemPrompt(name, content);
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message
    };

    setChatMessages(prev => [...prev, userMessage]);

    try {
      // Call the chat API to get AI response
      const token = await (user as any)?.getIdToken?.();
      if (!token) return;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: getSystemPromptContent(selectedSystemPrompt) },
            ...chatMessages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: userMessage.role, content: userMessage.content }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: data.response || 'I apologize, but I had trouble processing your request. Could you try again?'
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: `Sorry, I encountered an error: ${errorData.message || 'Please try again.'}`
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'I apologize, but I encountered a network error. Please check your connection and try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Session settings management functions
  const saveSessionSettings = async () => {
    if (!selectedSession) return;
    
    try {
      const token = await (user as any)?.getIdToken?.();
      if (!token) return;

      const settingsToSave = {
        modelInputs: { ...modelInputs },
        loras: [...loras],
        selectedModel: selectedModel,
        prompt: prompt,
        ckptName: ckptName
      };

      // Save to localStorage for now (could be moved to API later)
      const key = `session_settings_${selectedSession}`;
      localStorage.setItem(key, JSON.stringify(settingsToSave));
      
      setSettingsChanged(false);
      
      // Update session settings cache
      setSessionSettings(prev => ({
        ...prev,
        [selectedSession]: settingsToSave
      }));
    } catch (error) {
      console.error('Failed to save session settings:', error);
    }
  };

  const loadSessionSettings = (sessionId: string) => {
    try {
      const key = `session_settings_${sessionId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.modelInputs) setModelInputs(settings.modelInputs);
        if (settings.loras) setLoras(settings.loras);
        if (settings.selectedModel) setSelectedModel(settings.selectedModel);
        if (settings.prompt) setPrompt(settings.prompt);
        if (settings.ckptName) setCkptName(settings.ckptName);
      }
      setSettingsChanged(false);
    } catch (error) {
      console.error('Failed to load session settings:', error);
    }
  };

  const editPrompt = (id: string, currentText: string) => {
    const newText = window.prompt('Edit prompt text:', currentText);
    if (newText !== null && newText !== currentText) {
      const updated = savedPrompts.map(p => 
        p.id === id ? { ...p, text: newText } : p
      );
      setSavedPrompts(updated);
      localStorage.setItem('savedPrompts', JSON.stringify(updated));
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setModelInputs(prev => ({
      ...prev,
      [key]: value
    }));
    setSettingsChanged(true);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setSettingsChanged(true);
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    setSettingsChanged(true);
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
    setSettingsChanged(true);
  };

  const removeLora = (id: string) => {
    setLoras(prev => prev.filter(l => l.id !== id));
    setSettingsChanged(true);
  };

  const updateLora = (id: string, updates: Partial<LoRAConfig>) => {
    setLoras(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    setSettingsChanged(true);
  };

  // Image card functions
  const copyImageUrl = async (imageUrl: string, imageId: string) => {
    const buttonKey = `copy-${imageId}`;
    try {
      await navigator.clipboard.writeText(imageUrl);
      setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Copied!' }));
      setTimeout(() => {
        setButtonFeedback(prev => {
          const newState = { ...prev };
          delete newState[buttonKey];
          return newState;
        });
      }, 1500);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = imageUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Copied!' }));
        setTimeout(() => {
          setButtonFeedback(prev => {
            const newState = { ...prev };
            delete newState[buttonKey];
            return newState;
          });
        }, 1500);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const loadImagePrompt = (imageData: ImageData) => {
    if (imageData.metadata?.prompt) {
      setPrompt(imageData.metadata.prompt);
      setSettingsChanged(true);
      
      const buttonKey = `prompt-${imageData.id}`;
      setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Loaded!' }));
      setTimeout(() => {
        setButtonFeedback(prev => {
          const newState = { ...prev };
          delete newState[buttonKey];
          return newState;
        });
      }, 1500);
    }
  };

  const loadImageSeed = (imageData: ImageData) => {
    // Try to get seed from metadata.seed first, then from metadata.settings.seed
    const seed = imageData.metadata?.seed || imageData.metadata?.settings?.seed;
    if (seed !== undefined && seed !== null) {
      handleInputChange('seed', parseInt(seed));
      setSettingsChanged(true);
      
      const buttonKey = `seed-${imageData.id}`;
      setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Loaded!' }));
      setTimeout(() => {
        setButtonFeedback(prev => {
          const newState = { ...prev };
          delete newState[buttonKey];
          return newState;
        });
      }, 1500);
    }
  };

  const initiateDelete = (imageData: ImageData) => {
    setDeletingImageId(imageData.id);
  };

  const cancelDelete = () => {
    setDeletingImageId(null);
  };

  const confirmDelete = async (imageData: ImageData, index: number) => {
    const buttonKey = `delete-${imageData.id}`;
    setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Deleting...' }));

    try {
      const token = await (user as any)?.getIdToken?.();
      if (!token) {
        setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Failed!' }));
        setTimeout(() => {
          setButtonFeedback(prev => {
            const newState = { ...prev };
            delete newState[buttonKey];
            return newState;
          });
        }, 1500);
        setDeletingImageId(null);
        return;
      }

      // If the image has an ID and it's not a temporary ID, try to delete it from the database
      if (imageData.id && !imageData.id.startsWith('temp-')) {
        const response = await fetch(`/api/delete-image`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            imageId: imageData.id,
            sessionId: selectedSession
          }),
        });

        if (!response.ok) {
          console.error('Failed to delete image from database');
        }
      }

      // Remove from the UI regardless of API response
      setGeneratedImages(prev => prev.filter((_, i) => i !== index));
      setDeletingImageId(null);
      // Clear feedback as image is being removed
    } catch (error) {
      console.error('Error deleting image:', error);
      // Still remove from UI even if there's an error
      setGeneratedImages(prev => prev.filter((_, i) => i !== index));
      setDeletingImageId(null);
    }
  };

  // LoRA options fetched live from ComfyUI
  const [loraOptions, setLoraOptions] = useState<string[]>([]);
  const [checkpointOptions, setCheckpointOptions] = useState<string[]>(['waiIllustriousSDXL_v150.safetensors']);
  const [ckptName, setCkptName] = useState<string>('waiIllustriousSDXL_v150.safetensors');

  const enabledLoras = loras.filter(l => l.enabled);

  // Ensure there is at least one session to save into (auto-create "Default")
  const ensureDefaultSession = async (token: string): Promise<string> => {
    try {
      const listResp = await fetch('/api/generation-sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listResp.ok) {
        const data = await listResp.json();
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const byName = sessions.find((s: any) => (s?.name || '').toLowerCase() === 'default');
        if (byName?.id) return byName.id;
        if (sessions[0]?.id) return sessions[0].id;
      }
    } catch {}

    const createResp = await fetch('/api/generation-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Default', description: 'Auto-created session' }),
    });
    const created = await createResp.json().catch(() => ({}));
    return created?.sessionId || created?.id || 'default';
  };

  const renderSchemaInput = (key: string, schema: any) => {
    const inputValue = modelInputs[key] ?? schema.default ?? '';

    // Skip the prompt field if it exists in schema (we have a dedicated field for it)
    if (key === 'prompt') return null;

    // Handle different input types based on schema
    if (schema.type === 'string' && schema.enum) {
      // Dropdown for enum values
      return (
        <div key={key} className="mb-4">
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
            {schema.title || key.replace(/_/g, ' ')}
          </label>
          {schema.description && (
            <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
          )}
          <select
            id={key}
            value={inputValue}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
          >
            {schema.enum.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (schema.type === 'boolean') {
      // Checkbox for boolean
      return (
        <div key={key} className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inputValue}
              onChange={(e) => handleInputChange(key, e.target.checked)}
              className="w-4 h-4 text-[#4CAF50] border-gray-300 rounded focus:ring-[#4CAF50]"
            />
            <span className="text-sm font-medium text-gray-700 capitalize">
              {schema.title || key.replace(/_/g, ' ')}
            </span>
          </label>
          {schema.description && (
            <p className="text-xs text-gray-500 mt-1 ml-6">{schema.description}</p>
          )}
        </div>
      );
    } else if (schema.type === 'integer' || schema.type === 'number') {
      // Number input with optional min/max
      return (
        <div key={key} className="mb-4">
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
            {schema.title || key.replace(/_/g, ' ')}
          </label>
          {schema.description && (
            <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
          )}
          <input
            type="number"
            id={key}
            value={inputValue}
            onChange={(e) => handleInputChange(key, schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type === 'integer' ? 1 : 0.1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
          />
          {(schema.minimum !== undefined || schema.maximum !== undefined) && (
            <p className="text-xs text-gray-500 mt-1">
              Range: {schema.minimum ?? '−∞'} to {schema.maximum ?? '∞'}
            </p>
          )}
        </div>
      );
    } else if (schema.type === 'string') {
      // Text input or textarea for strings
      if (schema.format === 'uri') {
        return (
          <div key={key} className="mb-4">
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
              {schema.title || key.replace(/_/g, ' ')}
            </label>
            {schema.description && (
              <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
            )}
            <input
              type="url"
              id={key}
              value={inputValue}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={schema.description || 'Enter URL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
            />
          </div>
        );
      } else {
        // Use textarea for long fields like 'loras' or fields with long descriptions
        const isLongField = key === 'loras' || key === 'negative_prompt' || (schema.description && schema.description.length > 100);
        
        if (isLongField) {
          return (
            <div key={key} className="mb-4">
              <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                {schema.title || key.replace(/_/g, ' ')}
              </label>
              {schema.description && (
                <p className="text-xs text-gray-500 mb-1 whitespace-pre-wrap">{schema.description}</p>
              )}
              <textarea
                id={key}
                value={inputValue}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={key === 'loras' ? 'URL1:strength,URL2:strength (e.g., https://example.com/lora1.safetensors:0.8)' : schema.description}
                rows={key === 'loras' ? 4 : 3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm resize-y font-mono text-xs"
              />
            </div>
          );
        } else {
          return (
            <div key={key} className="mb-4">
              <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                {schema.title || key.replace(/_/g, ' ')}
              </label>
              {schema.description && (
                <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
              )}
              <input
                type="text"
                id={key}
                value={inputValue}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={schema.description}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
              />
            </div>
          );
        }
      }
    }

    return null;
  };

  const handleStopGeneration = () => {
    if (generationAbortController.current) {
      generationAbortController.current.abort();
      generationAbortController.current = null;
    }
    setGenerating(false);
    setError('');
  };

  const handleCancelPrompt = async () => {
    setCancelFeedback('');
    setError('');
    setCancelingPrompt(true);
    try {
      const resp = await fetch('/api/comfyui-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: lastPromptId || undefined }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to cancel ComfyUI prompt');
      }
      setCancelFeedback(
        data?.promptId
          ? `Cancelled prompt ${data.promptId}`
          : data?.message || 'No running prompt to cancel'
      );
      setGenerating(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel ComfyUI prompt');
    } finally {
      setCancelingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedModel || !prompt.trim()) return;

    try {
      setGenerating(true);
      setError('');
      setCancelFeedback('');
      setLastPromptId(null);

      // Create an abort controller for this generation
      generationAbortController.current = new AbortController();

      // Get the selected model data to access version info
      const selectedModelData = availableModels.find(m => m.id === selectedModel);
      if (!selectedModelData?.latest_version?.id) {
        throw new Error('Model version not found');
      }

      console.log('=== BATCH GENERATION START ===');
      console.log('Batch count:', batchCount);
      console.log('Use random seed:', useRandomSeed);
      
      const allGeneratedImages: { url: string; seed: number }[] = [];

      // Generate images in batches
      for (let i = 0; i < batchCount; i++) {
        // Generate random seed if useRandomSeed is enabled, otherwise use current seed
        let finalSettings = { ...modelInputs };
        let usedSeed = modelInputs.seed; // Store the seed that will be used - defaults to current input value
        
        if (useRandomSeed) {
          // Generate new random seed for each image in the batch
          const randomSeed = generateRandomSeed();
          finalSettings.seed = randomSeed;
          usedSeed = randomSeed;
        }
        // If useRandomSeed is false, we use the existing seed from modelInputs for all images

        // Update UI with the first (or only) seed for display purposes
        if (i === 0) {
          setModelInputs(prev => ({ ...prev, seed: usedSeed }));
        }

        // Prepare settings, excluding 'prompt' and 'loras' since we're handling them separately
        const { prompt: _excludedPrompt, loras: _excludedLoras, ...settingsWithoutPrompt } = finalSettings;

        console.log(`=== GENERATION ${i + 1}/${batchCount} ===`);
        console.log('Used seed:', usedSeed);
        console.log('Final settings:', settingsWithoutPrompt);

        // Start the generation using ComfyUI API (supports LoRAs)
        const response = await fetch('/api/generate-image-comfyui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          signal: generationAbortController.current.signal,
        body: JSON.stringify({
          prompt: prompt, // User's actual prompt from textarea
          settings: {
              ...settingsWithoutPrompt, // Include all model-specific inputs EXCEPT prompt and loras
              loras: enabledLoras, // Send the full LoRA configurations
              ckpt_name: ckptName,
          }
        }),
      });

        const result = await response.json();
        setLastPromptId(result?.promptId || null);
        if (!response.ok) {
          throw new Error(result?.error || `Failed to generate image ${i + 1}/${batchCount}`);
        }
        
        // Log the result
        console.log(`=== IMAGE ${i + 1}/${batchCount} RESULT ===`);
        console.log('Status:', result.status);
        console.log('Output:', result.output);
        console.log('Used seed:', usedSeed);
        
        if (result.status === 'succeeded' && result.output) {
          const images = Array.isArray(result.output) ? result.output : [result.output];
          // Store each image with its corresponding seed
          images.forEach(imageUrl => {
            allGeneratedImages.push({ url: imageUrl, seed: usedSeed });
          });
        } else {
          throw new Error(`Image ${i + 1}/${batchCount} generation failed: ${result.error || 'Unknown error'}`);
        }
      } // End of batch loop

      // Process all generated images from the batch
      if (allGeneratedImages.length > 0) {
        console.log('=== BATCH GENERATION COMPLETE ===');
        console.log('Total images generated:', allGeneratedImages.length);
        console.log('Used seeds:', allGeneratedImages.map(img => img.seed));
        console.log('All image URLs:', allGeneratedImages.map((img, index) => `${index + 1}: ${img.url.substring(0, 100)}...`));

          const savedUrls: string[] = [];

          try {
            const token = await (user as any)?.getIdToken?.();
            if (token) {
              // Use the currently selected session, or create a default one if none is selected
              let sessionId = selectedSession;
              if (!sessionId) {
                sessionId = await ensureDefaultSession(token);
                setSelectedSession(sessionId);
              }
              for (let i = 0; i < allGeneratedImages.length; i++) {
                const { url: imageUrl, seed: imageSeed } = allGeneratedImages[i];
                console.log('[UI] Saving image to Firebase:', imageUrl.substring(0, 120), 'with seed:', imageSeed);
                const resp = await fetch('/api/save-generated-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    sessionId,
                    imageData: imageUrl,
                    metadata: {
                      prompt,
                      settings: { ...modelInputs, seed: imageSeed },
                      loras: enabledLoras,
                      source: 'comfyui',
                      seed: imageSeed, // Explicitly store the seed used for this generation
                      createdAt: new Date().toISOString(),
                    },
                  }),
                });
                if (resp.ok) {
                  const data = await resp.json().catch(() => ({}));
                  const preferred = data?.image?.downloadUrl || data?.image?.signedUrl;
                  console.log('[UI] Saved image response:', data);
                  if (typeof preferred === 'string' && preferred) savedUrls.push(preferred);
                }
                else {
                  const text = await resp.text().catch(() => '');
                  console.warn('[UI] Save image failed:', resp.status, text.substring(0, 200));
                }
              }
              // After save, reload strictly for this session so the grid only shows its images
              await loadSessionImages(sessionId);
            }
          } catch (e) {
            console.warn('Skipping image persistence:', e);
          }
          // If saving failed, temporarily append to grid (non-persistent fallback)
          if (savedUrls.length === 0) {
            console.log('[UI] Displaying URLs (temporary):', allGeneratedImages);
            const tempImageData: ImageData[] = allGeneratedImages.map((img, index) => ({
              id: `temp-${Date.now()}-${index}`,
              downloadUrl: img.url,
              metadata: {
                prompt,
                settings: { ...modelInputs, seed: img.seed },
                loras: enabledLoras,
                source: 'comfyui',
                seed: img.seed,
                createdAt: new Date().toISOString(),
              },
            }));
            setGeneratedImages(prev => [...tempImageData, ...prev]);
          }
        } else {
          throw new Error('No images were generated');
        }

        console.log('✓ Batch generation completed successfully');
        setGenerating(false);
        generationAbortController.current = null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation was cancelled');
        setError('');
      } else {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image');
      }
      setGenerating(false);
      generationAbortController.current = null;
    }
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelsLoading(true);
        
        // Create a mock ComfyUI + Illustrious XL model with schema
        const illustriousModel: SavedModel = {
          id: 'comfyui-illustrious-xl',
          owner: 'comfyui-illustrious',
          name: 'ComfyUI + Illustrious XL',
          description: 'High-quality anime-style image generation with full LoRA support via ComfyUI',
          url: 'https://github.com/comfyanonymous/ComfyUI',
          latest_version: {
            id: 'illustrious-xl-v1',
            created_at: new Date().toISOString()
          },
          schema: {
            input: {
              properties: {
                width: {
                  type: 'integer',
                  title: 'Width',
                  description: 'Image width in pixels',
                  default: 1024,
                  minimum: 512,
                  maximum: 2048
                },
                height: {
                  type: 'integer',
                  title: 'Height',
                  description: 'Image height in pixels',
                  default: 1024,
                  minimum: 512,
                  maximum: 2048
                },
                steps: {
                  type: 'integer',
                  title: 'Steps',
                  description: 'Number of inference steps',
                  default: 28,
                  minimum: 10,
                  maximum: 50
                },
                // Note: Illustrious XL API doesn't support negative_prompt
                // negative_prompt: {
                //   type: 'string',
                //   title: 'Negative Prompt',
                //   description: 'What you don\'t want to see in the image',
                //   default: ''
                // },
                seed: {
                  type: 'integer',
                  title: 'Seed',
                  description: 'Random seed for reproducible generation (-1 for random)',
                  default: -1,
                  minimum: -1,
                  maximum: 2147483647
                }
              }
            },
            output: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        };

        setAvailableModels([illustriousModel]);
        setSelectedModel('comfyui-illustrious-xl');
          
          // Initialize model inputs with default values from schema
            const defaults: Record<string, any> = {};
        Object.entries(illustriousModel.schema!.input!.properties).forEach(([key, value]: [string, any]) => {
              if (value.default !== undefined) {
                defaults[key] = value.default;
              }
            });
            setModelInputs(defaults);
      } catch (error) {
        console.error('Error loading models:', error);
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Load ComfyUI dynamic options (checkpoints, loras)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const resp = await fetch('/api/comfyui-options');
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data?.loras)) {
          const comfyLoras = (data.loras as string[]).filter(Boolean);
          setLoraOptions(comfyLoras);
          // Auto-select the first available LoRA name only if user hasn't enabled anything yet
          if (comfyLoras.length > 0 && loras.length === 1 && !loras[0].enabled) {
            updateLora(loras[0].id, { name: comfyLoras[0] });
          }
        }
        if (Array.isArray(data?.checkpoints) && data.checkpoints.length > 0) {
          setCheckpointOptions(data.checkpoints as string[]);
          if (!data.checkpoints.includes(ckptName)) {
            setCkptName(data.checkpoints[0]);
          }
        }
      } catch {}
    };
    loadOptions();
  }, []);

  // Auto-select the Default session on page load and show its images
  useEffect(() => {
    const initSession = async () => {
      try {
        const token = await (user as any)?.getIdToken?.();
        if (!token) return;
        // Only initialize session if none is currently selected
        if (!selectedSession) {
          const sid = await ensureDefaultSession(token);
          setSelectedSession(sid);
          await loadSessionImages(sid);
          loadSessionSettings(sid);
        }
      } catch {}
    };
    initSession();
    // run when user becomes available
  }, [user, selectedSession]); // Add selectedSession as dependency to prevent overriding user selection

  // Load system prompts on mount
  useEffect(() => {
    loadSystemPrompts();
  }, []);

  // Auto-scroll chat messages to bottom
  useEffect(() => {
    if (chatMessagesRef.current && chatMode) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, chatMode]);

  // Close system prompt dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSystemPromptDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-system-prompt-dropdown]')) {
          setShowSystemPromptDropdown(false);
        }
      }
    };

    if (showSystemPromptDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSystemPromptDropdown]);

  return (
    <ProtectedRoute requireAdmin>
      <AdminShell
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        leftPanel={
          <>
            <aside
              className={`${
                drawerOpen ? (sidebarOpen ? 'w-[32rem]' : 'w-[10rem]') : 'w-0'
              } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden h-full flex-shrink-0`}
              aria-label="Generation drawer"
            >
              {drawerOpen && (
                <>
              {/* Drawer Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200 flex items-start gap-3">
                {/* Sessions Pill */}
                <div className={`flex rounded-full overflow-hidden max-w-48 ${showSessions ? 'bg-[#45a049]' : 'bg-[#4CAF50]'} transition-colors`}>
                <button
                    onClick={handleToggleSessions}
                    className={`flex-1 px-4 py-2 text-white text-sm font-medium transition-colors flex items-center justify-center min-w-0 ${showSessions ? 'bg-[#2d7a32]' : 'hover:bg-[#45a049]'}`}
                    title="View sessions"
                  >
                    <span className="truncate">Session {currentSessionName}</span>
                  </button>
                  <div className="w-px bg-blue-300"></div>
                  <button
                    onClick={async () => {
                      try {
                        const token = await (user as any)?.getIdToken?.();
                        if (!token) return;
                        const name = window.prompt('New session name');
                        if (!name) return;
                        const resp = await fetch('/api/generation-sessions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ name })
                        });
                        if (resp.ok) {
                          const data = await resp.json();
                          setSessions(prev => [{ id: data.sessionId, ...data.session }, ...prev]);
                          setSelectedSession(data.sessionId);
                          loadSessionSettings(data.sessionId);
                          if (!showSessions) setShowSessions(true);
                        }
                      } catch {}
                    }}
                    className={`flex items-center justify-center w-12 py-2 text-white transition-colors ${showSessions ? 'hover:bg-[#2d7a32]' : 'hover:bg-[#45a049]'}`}
                    title="Create new session"
                  >
                    <Plus className="h-4 w-4" />
                </button>
                </div>

                {/* Prompts Pill */}
                <div className={`flex rounded-full overflow-hidden max-w-48 ${showPrompts ? 'bg-[#45a049]' : 'bg-[#4CAF50]'} transition-colors`}>
                  <button
                    onClick={handleTogglePrompts}
                    className={`flex-1 px-4 py-2 text-white text-sm font-medium transition-colors flex items-center justify-center min-w-0 ${showPrompts ? 'bg-[#2d7a32]' : 'hover:bg-[#45a049]'}`}
                    title="View prompts"
                  >
                    <span className="truncate">Prompts</span>
                  </button>
                  <div className="w-px bg-blue-300"></div>
                  <button
                    onClick={() => {
                      const name = window.prompt('Enter prompt name:');
                      if (!name || !prompt.trim()) return;
                      savePrompt(name, prompt);
                    }}
                    className={`flex items-center justify-center w-12 py-2 text-white transition-colors ${showPrompts ? 'hover:bg-[#2d7a32]' : 'hover:bg-[#45a049]'}`}
                    title="Save current prompt"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Content - Scrollable (Model Settings) */}
              <div className="flex-1 overflow-y-auto p-4">
                {showSessions ? (
                  <div className="space-y-3">
                    {sessionsLoading ? (
                      <div className="text-sm text-gray-500">Loading sessions…</div>
                    ) : sessions.length === 0 ? (
                      <div className="text-sm text-gray-500">No sessions yet. Generate an image to create the Default session.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {sessions.map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => { 
                              setSelectedSession(s.id); 
                              loadSessionImages(s.id);
                              loadSessionSettings(s.id);
                            }}
                            className={`text-left border rounded p-3 hover:bg-gray-50 ${selectedSession===s.id ? 'ring-2 ring-[#4CAF50]' : ''}`}
                          >
                            <div className="text-sm font-medium text-gray-900">{s.name || 'Session'}</div>
                            <div className="text-xs text-gray-500">Images: {typeof s.imageCount === 'number' ? s.imageCount : '—'}</div>
                            <div className="text-xs text-gray-400">Updated: {s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : '—'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : showPrompts ? (
                  chatMode ? (
                    // Chat Interface
                    <div className="flex flex-col h-full">
                      {/* System Prompt Selector */}
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">System Prompt:</label>
                          <button
                            onClick={() => setShowSystemPromptDropdown(!showSystemPromptDropdown)}
                            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                            data-system-prompt-dropdown
                          >
                            {selectedSystemPrompt ? systemPrompts.find(p => p.id === selectedSystemPrompt)?.name || 'Select Prompt' : 'Select Prompt'}
                          </button>
                        </div>
                        {showSystemPromptDropdown && (
                          <div className="border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto" data-system-prompt-dropdown>
                            <div className="p-2">
                              <button
                                onClick={() => {
                                  setSelectedSystemPrompt('');
                                  setShowSystemPromptDropdown(false);
                                }}
                                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${!selectedSystemPrompt ? 'bg-blue-100 text-blue-700' : ''}`}
                              >
                                Default Assistant
                              </button>
                              {systemPrompts.map((prompt) => (
                                <div key={prompt.id} className="flex items-start justify-between gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedSystemPrompt(prompt.id);
                                      setShowSystemPromptDropdown(false);
                                    }}
                                    className={`flex-1 text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${selectedSystemPrompt === prompt.id ? 'bg-blue-100 text-blue-700' : ''}`}
                                  >
                                    <div className="font-medium">{prompt.name}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2">{prompt.text}</div>
                                  </button>
                                  <button
                                    onClick={() => deleteSystemPrompt(prompt.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title="Delete system prompt"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                  </div>
                )}
              </div>

                      <div ref={chatMessagesRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md ${message.role === 'user' ? '' : 'w-full'}`}>
                              <div
                                className={`px-3 py-2 rounded-lg text-sm ${
                                  message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-900'
                                }`}
                              >
                                {message.content}
                      </div>
                              {message.role === 'assistant' && (
                                <div className="flex gap-2 mt-2">
                        <button
                                    onClick={() => saveAIResponseAsPrompt(message.content, 'image')}
                                    className="px-2 py-1 text-xs bg-[#4CAF50] text-white rounded hover:bg-[#45a049] transition-colors"
                                  >
                                    Save as Image Prompt
                                  </button>
                                  <button
                                    onClick={() => saveAIResponseAsPrompt(message.content, 'system')}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Save as System Prompt
                        </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    ) : (
                    // Prompts List
                    <div className="space-y-3">
                      {promptsLoading ? (
                        <div className="text-sm text-gray-500">Loading prompts…</div>
                      ) : savedPrompts.length === 0 ? (
                        <div className="text-sm text-gray-500">No saved prompts yet. Enter a prompt and click the + button to save.</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {savedPrompts.map((p: any) => (
                            <div
                              key={p.id}
                              className="border rounded p-3 hover:bg-gray-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => loadPrompt(p.text)}
                                  className="flex-1 text-left"
                                >
                                  <div className="text-sm font-medium text-gray-900 mb-1">{p.name}</div>
                                  <div className="text-xs text-gray-600 line-clamp-2">{p.text}</div>
                                </button>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      const newName = window.prompt('Edit prompt name:', p.name);
                                      if (newName && newName !== p.name) {
                                        const updated = savedPrompts.map(pr => 
                                          pr.id === p.id ? { ...pr, name: newName } : pr
                                        );
                                        setSavedPrompts(updated);
                                        localStorage.setItem('savedPrompts', JSON.stringify(updated));
                                      }
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Edit name"
                                  >
                                    <Settings className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => editPrompt(p.id, p.text)}
                                    className="p-1 text-gray-400 hover:text-blue-600"
                                    title="Edit text"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => deletePrompt(p.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                    title="Delete prompt"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : selectedModel && availableModels.find(m => m.id === selectedModel)?.schema?.input?.properties ? (
                  <div className="space-y-4">
                    {/* Save Settings Button */}
                    {settingsChanged && selectedSession && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-blue-700">Settings have been changed</p>
                          <button
                            onClick={saveSessionSettings}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Save Settings
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="sticky top-0 bg-white py-2 z-10">
                      <button
                        onClick={() => setModelSettingsExpanded(!modelSettingsExpanded)}
                        className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <h3 className="text-sm font-semibold text-gray-900">Model Settings</h3>
                        <ChevronDown 
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            modelSettingsExpanded ? 'rotate-0' : '-rotate-90'
                          }`} 
                        />
                      </button>
                    </div>
                    
                    {modelSettingsExpanded && (
                      <>
                        {/* Checkpoint Selection */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Checkpoint
                          </label>
                      <select
                            value={ckptName}
                        onChange={(e) => {
                              setCkptName(e.target.value);
                              setSettingsChanged(true);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                      >
                            {checkpointOptions.map((n) => (
                              <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                        </div>

                        {/* Size Preset Buttons */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <button
                            onClick={() => {
                              handleInputChange('width', 1024);
                              handleInputChange('height', 1024);
                            }}
                            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                          >
                            Square 1024
                          </button>
                          <button
                            onClick={() => {
                              handleInputChange('width', 896);
                              handleInputChange('height', 1152);
                            }}
                            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                          >
                            Portrait 896x1152
                          </button>
                          <button
                            onClick={() => {
                              handleInputChange('width', 1152);
                              handleInputChange('height', 896);
                            }}
                            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                          >
                            Landscape 1152x896
                          </button>
                          <button
                            onClick={() => {
                              handleInputChange('width', 1344);
                              handleInputChange('height', 768);
                            }}
                            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                          >
                            XL 1344x768
                          </button>
                        </div>
                        
                        {/* 2x2 Grid for width, height, steps, seed */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                      {['width', 'height', 'steps', 'seed'].map((key) => {
                        const schema = availableModels.find(m => m.id === selectedModel)!.schema!.input!.properties[key];
                        if (!schema) return null;
                        
                        const inputValue = modelInputs[key] ?? schema.default ?? '';
                        
                        // Special handling for seed field with dice button
                        if (key === 'seed') {
                          return (
                            <div key={key}>
                              <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                                {schema.title || key.replace(/_/g, ' ')}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  id={key}
                                  value={inputValue}
                                  onChange={(e) => handleInputChange(key, schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                                  min={schema.minimum}
                                  max={schema.maximum}
                                  step={schema.type === 'integer' ? 1 : 0.1}
                                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={handleDiceClick}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Generate random seed"
                                >
                                  <Dice6 className="h-4 w-4 text-gray-600" />
                                </button>
                              </div>
                              {schema.description && (
                                <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                              )}
                              <div className="flex items-center mt-2">
                                <input
                                  type="checkbox"
                                  id="useRandomSeed"
                                  checked={useRandomSeed}
                                  onChange={(e) => setUseRandomSeed(e.target.checked)}
                                  className="w-4 h-4 text-[#4CAF50] border-gray-300 rounded focus:ring-[#4CAF50]"
                                />
                                <label htmlFor="useRandomSeed" className="ml-2 text-xs text-gray-600">
                                  Generate new random seed on each generation
                                </label>
                  </div>
                            </div>
                          );
                        }
                        
                        // Regular input fields for other properties
                        return (
                          <div key={key}>
                            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                              {schema.title || key.replace(/_/g, ' ')}
                            </label>
                            <input
                              type="number"
                              id={key}
                              value={inputValue}
                              onChange={(e) => handleInputChange(key, schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                              min={schema.minimum}
                              max={schema.maximum}
                              step={schema.type === 'integer' ? 1 : 0.1}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent text-sm"
                            />
                            {schema.description && (
                              <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                        {/* Other schema inputs (excluding the 4 grid fields) */}
                        {Object.entries(availableModels.find(m => m.id === selectedModel)!.schema!.input!.properties)
                          .filter(([key]) => !['width', 'height', 'steps', 'seed'].includes(key))
                          .map(([key, schema]) => renderSchemaInput(key, schema))}
                      </>
                    )}
                    
                    {/* Multiple LoRA Controls */}
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <button
                        onClick={() => setLoraSettingsExpanded(!loraSettingsExpanded)}
                        className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <h3 className="text-sm font-semibold text-gray-900">LoRA Settings</h3>
                        <ChevronDown 
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            loraSettingsExpanded ? 'rotate-0' : '-rotate-90'
                          }`} 
                        />
                      </button>

                      {loraSettingsExpanded && (
                        <>
                          <div className="flex justify-end mb-4">
                            <button
                              type="button"
                              onClick={addLora}
                              className="px-3 py-1 text-xs bg-[#4CAF50] text-white rounded hover:bg-[#45a049]"
                            >
                              + Add LoRA
                            </button>
                          </div>

                      {loras.map((lora, index) => (
                        <div key={lora.id} className="border rounded-lg p-3 bg-gray-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={lora.enabled}
                                onChange={(e) => updateLora(lora.id, { enabled: e.target.checked })}
                                className="h-4 w-4 text-[#4CAF50] border-gray-300 rounded focus:ring-[#4CAF50]"
                              />
                              <label className="text-xs font-medium text-gray-700">
                                LoRA {index + 1}
                              </label>
                            </div>
                            {loras.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLora(lora.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
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
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                              disabled={!lora.enabled}
                            >
                              {loraOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
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
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
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
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                                disabled={!lora.enabled}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                          {enabledLoras.length === 0 && (
                            <div className="text-xs text-gray-500 text-center py-2">
                              No LoRAs enabled. Click "Add LoRA" and enable to include LoRA effects.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-sm text-gray-500">Select a model to view settings</p>
                  </div>
                )}
              </div>

              {/* Prompts Footer - Generate Prompt button when in prompts mode but not chat mode */}
              {showPrompts && !chatMode && (
                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
                  <button
                    onClick={startChatMode}
                    className="w-full px-4 py-3 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45a049] transition-colors font-medium"
                  >
                    Generate Prompt
                  </button>
                </div>
              )}

              {/* Drawer Footer - Fixed (Model Selection, Prompt, Generate) */}
              {((!showSessions && !showPrompts) || (showPrompts && chatMode)) && (
              <div className="flex-shrink-0 border-t border-gray-200 bg-white">
                <div className="p-4 space-y-3">
                  {/* Prompt Composer / Chat Input */}
                  <div className="border border-gray-300 rounded-xl overflow-hidden">
                    <textarea
                      id="prompt"
                      name="prompt"
                      rows={3}
                      className="w-full px-3 py-3 text-sm focus:outline-none resize-none"
                      placeholder={chatMode ? "Ask about your prompt..." : "Type a message..."}
                      value={prompt}
                      onChange={(e) => handlePromptChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (chatMode) {
                            sendChatMessage(prompt);
                            setPrompt('');
                          } else {
                            handleGenerateImage();
                          }
                        }
                      }}
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <div className="flex items-center gap-2">
                        {!chatMode && (
                          <div className="flex items-center gap-2">
                            <label htmlFor="batchCount" className="text-xs text-gray-600 whitespace-nowrap">
                              Images:
                            </label>
                            <input
                              type="number"
                              id="batchCount"
                              min="1"
                              max="10"
                              value={batchCount}
                              onChange={(e) => setBatchCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                              className="w-12 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                    />
                  </div>
                        )}
                        {chatMode && (
                          <>
                  <button
                              onClick={exitChatMode}
                              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                            >
                              ← Back to Prompts
                            </button>
                            <button
                              onClick={() => {
                                const name = window.prompt('Enter system prompt name:');
                                if (!name || !prompt.trim()) return;
                                saveSystemPrompt(name, prompt);
                              }}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Update System Prompt
                            </button>
                          </>
                        )}
                        {chatMode && prompt.trim() && (
                          <button
                            onClick={saveCurrentPromptFromChat}
                            className="px-3 py-1 text-xs bg-[#4CAF50] text-white rounded hover:bg-[#45a049] transition-colors"
                          >
                            Save Prompt
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!chatMode && (
                          <>
                            <button type="button" className="p-2 rounded-full border hover:bg-gray-50" title="Add">
                              <Plus className="h-4 w-4" />
                            </button>
                            <button type="button" className="p-2 rounded-full border hover:bg-gray-50" title="Voice">
                              <Mic className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelPrompt}
                              disabled={cancelingPrompt}
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              aria-label="Cancel running ComfyUI prompt"
                            >
                              {cancelingPrompt ? 'Cancelling…' : 'Cancel Comfy prompt'}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={chatMode ? () => { sendChatMessage(prompt); setPrompt(''); } : (generating ? handleStopGeneration : handleGenerateImage)}
                          disabled={generating ? false : (!prompt.trim() || (!chatMode && !selectedModel))}
                          className="p-2 rounded-full border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={chatMode ? "Send" : (generating ? "Stop" : "Send")}
                        >
                          {generating ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                    )}
                  </button>
                      </div>
                    </div>
                  </div>


                  {/* Error Display */}
                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                      {error}
                    </div>
                  )}
                  {cancelFeedback && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                      {cancelFeedback}
                    </div>
                  )}
                </div>
              </div>
              )}
                </>
              )}
            </aside>

            {!drawerOpen && (
              <button
                type="button"
                onClick={handleToggleDrawer}
                className="fixed left-20 top-1/2 -translate-y-1/2 bg-[#4CAF50] text-white p-3 rounded-r-lg shadow-lg hover:bg-[#45a049] transition-all duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
                aria-label="Open drawer"
                tabIndex={0}
              >
                <Sparkles className="h-5 w-5" />
              </button>
            )}
          </>
        }
      >
        <div className="max-w-7xl mx-auto">
              {generatedImages.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Your generated content will appear here.</p>
                  <p className="text-sm text-gray-500 mt-2">Enter a prompt and click "Generate Image" to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImages.map((imageData, index) => {
                    const imageUrl = imageData.downloadUrl || imageData.signedUrl || '';
                    return (
                    <div
                        key={imageData.id || index}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
                    >
                        <div className="relative aspect-square cursor-pointer" onClick={() => openLightbox(index)}>
                        <img
                          src={imageUrl}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-full object-cover"
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
                              <div className="text-xs mt-1 break-all px-2">{imageUrl.substring(0, 50)}...</div>
                      </div>
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2">
                              {deletingImageId === imageData.id ? (
                                // Show cancel and confirm buttons
                                <>
                                  <button
                                    onClick={cancelDelete}
                                    className="text-xs px-2 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 flex items-center justify-center w-16 h-8"
                                    title="Cancel deletion"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => confirmDelete(imageData, index)}
                                    className="text-xs px-2 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 flex items-center justify-center w-16 h-8"
                                    title="Confirm deletion"
                                  >
                                    {buttonFeedback[`delete-${imageData.id}`] || 'Confirm'}
                                  </button>
                                </>
                              ) : (
                                // Show normal buttons
                                <>
                                  {imageData.metadata?.prompt && (
                                    <button
                                      onClick={() => loadImagePrompt(imageData)}
                                      className="text-xs px-2 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 flex items-center justify-center w-16 h-8"
                                      title="Load prompt"
                                    >
                                      {buttonFeedback[`prompt-${imageData.id}`] || 'Prompt'}
                                    </button>
                                  )}
                                  {(imageData.metadata?.seed || imageData.metadata?.settings?.seed) && (
                                    <button
                                      onClick={() => loadImageSeed(imageData)}
                                      className="text-xs px-2 py-2 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 flex items-center justify-center w-16 h-8"
                                      title="Load seed"
                                    >
                                      {buttonFeedback[`seed-${imageData.id}`] || 'Seed'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => copyImageUrl(imageUrl, imageData.id)}
                                    className="text-xs px-2 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 flex items-center justify-center w-16 h-8"
                                    title="Copy URL"
                                  >
                                    {buttonFeedback[`copy-${imageData.id}`] || 'URL'}
                                  </button>
                                  {imageData.path && (
                                    <button
                                      onClick={async () => {
                                        const buttonKey = `rotate-${imageData.id}`;
                                        setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Rotating...' }));
                                        try {
                                          const token = await (user as any)?.getIdToken?.();
                                          if (!token) return;
                                          const resp = await fetch('/api/rotate-image-token', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ path: imageData.path })
                                          });
                                          if (resp.ok) {
                                            const data = await resp.json();
                                            const newUrl = data?.downloadUrl;
                                            if (newUrl) {
                                              setGeneratedImages(prev => prev.map((img, i) => i === index ? { ...img, downloadUrl: newUrl } : img));
                                              setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Rotated!' }));
                                            }
                                          }
                                        } catch {
                                          setButtonFeedback(prev => ({ ...prev, [buttonKey]: 'Failed!' }));
                                        }
                                        setTimeout(() => {
                                          setButtonFeedback(prev => {
                                            const newState = { ...prev };
                                            delete newState[buttonKey];
                                            return newState;
                                          });
                                        }, 1500);
                                      }}
                                      className="text-xs px-2 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 flex items-center justify-center w-16 h-8"
                                      title="Rotate token"
                                    >
                                      {buttonFeedback[`rotate-${imageData.id}`] || 'Rotate'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => initiateDelete(imageData)}
                                    className="text-xs p-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 flex items-center justify-center w-8 h-8"
                                    title="Delete image"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                      </div>
                    </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>
        {lightboxOpen && generatedImages.length > 0 && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white text-2xl"
              aria-label="Close"
            >
              ×
            </button>
            <button
              type="button"
              onClick={showPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-2xl"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl"
              aria-label="Next"
            >
              ›
            </button>
            <img
              src={generatedImages[lightboxIndex]?.downloadUrl || generatedImages[lightboxIndex]?.signedUrl || ''}
              alt="Full size"
              className="max-w-[95vw] max-h-[90vh] object-contain"
            />
          </div>
        )}

        <footer className="mt-6 border-t border-gray-200 bg-white rounded-lg overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-3 text-xs text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>© 2025 TotalToons34. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-gray-900">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-gray-900">
                Contact Us
              </Link>
            </div>
          </div>
        </footer>
      </AdminShell>
    </ProtectedRoute>
  );
};

export default GeneratePage;

