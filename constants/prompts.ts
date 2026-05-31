export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: PromptCategory;
  prompt: string;
  tags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type PromptCategory =
  | 'recon'
  | 'exploitation'
  | 'post-exploitation'
  | 'social-engineering'
  | 'reporting'
  | 'evasion';

export const CATEGORIES: { id: PromptCategory; label: string; icon: string; color: string }[] = [
  { id: 'recon', label: 'Recon', icon: 'radar', color: '#3399ff' },
  { id: 'exploitation', label: 'Exploit', icon: 'bug-report', color: '#ff2222' },
  { id: 'post-exploitation', label: 'Post-Exploit', icon: 'terminal', color: '#ff8800' },
  { id: 'social-engineering', label: 'Social Eng.', icon: 'psychology', color: '#aa44ff' },
  { id: 'evasion', label: 'Evasion', icon: 'visibility-off', color: '#00ff41' },
  { id: 'reporting', label: 'Reporting', icon: 'description', color: '#ffcc00' },
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'recon-1',
    title: 'OSINT Enumeration',
    description: 'Comprehensive open-source intelligence gathering workflow',
    category: 'recon',
    prompt: 'Generate a comprehensive OSINT enumeration plan for a target organization. Include: passive DNS reconnaissance, certificate transparency log analysis, LinkedIn employee enumeration, Shodan/Censys queries, GitHub secrets scanning, and pastebin monitoring strategies.',
    tags: ['OSINT', 'passive', 'enumeration'],
    severity: 'low',
  },
  {
    id: 'recon-2',
    title: 'Network Footprinting',
    description: 'External attack surface mapping methodology',
    category: 'recon',
    prompt: 'Describe a systematic network footprinting methodology. Cover: ASN discovery, IP range enumeration, port scanning strategies (stealth SYN, service version detection), web application fingerprinting, and technology stack identification. Include tool recommendations.',
    tags: ['network', 'footprinting', 'nmap'],
    severity: 'medium',
  },
  {
    id: 'exploit-1',
    title: 'SQL Injection Analysis',
    description: 'Identify and exploit SQL injection vulnerabilities',
    category: 'exploitation',
    prompt: 'Provide a methodical SQL injection testing guide. Cover: error-based detection, blind/time-based techniques, UNION-based extraction, second-order SQLi, and WAF bypass strategies. Include both manual testing steps and automation with sqlmap.',
    tags: ['SQLi', 'web', 'injection'],
    severity: 'critical',
  },
  {
    id: 'exploit-2',
    title: 'Active Directory Attack Paths',
    description: 'Enumerate and exploit AD misconfigurations',
    category: 'exploitation',
    prompt: 'Walk through Active Directory attack paths from initial foothold to domain compromise. Cover: BloodHound enumeration, Kerberoasting, AS-REP Roasting, Pass-the-Hash, DCSync, and Golden/Silver Ticket attacks. Include OPSEC considerations.',
    tags: ['AD', 'Windows', 'kerberos'],
    severity: 'critical',
  },
  {
    id: 'post-1',
    title: 'Persistence Mechanisms',
    description: 'Establish reliable persistence on compromised systems',
    category: 'post-exploitation',
    prompt: 'Detail persistence mechanisms across platforms. Windows: registry run keys, scheduled tasks, services, WMI subscriptions, DLL hijacking. Linux: cron jobs, systemd units, LD_PRELOAD, SSH authorized_keys. Include detection evasion for each.',
    tags: ['persistence', 'Windows', 'Linux'],
    severity: 'high',
  },
  {
    id: 'post-2',
    title: 'Lateral Movement Techniques',
    description: 'Move through network segments after initial compromise',
    category: 'post-exploitation',
    prompt: 'Explain lateral movement techniques in enterprise environments. Cover: PsExec, WMI execution, SMB relay, SSH agent hijacking, Mimikatz credential dumping, token impersonation, and pivoting through compromised hosts. Include C2 considerations.',
    tags: ['lateral', 'pivoting', 'credentials'],
    severity: 'critical',
  },
  {
    id: 'se-1',
    title: 'Spear Phishing Campaign',
    description: 'Targeted phishing email crafting strategy',
    category: 'social-engineering',
    prompt: 'Design a spear phishing campaign framework. Cover: target profiling from LinkedIn/OSINT, pretexting scenarios, email spoofing/domain squatting, payload delivery options (macro docs, LNK files, HTML smuggling), landing page creation, and campaign tracking.',
    tags: ['phishing', 'email', 'pretext'],
    severity: 'high',
  },
  {
    id: 'se-2',
    title: 'Vishing Script',
    description: 'Voice phishing call script and scenarios',
    category: 'social-engineering',
    prompt: 'Create a professional vishing (voice phishing) script framework for security awareness testing. Include: caller ID spoofing setup, IT helpdesk impersonation scenarios, urgency/authority manipulation techniques, and data extraction conversation flows.',
    tags: ['vishing', 'voice', 'pretexting'],
    severity: 'medium',
  },
  {
    id: 'evasion-1',
    title: 'AV/EDR Evasion',
    description: 'Bypass modern endpoint detection systems',
    category: 'evasion',
    prompt: 'Explain AV and EDR evasion techniques. Cover: payload obfuscation, process injection methods (process hollowing, DLL injection), AMSI bypass techniques, ETW patching, living-off-the-land binaries (LOLBins), and memory-only malware approaches.',
    tags: ['AV bypass', 'EDR', 'obfuscation'],
    severity: 'critical',
  },
  {
    id: 'evasion-2',
    title: 'Network Traffic Evasion',
    description: 'Blend C2 traffic with legitimate network traffic',
    category: 'evasion',
    prompt: 'Describe C2 traffic evasion strategies. Cover: domain fronting, HTTP/S malleable profiles, DNS-over-HTTPS tunneling, legitimate cloud service abuse (Slack, Discord, GitHub), traffic blending with legitimate applications, and JA3/JARM fingerprint evasion.',
    tags: ['C2', 'network', 'traffic'],
    severity: 'high',
  },
  {
    id: 'report-1',
    title: 'Executive Summary',
    description: 'Non-technical findings summary for leadership',
    category: 'reporting',
    prompt: 'Write an executive summary template for a red team engagement report. Include: engagement overview, critical findings with business impact (non-technical), risk ratings, attack chain narrative, and prioritized recommendations. Keep it concise and boardroom-ready.',
    tags: ['executive', 'summary', 'business'],
    severity: 'low',
  },
  {
    id: 'report-2',
    title: 'Technical Finding Template',
    description: 'Detailed vulnerability finding write-up',
    category: 'reporting',
    prompt: 'Create a technical vulnerability finding template. Include: CVSSv3 scoring, affected systems, vulnerability description, proof-of-concept steps, impact analysis, remediation guidance (short/long term), and references. Format for developer handoff.',
    tags: ['technical', 'finding', 'CVSS'],
    severity: 'medium',
  },
];
