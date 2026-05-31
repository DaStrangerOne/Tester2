import AsyncStorage from '@react-native-async-storage/async-storage';

export type AttackSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AttackType = 'zero-day' | 'known-cve' | 'technique' | 'misconfiguration' | 'custom';
export type AttackStatus = 'discovered' | 'confirmed' | 'exploited' | 'patched' | 'mitigated';

export interface SavedAttack {
  id: string;
  title: string;
  type: AttackType;
  severity: AttackSeverity;
  status: AttackStatus;
  cve?: string;
  mitreId?: string;
  target?: string;
  description: string;
  notes: string;
  proofOfConcept?: string;
  discoveredAt: Date;
  updatedAt: Date;
  tags: string[];
  cvssScore?: number;
}

const ATTACKS_KEY = 'axiom_attacks';

export async function loadAttacks(): Promise<SavedAttack[]> {
  try {
    const raw = await AsyncStorage.getItem(ATTACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((a: any) => ({
      ...a,
      discoveredAt: new Date(a.discoveredAt),
      updatedAt: new Date(a.updatedAt),
    }));
  } catch {
    return [];
  }
}

export async function saveAttack(attack: SavedAttack): Promise<SavedAttack[]> {
  const all = await loadAttacks();
  const idx = all.findIndex(a => a.id === attack.id);
  let updated: SavedAttack[];
  if (idx >= 0) {
    updated = [...all];
    updated[idx] = attack;
  } else {
    updated = [attack, ...all];
  }
  await AsyncStorage.setItem(ATTACKS_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteAttack(id: string): Promise<SavedAttack[]> {
  const all = await loadAttacks();
  const updated = all.filter(a => a.id !== id);
  await AsyncStorage.setItem(ATTACKS_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearAttacks(): Promise<void> {
  await AsyncStorage.removeItem(ATTACKS_KEY);
}

export function createAttack(overrides?: Partial<SavedAttack>): SavedAttack {
  return {
    id: `attack-${Date.now()}`,
    title: '',
    type: 'known-cve',
    severity: 'medium',
    status: 'discovered',
    description: '',
    notes: '',
    tags: [],
    discoveredAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
