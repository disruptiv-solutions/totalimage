import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Mic, Play } from 'lucide-react';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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
  const backgroundImage = character === 'Lois' ? '/loischat.png' : '/leelachat.png';

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMessageText, setVoiceMessageText] = useState<string>('');
  const [visualContextText, setVisualContextText] = useState<string>('');
  const [audioResponseUrl, setAudioResponseUrl] = useState<string | null>(null);
  const [isRecordingNew, setIsRecordingNew] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const buttonHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (processing || playing) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 44100 },
      });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearTimeout(fallbackTimerRef.current!);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          if (audioBlob.size > 0) {
            await sendAudio(audioBlob);
          } else {
            setError('No audio captured. Please try again.');
          }
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start(100);
      setRecording(true);

      fallbackTimerRef.current = setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          stopRecording();
        }
      }, 30000);
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
    }
  }, [processing, playing, stopRecording]);

  const playAudio = useCallback(async (audioUrl: string) => {
    try {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      const audio = audioElementRef.current;
      audio.onerror = () => {
        setError('Failed to play audio');
        setPlaying(false);
      };
      audio.onended = () => {
        setPlaying(false);
      };
      audio.src = audioUrl;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      setPlaying(true);
      await audio.play();
    } catch (err) {
      setError('Failed to play audio. Please try again.');
      setPlaying(false);
    }
  }, []);

  const sendAudio = async (blob: Blob) => {
    setProcessing(true);
    setError(null);
    try {
      const base64Audio = await blobToBase64(blob);
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          character,
          history: [],
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to process audio');
      }
      const data = await res.json();
      setVoiceMessageText(data.ttsText || '');
      setVisualContextText(data.visualContext || '');
      const mimeType = data.contentType || 'audio/mpeg';
      const audioBlobResponse = base64ToBlob(data.audio, mimeType);
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      setAudioResponseUrl(audioUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setPlaying(false);
    } finally {
      setProcessing(false);
    }
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (!audioResponseUrl) {
        startRecording();
      } else {
        longPressTriggeredRef.current = false;
        buttonHoldTimerRef.current = setTimeout(() => {
          buttonHoldTimerRef.current = null;
          longPressTriggeredRef.current = true;
          setAudioResponseUrl(null);
          setIsRecordingNew(true);
          startRecording();
        }, 2000);
      }
    },
    [audioResponseUrl, startRecording]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (buttonHoldTimerRef.current) {
        clearTimeout(buttonHoldTimerRef.current);
        buttonHoldTimerRef.current = null;
      }
      if (isRecordingNew || !audioResponseUrl) {
        stopRecording();
        if (isRecordingNew) setIsRecordingNew(false);
      } else {
        playAudio(audioResponseUrl!);
      }
    },
    [isRecordingNew, audioResponseUrl, stopRecording, playAudio]
  );

  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (buttonHoldTimerRef.current) {
        clearTimeout(buttonHoldTimerRef.current);
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const buttonStyle = recording
    ? 'bg-red-500 animate-pulse scale-110'
    : processing || playing
    ? 'bg-gray-500 animate-pulse'
    : audioResponseUrl
    ? 'bg-blue-500 hover:bg-blue-600 active:scale-95'
    : 'bg-[#4CAF50] hover:bg-[#45a049] active:scale-95';

  const instructionText = audioResponseUrl
    ? 'Tap to play the response. Hold for 2 seconds to record a new message.'
    : 'Press and hold to record. Release to send your message.';

  return (
    <div className="relative w-full h-[calc(100vh-8rem)]">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-white mb-12">Voice Chat with {character}</h1>

        <div className="relative mb-8">
          <button
            id="actionButton"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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

        <div className="text-center mb-4">
          {recording && <p className="text-sm text-red-400">Recording... Release to send</p>}
          {processing && <p className="text-sm text-neutral-400">Processing response...</p>}
          {playing && <p className="text-sm text-neutral-400">Playing response...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {(voiceMessageText || visualContextText) && (
          <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 p-4 rounded-xl mb-6">
            {voiceMessageText && (
              <p className="text-white text-lg font-bold mb-2">{voiceMessageText}</p>
            )}
            {visualContextText && (
              <p className="text-gray-400 italic">{visualContextText}</p>
            )}
          </div>
        )}

        <p className="text-sm text-neutral-400 text-center max-w-md px-4">
          {instructionText}
        </p>
      </div>
    </div>
  );
};

export default VoiceChatPage;