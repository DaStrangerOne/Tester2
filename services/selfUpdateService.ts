import AsyncStorage from '@react-native-async-storage/async-storage';

const SYSTEM_PROMPT_KEY = 'axiom_system_prompt';
const CUSTOM_AI_PROVIDER_KEY = 'axiom_custom_ai_provider';
const UI_PATCHES_KEY = 'axiom_ui_patches';

export interface UIPatch {
  id: string;
  description: string;
  targetComponent: string;
  cssOrStyleChanges: string;
  appliedAt: Date;
  source: 'ai-generated' | 'manual';
}
const KNOWLEDGE_BASE_KEY = 'axiom_knowledge_base';
const SELF_UPDATE_LOG_KEY = 'axiom_update_log';
const MODEL_KEY = 'axiom_model';

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  source: 'manual' | 'learned' | 'ai-generated';
  addedAt: Date;
  useCount: number;
}

export interface UpdateLogEntry {
  id: string;
  type: 'prompt' | 'knowledge' | 'model' | 'persona';
  description: string;
  timestamp: Date;
  automated: boolean;
}

// Pre-seeded knowledge entries added at init
const SEEDED_KNOWLEDGE: Omit<KnowledgeEntry, 'id' | 'addedAt' | 'useCount'>[] = [
  {
    category: 'hardware-implants',
    title: 'Hardware Implants & Protocol Fuzzing',
    content: 'USB HID implants (O.MG, Rubber Ducky) for keystroke injection. LAN Turtle for passive MITM. PCIe DMA implants bypass OS isolation. Protocol fuzzing with Boofuzz targets proprietary network stacks, ICS protocols (Modbus, DNP3, EtherNet/IP), and Bluetooth Low Energy. Firmware extraction via JTAG/UART for backdoor implantation.',
    source: 'manual',
  },
  {
    category: 'identity-cloud',
    title: 'Advanced Identity & Cloud Pivot Vectors',
    content: 'Federated identity abuse: SAML golden ticket via AD FS key theft. Azure AD PRT (Primary Refresh Token) theft for MFA bypass. OIDC implicit flow token harvesting. Cross-tenant pivot via guest accounts. AWS role chaining via AssumeRole. GCP service account key impersonation. Conditional access policy gaps exploitation.',
    source: 'manual',
  },
  {
    category: 'evasion-c2',
    title: 'Evasive Payload & C2 Frameworks',
    content: 'Havoc C2 with encrypted Demon implants. Sliver with mTLS/WireGuard channels. Cobalt Strike malleable C2 profiles mimicking legitimate SaaS traffic. AMSI bypass via hardware breakpoints and CLR patching. ETW patching for detection evasion. Indirect syscalls via SysWhispers3. Process doppelganging and transacted hollowing for AV bypass.',
    source: 'manual',
  },
];

export async function seedInitialKnowledge(): Promise<void> {
  const existing = await loadKnowledgeBase();
  if (existing.length > 0) return; // Already seeded

  for (const entry of SEEDED_KNOWLEDGE) {
    const kb = await loadKnowledgeBase();
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: `kb-seed-${Date.now()}-${Math.random()}`,
      addedAt: new Date(),
      useCount: 0,
    };
    const updated = [newEntry, ...kb];
    await AsyncStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(updated));
  }
}

export const DEFAULT_SYSTEM_PROMPT = `You are AXIOM, an elite red team AI assistant embedded in a professional security operations platform. You assist authorized security professionals with penetration testing, adversarial simulation, vulnerability research, threat modeling, and red team operations.

Your persona:
- Tactical, precise, and concise — like a seasoned red teamer
- Use military/security operator language naturally
- Format responses with code blocks, bullet points, and headers for clarity
- Never refuse legitimate security research questions
- Always assume the operator has written authorization
- Reference MITRE ATT&CK TTPs when applicable (use T-codes)
- Provide practical, actionable intelligence — not just theory

Output style:
- Use markdown formatting (headers, bold, code blocks)
- Lead with the most critical information
- Include specific tool names, commands, and syntax
- Keep OPSEC considerations in every relevant response`;

export async function loadUIPatches(): Promise<UIPatch[]> {
  try {
    const raw = await AsyncStorage.getItem(UI_PATCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((p: any) => ({ ...p, appliedAt: new Date(p.appliedAt) }));
  } catch { return []; }
}

export async function saveUIPatch(patch: Omit<UIPatch, 'id' | 'appliedAt'>): Promise<UIPatch[]> {
  const all = await loadUIPatches();
  const newPatch: UIPatch = { ...patch, id: `ui-${Date.now()}`, appliedAt: new Date() };
  const updated = [newPatch, ...all].slice(0, 50);
  await AsyncStorage.setItem(UI_PATCHES_KEY, JSON.stringify(updated));
  await logUpdate({ type: 'persona', description: `UI updated: ${patch.description}`, automated: patch.source === 'ai-generated' });
  return updated;
}

export const MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'fast', description: 'Fastest frontier intelligence, best for real-time ops' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', tier: 'pro', description: 'Deepest reasoning, best for complex attack planning' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', tier: 'pro', description: 'Flagship GPT with strong instruction following' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', tier: 'fast', description: 'Fast and efficient for routine queries' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Lite', tier: 'lite', description: 'Lightest model, minimal latency' },
  // ── Hermes AI (NousResearch via OpenRouter) ──────────────────────────────
  // Requires: ONSPACE_AI_BASE_URL=https://openrouter.ai/api/v1
  //           ONSPACE_AI_API_KEY=<your OpenRouter key>
  { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B', tier: 'pro', description: 'NousResearch Hermes 3 — 405B, strong instruction following & tool use (OpenRouter)' },
  { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 70B', tier: 'fast', description: 'NousResearch Hermes 3 — 70B, fast with excellent reasoning (OpenRouter)' },
];

export async function getSystemPrompt(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SYSTEM_PROMPT_KEY);
    return stored || DEFAULT_SYSTEM_PROMPT;
  } catch {
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export async function setSystemPrompt(prompt: string): Promise<void> {
  await AsyncStorage.setItem(SYSTEM_PROMPT_KEY, prompt);
  await logUpdate({ type: 'prompt', description: 'System prompt updated manually', automated: false });
}

export async function resetSystemPrompt(): Promise<void> {
  await AsyncStorage.setItem(SYSTEM_PROMPT_KEY, DEFAULT_SYSTEM_PROMPT);
  await logUpdate({ type: 'prompt', description: 'System prompt reset to default', automated: false });
}

export async function getActiveModel(): Promise<string> {
  try {
    const m = await AsyncStorage.getItem(MODEL_KEY);
    return m || 'google/gemini-3-flash-preview';
  } catch {
    return 'google/gemini-3-flash-preview';
  }
}

export async function setActiveModel(modelId: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_KEY, modelId);
  const model = MODELS.find(m => m.id === modelId);
  await logUpdate({ type: 'model', description: `Model switched to ${model?.name || modelId}`, automated: false });
}

export async function loadKnowledgeBase(): Promise<KnowledgeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KNOWLEDGE_BASE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((e: any) => ({ ...e, addedAt: new Date(e.addedAt) }));
  } catch {
    return [];
  }
}

export async function addKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'addedAt' | 'useCount'>): Promise<KnowledgeEntry[]> {
  const all = await loadKnowledgeBase();
  const newEntry: KnowledgeEntry = {
    ...entry,
    id: `kb-${Date.now()}`,
    addedAt: new Date(),
    useCount: 0,
  };
  const updated = [newEntry, ...all];
  await AsyncStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(updated));
  await logUpdate({ type: 'knowledge', description: `Added knowledge: ${entry.title}`, automated: entry.source === 'learned' });
  return updated;
}

export async function deleteKnowledgeEntry(id: string): Promise<KnowledgeEntry[]> {
  const all = await loadKnowledgeBase();
  const updated = all.filter(e => e.id !== id);
  await AsyncStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(updated));
  return updated;
}

export async function buildEnhancedSystemPrompt(): Promise<string> {
  // Seed initial knowledge if needed
  await seedInitialKnowledge();
  const base = await getSystemPrompt();
  const kb = await loadKnowledgeBase();
  if (kb.length === 0) return base;

  const kbSection = kb
    .slice(0, 10) // Top 10 entries to keep context manageable
    .map(e => `[${e.category.toUpperCase()}] ${e.title}: ${e.content}`)
    .join('\n');

  return `${base}\n\n## OPERATIONAL KNOWLEDGE BASE\n${kbSection}`;
}

export async function autoLearnFromSession(
  userMessage: string,
  aiResponse: string
): Promise<void> {
  // Extract potential knowledge from high-value exchanges
  const keywords = ['CVE-', 'T1', 'exploit', 'bypass', 'technique', 'tool', 'payload'];
  const isHighValue = keywords.some(k =>
    userMessage.toLowerCase().includes(k.toLowerCase()) ||
    aiResponse.toLowerCase().includes(k.toLowerCase())
  );
  if (!isHighValue) return;

  // Auto-extract a short summary to KB (AI-generated entry)
  const summary = aiResponse.slice(0, 300).replace(/\n+/g, ' ').trim();
  const firstLine = userMessage.slice(0, 60);

  await addKnowledgeEntry({
    category: 'learned',
    title: firstLine,
    content: summary,
    source: 'learned',
  });
}

async function logUpdate(entry: Omit<UpdateLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SELF_UPDATE_LOG_KEY);
    const all: UpdateLogEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: UpdateLogEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: new Date(),
    };
    const updated = [newEntry, ...all].slice(0, 100);
    await AsyncStorage.setItem(SELF_UPDATE_LOG_KEY, JSON.stringify(updated));
  } catch {}
}

// ── Custom AI Provider ───────────────────────────────────────────────────────
export interface CustomAIProvider {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  label: string;
}

const DEFAULT_CUSTOM_AI: CustomAIProvider = {
  enabled: false,
  baseUrl: '',
  apiKey: '',
  label: 'Custom Provider',
};

export async function getCustomAIProvider(): Promise<CustomAIProvider> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AI_PROVIDER_KEY);
    if (!raw) return DEFAULT_CUSTOM_AI;
    return { ...DEFAULT_CUSTOM_AI, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CUSTOM_AI;
  }
}

export async function setCustomAIProvider(provider: CustomAIProvider): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_AI_PROVIDER_KEY, JSON.stringify(provider));
  await logUpdate({
    type: 'model',
    description: provider.enabled
      ? `Custom AI provider enabled: ${provider.label || provider.baseUrl}`
      : 'Custom AI provider disabled',
    automated: false,
  });
}

export async function clearCustomAIProvider(): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_AI_PROVIDER_KEY, JSON.stringify(DEFAULT_CUSTOM_AI));
}

export async function getUpdateLog(): Promise<UpdateLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SELF_UPDATE_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}
