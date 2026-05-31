import AsyncStorage from '@react-native-async-storage/async-storage';

const EXEC_LOG_KEY = 'axiom_execution_log';
const MAX_LOG_ENTRIES = 500;

export type LogEntryType = 'command' | 'analysis' | 'chat' | 'attack' | 'recon' | 'exploit';

export interface ExecLogEntry {
  id: string;
  timestamp: Date;
  type: LogEntryType;
  target?: string;
  command: string;
  language?: string;
  output: string;
  isError: boolean;
  sessionId?: string;
  tags: string[];
  durationMs?: number;
  attackId?: string;
  mitreId?: string;
}

export async function loadExecLog(): Promise<ExecLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(EXEC_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
  } catch {
    return [];
  }
}

export async function appendExecLog(
  entry: Omit<ExecLogEntry, 'id' | 'timestamp'>
): Promise<ExecLogEntry[]> {
  try {
    const all = await loadExecLog();
    const newEntry: ExecLogEntry = {
      ...entry,
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };
    const updated = [newEntry, ...all].slice(0, MAX_LOG_ENTRIES);
    await AsyncStorage.setItem(EXEC_LOG_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function deleteExecLogEntry(id: string): Promise<ExecLogEntry[]> {
  const all = await loadExecLog();
  const updated = all.filter(e => e.id !== id);
  await AsyncStorage.setItem(EXEC_LOG_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearExecLog(): Promise<void> {
  await AsyncStorage.removeItem(EXEC_LOG_KEY);
}

export async function exportExecLog(): Promise<string> {
  const all = await loadExecLog();
  const lines = all.map(e => {
    const ts = e.timestamp.toISOString();
    const header = `[${ts}] [${e.type.toUpperCase()}]${e.target ? ` TARGET: ${e.target}` : ''}${e.mitreId ? ` MITRE: ${e.mitreId}` : ''}`;
    const cmd = `$ ${e.command}`;
    const out = e.output;
    const sep = '─'.repeat(60);
    return `${sep}\n${header}\n${cmd}\n\n${out}\n`;
  });
  return `AXIOM EXECUTION LOG EXPORT\nGenerated: ${new Date().toISOString()}\nTotal Entries: ${all.length}\n\n${'═'.repeat(60)}\n\n${lines.join('\n')}`;
}

export function getLogStats(entries: ExecLogEntry[]) {
  const total = entries.length;
  const errors = entries.filter(e => e.isError).length;
  const commands = entries.filter(e => e.type === 'command').length;
  const attacks = entries.filter(e => e.type === 'attack').length;
  const analyses = entries.filter(e => e.type === 'analysis').length;
  const chats = entries.filter(e => e.type === 'chat').length;
  const targets = [...new Set(entries.filter(e => e.target).map(e => e.target!))];
  return { total, errors, commands, attacks, analyses, chats, targets };
}
