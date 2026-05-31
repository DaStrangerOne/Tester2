import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession } from './aiService';

const SESSIONS_KEY = 'axiom_sessions';
const MAX_SESSIONS = 50;

export async function saveSessions(sessions: ChatSession[]): Promise<void> {
  try {
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save sessions:', e);
  }
}

export async function loadSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Rehydrate Date objects
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      messages: s.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch (e) {
    console.warn('Failed to load sessions:', e);
    return [];
  }
}

export async function deleteSession(sessionId: string): Promise<ChatSession[]> {
  const sessions = await loadSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await saveSessions(filtered);
  return filtered;
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}
