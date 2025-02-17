import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Mic, Copy, X, Play } from 'lucide-react';

// Utility: Convert a Blob to a base64-encoded string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Utility: Convert a base64-encoded string to a Blob
const base64ToBlob = (base64: string, contentType: string): Blob => {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const VoiceChatPage = () => {
  const router = useRouter();
  const { character } = router.query;

  // States for recording, processing, playing, errors, and API responses
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMessageText, setVoiceMessageText] = useState<string>('');
  const [visualContextText, setVisualContextText] = useState<string>('');
  const [audioResponseUrl, setAudioResponseUrl] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const buttonHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Debug logger
  const addDebugLog = useCallback((message: string) => {
    setDebugLogs((prev) => [...prev, `${new Date().toISOString()} - ${message}`]);
  }, []);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (processing || playing) return;
    setError(null);
    addDebugLog('Starting recording...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 44100 },
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      addDebugLog(`Using mime type: ${mimeType}`);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          addDebugLog(`Received audio chunk: ${event.data.size} bytes`);
        }
      };
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          addDebugLog(`Recording complete: ${audioBlob.size} bytes`);
          await sendAudio(audioBlob);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
      mediaRecorder.start(100);
      setRecording(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Recording error: ${errorMessage}`);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [processing, playing, addDebugLog]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      addDebugLog('Recording stopped');
    }
  }, [addDebugLog]);

  // Play the returned audio response
  const playAudio = useCallback(
    async (audioUrl: string) => {
      addDebugLog(`Attempting to play audio from URL: ${audioUrl.substring(0, 50)}...`);
      try {
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
          addDebugLog('Created new audio element');
        }
        const audio = audioElementRef.current;
        audio.addEventListener('error', (e) => {
          const errorEl = e.target as HTMLAudioElement;
          addDebugLog(`Audio error: ${errorEl.error?.message || 'Unknown error'}`);
          setError('Failed to play audio');
          setPlaying(false);
        });
        audio.addEventListener('ended', () => {
          addDebugLog('Audio playback ended');
          setPlaying(false);
        });
        audio.addEventListener('loadstart', () => addDebugLog('Audio loading started'));
        audio.addEventListener('loadedmetadata', () => addDebugLog('Audio metadata loaded'));
        audio.addEventListener('canplay', () => addDebugLog('Audio can play'));
        audio.addEventListener('play', () => addDebugLog('Audio playback started'));
        audio.src = audioUrl;
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        setPlaying(true);
        await audio.play();
        addDebugLog('Audio playback initiated');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addDebugLog(`Playback error: ${errorMessage}`);
        setError('Failed to play audio. Please try again.');
        setPlaying(false);
      }
    },
    [addDebugLog]
  );

  // Send the recorded audio blob to the API
  const sendAudio = async (blob: Blob) => {
    addDebugLog(`Sending audio blob: ${blob.size} bytes, type: ${blob.type}`);
    setProcessing(true);
    setError(null);
    try {
      const base64Audio = await blobToBase64(blob);
      addDebugLog('Converted blob to base64');
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          character,
          history: [],
        }),
      });
      addDebugLog(`API response status: ${res.status}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to process audio');
      }
      const data = await res.json();
      addDebugLog('Received API response with audio data');
      setVoiceMessageText(data.ttsText || '');
      setVisualContextText(data.visualContext || '');
      const mimeType = data.contentType || 'audio/mpeg';
      const audioBlobResponse = base64ToBlob(data.audio, mimeType);
      addDebugLog(`Created audio blob: ${audioBlobResponse.size} bytes, type: ${mimeType}`);
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      addDebugLog(`Created audio URL: ${audioUrl}`);
      setAudioResponseUrl(audioUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Error in sendAudio: ${errorMessage}`);
      setError(errorMessage);
      setPlaying(false);
    } finally {
      setProcessing(false);
    }
  };

  // Unified press handler: if no response exists, record; if a response exists, tap to play or hold (2s) to record again.
  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!audioResponseUrl) {
        startRecording();
      } else {
        longPressTriggeredRef.current = false;
        buttonHoldTimerRef.current = setTimeout(() => {
          buttonHoldTimerRef.current = null;
          longPressTriggeredRef.current = true;
          addDebugLog('Long press detected – switching to recording mode');
          setAudioResponseUrl(null);
          startRecording();
        }, 2000);
      }
    },
    [audioResponseUrl, startRecording, addDebugLog]
  );

  const handlePressEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!audioResponseUrl) {
        stopRecording();
      } else {
        if (buttonHoldTimerRef.current) {
          clearTimeout(buttonHoldTimerRef.current);
          buttonHoldTimerRef.current = null;
          addDebugLog('Short tap detected – playing audio response');
          playAudio(audioResponseUrl);
        } else if (longPressTriggeredRef.current) {
          if (recording) {
            stopRecording();
          }
          longPressTriggeredRef.current = false;
        }
      }
    },
    [audioResponseUrl, recording, playAudio, stopRecording]
  );

  const copyDebugLogs = useCallback(() => {
    const logText = debugLogs.join('\n');
    navigator.clipboard.writeText(logText);
    addDebugLog('Debug logs copied to clipboard');
  }, [debugLogs, addDebugLog]);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
    addDebugLog('Debug logs cleared');
  }, [addDebugLog]);

  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (buttonHoldTimerRef.current) {
        clearTimeout(buttonHoldTimerRef.current);
      }
    };
  }, []);

  // Determine the button’s appearance and instruction text based on state
  let buttonStyle =
    recording
      ? 'bg-red-500 animate-pulse scale-110'
      : processing || playing
      ? 'bg-gray-500 animate-pulse'
      : audioResponseUrl
      ? 'bg-blue-500 hover:bg-blue-600 active:scale-95'
      : 'bg-[#4CAF50] hover:bg-[#45a049] active:scale-95';

  let instructionText = audioResponseUrl
    ? 'Tap to play the response. Hold for 2 seconds to record a new message.'
    : 'Press and hold to record. Release to send your message.';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      {/* Debug Panel Toggle */}
      <button
        onClick={() => setShowDebug((prev) => !prev)}
        className="absolute top-4 right-4 px-3 py-1 bg-gray-800 rounded text-sm"
      >
        {showDebug ? 'Hide Debug' : 'Show Debug'}
      </button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 z-50 overflow-auto p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl">Debug Logs</h2>
              <div className="space-x-2">
                <button
                  onClick={copyDebugLogs}
                  className="px-3 py-1 bg-blue-600 rounded text-sm"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={clearDebugLogs}
                  className="px-3 py-1 bg-red-600 rounded text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDebug(false)}
                  className="px-3 py-1 bg-gray-600 rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg h-[60vh] overflow-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1 text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl mb-6">Voice Chat with {character}</h1>

      <div className="relative mb-4">
        <button
          id="actionButton"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          disabled={processing || playing}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-150 select-none touch-none ${buttonStyle}`}
        >
          {recording ? (
            <Mic className="w-12 h-12" />
          ) : audioResponseUrl ? (
            <Play className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </button>
        {(processing || playing) && (
          <div className="absolute inset-0 rounded-full bg-white opacity-10 animate-blob" />
        )}
      </div>

      <div className="text-center">
        {recording && (
          <p className="mb-2 text-sm text-red-400">Recording... Release to send</p>
        )}
        {processing && (
          <p className="mb-2 text-sm text-neutral-400">Processing response...</p>
        )}
        {playing && (
          <p className="mb-2 text-sm text-neutral-400">Playing response...</p>
        )}
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      </div>

      {(voiceMessageText || visualContextText) && (
        <div className="mt-4 w-full max-w-md border border-gray-700 p-4 rounded">
          {voiceMessageText && (
            <p className="text-white text-lg font-bold mb-2">
              {voiceMessageText}
            </p>
          )}
          {visualContextText && (
            <p className="text-gray-400 italic">{visualContextText}</p>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-neutral-400 text-center px-4">
        {instructionText}
      </p>
    </div>
  );
};

export default VoiceChatPage;
