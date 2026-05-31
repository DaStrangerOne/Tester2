import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatSession, createSession, sendMessage, generateSessionTitle } from '@/services/aiService';
import { saveSessions, loadSessions } from '@/services/sessionStorage';
import { appendExecLog } from '@/services/executionLog';

export function useChat() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const streamingIdRef = useRef<string | null>(null);

  const messages = (session?.messages || []).filter(m => m.role !== 'system');

  // Init: load sessions and create initial session (async, supports dynamic system prompt)
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSessions(), createSession()]).then(([stored, newSess]) => {
      if (cancelled) return;
      setSessions(stored);
      setSession(newSess);
      setSessionsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Save current session whenever messages change
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!sessionsLoaded || !session) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSessions(prev => {
        const idx = prev.findIndex(s => s.id === session.id);
        let updated: ChatSession[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = session;
        } else {
          updated = [session, ...prev];
        }
        saveSessions(updated);
        return updated;
      });
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [session, sessionsLoaded]);

  const sendUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !session) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const streamingId = `assistant-${Date.now()}`;
    streamingIdRef.current = streamingId;

    const streamingMessage: Message = {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    const updatedMessages = [...session.messages, userMessage, streamingMessage];

    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: updatedMessages,
        title: prev.title === 'New Session'
          ? generateSessionTitle([...prev.messages, userMessage])
          : prev.title,
      };
    });

    setInputText('');
    setIsLoading(true);

    try {
      await sendMessage(
        [...session.messages, userMessage],
        (chunk) => {
          setSession(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map(m =>
                m.id === streamingId ? { ...m, content: chunk, isStreaming: true } : m
              ),
            };
          });
        }
      );

      // Get final content for logging
      setSession(prev => {
        if (!prev) return prev;
        const finalMsg = prev.messages.find(m => m.id === streamingId);
        if (finalMsg?.content) {
          // Log to exec log (non-blocking)
          appendExecLog({
            type: 'chat',
            command: text.trim(),
            output: finalMsg.content,
            isError: false,
            sessionId: prev.id,
            tags: ['chat', 'axiom', 'ai-response'],
          }).catch(() => {});
        }
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === streamingId ? { ...m, isStreaming: false } : m
          ),
        };
      });
    } catch (err: any) {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === streamingId
              ? { ...m, content: `⚠️ Error: ${err?.message || 'Connection failed. Retry.'}`, isStreaming: false }
              : m
          ),
        };
      });
    } finally {
      setIsLoading(false);
      streamingIdRef.current = null;
    }
  }, [session, isLoading]);

  const newSession = useCallback(async () => {
    const fresh = await createSession();
    setSession(fresh);
    setInputText('');
    setIsLoading(false);
  }, []);

  const restoreSession = useCallback((s: ChatSession) => {
    setSession(s);
    setInputText('');
    setIsLoading(false);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (session?.id === sessionId) {
      const fresh = await createSession();
      setSession(fresh);
    }
  }, [session?.id]);

  const injectPrompt = useCallback((prompt: string) => {
    setInputText(prompt);
  }, []);

  // Callback ref so terminal screen can register itself
  const terminalRunRef = useRef<((code: string, lang: string) => void) | null>(null);

  const registerTerminalRunner = useCallback((fn: (code: string, lang: string) => void) => {
    terminalRunRef.current = fn;
  }, []);

  const runInTerminal = useCallback((code: string, lang = 'bash') => {
    if (terminalRunRef.current) {
      terminalRunRef.current(code, lang);
    }
  }, []);

  return {
    messages,
    isLoading,
    inputText,
    setInputText,
    sendUserMessage,
    newSession,
    restoreSession,
    deleteSession,
    injectPrompt,
    runInTerminal,
    registerTerminalRunner,
    sessionTitle: session?.title || 'New Session',
    sessions,
    currentSessionId: session?.id || '',
  };
}
