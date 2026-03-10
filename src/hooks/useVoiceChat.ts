import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const STT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export function useVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({
        title: 'Mikrofon-Fehler',
        description: 'Bitte erlaube den Zugriff auf dein Mikrofon.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const resp = await fetch(STT_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'STT fehlgeschlagen' }));
            throw new Error(err.error || `Fehler ${resp.status}`);
          }

          const { text } = await resp.json();
          resolve(text && text.trim() ? text.trim() : null);
        } catch (e: any) {
          console.error('STT error:', e);
          toast({
            title: 'Transkription fehlgeschlagen',
            description: e.message || 'Spracherkennung nicht verfügbar',
            variant: 'destructive',
          });
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.stop();
    });
  }, [toast]);

  const playTTS = useCallback(async (text: string, msgIndex: number) => {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      if (playingIndex === msgIndex) {
        setPlayingIndex(null);
        return; // Toggle off
      }
    }

    setPlayingIndex(msgIndex);

    try {
      // Strip markdown for cleaner speech
      const cleanText = text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[|`]/g, '')
        .replace(/-{3,}/g, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .trim();

      const resp = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!resp.ok) {
        throw new Error(`TTS Fehler ${resp.status}`);
      }

      const audioBlob = await resp.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingIndex(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (e: any) {
      console.error('TTS error:', e);
      toast({
        title: 'Sprachausgabe fehlgeschlagen',
        description: e.message || 'Audio konnte nicht abgespielt werden',
        variant: 'destructive',
      });
      setPlayingIndex(null);
    }
  }, [playingIndex, toast]);

  return {
    isRecording,
    isTranscribing,
    playingIndex,
    startRecording,
    stopRecording,
    playTTS,
  };
}
