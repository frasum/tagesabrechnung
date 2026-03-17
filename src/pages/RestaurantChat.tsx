import { useState, useRef, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageCircle, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/hooks/useRestaurant';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useVoiceChat } from '@/hooks/useVoiceChat';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Wie läuft es gerade? Gibt es Auffälligkeiten?',
  'Vergleiche Spicery und YUM diesen Monat',
  'Wie hoch war der Kreditkartenanteil am Umsatz letzte Woche?',
  'Wer hat den höchsten Umsatz pro Stunde diesen Monat?',
  'Wie viel Umsatz hatten wir diese Woche?',
  'Wer hat diesen Monat das meiste Trinkgeld bekommen?',
  'Wie viele Gäste hatten wir letzte Woche?',
  'Wie verhält sich der Umsatz zu den Schichtstunden pro Kellner?',
  'Vergleiche den Umsatz der letzten 3 Monate pro Restaurant',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/restaurant-chat`;

export default function RestaurantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: restaurants = [] } = useRestaurants();
  const { toast } = useToast();
  const { isRecording, isTranscribing, playingIndex, startRecording, stopRecording, playTTS } = useVoiceChat();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Loading timer
  useEffect(() => {
    if (!isLoading) { setLoadingSeconds(0); return; }
    const interval = setInterval(() => setLoadingSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

    try {
      const restaurantIds = restaurants.map(r => r.id);
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          restaurant_ids: restaurantIds,
          caller_staff_id: user?.staffId,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errData.error || `Fehler ${resp.status}`);
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await resp.json().catch(() => null);
        const content = data?.content;
        if (content && typeof content === 'string') {
          upsertAssistant(content);
        } else {
          throw new Error('Keine Antwort erhalten');
        }
        return;
      }

      if (!resp.body) throw new Error('Kein Stream verfügbar');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.error('Chat timeout after 120s');
        toast({
          title: 'Zeitüberschreitung',
          description: 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.',
          variant: 'destructive',
        });
      } else {
        console.error('Chat error:', e);
        toast({
          title: 'Chat-Fehler',
          description: e.message || 'Verbindung fehlgeschlagen',
          variant: 'destructive',
        });
      }
      if (!assistantSoFar) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript) {
        sendMessage(transcript);
      }
    } else {
      startRecording();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 py-4 px-2 border-b">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Restaurant Assistent</h1>
            <p className="text-sm text-muted-foreground">Frage mich alles über deine Restaurants</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Wie kann ich helfen?</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Ich habe Zugriff auf die Daten der letzten 90 Tage. Stelle mir eine Frage oder wähle einen Vorschlag.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.role === 'assistant' ? (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_td]:px-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => playTTS(msg.content, i)}
                      disabled={isLoading}
                    >
                      {playingIndex === i ? (
                        <><VolumeX className="w-3.5 h-3.5 mr-1" /> Stopp</>
                      ) : (
                        <><Volume2 className="w-3.5 h-3.5 mr-1" /> Vorlesen</>
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {loadingSeconds < 5
                    ? 'Daten laden…'
                    : loadingSeconds < 15
                    ? 'Daten analysieren…'
                    : `Antwort wird erstellt… (${loadingSeconds}s)`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTIONS.map(s => (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                >
                  {s}
                </Button>
              ))}
            </div>
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isTranscribing ? 'Transkribiere...' : isRecording ? 'Aufnahme läuft...' : 'Stelle eine Frage...'}
              disabled={isLoading || isRecording || isTranscribing}
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant={isRecording ? 'destructive' : 'outline'}
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
              title={isRecording ? 'Aufnahme beenden' : 'Spracheingabe'}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isRecording}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
