// MITRE ATT&CK Techniques Data
export interface MitreTechnique {
  id: string;
  name: string;
  tactics: string[];
  description: string;
  subtechniques?: number;
}

export interface MitreTactic {
  id: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
}

export const MITRE_TACTICS: MitreTactic[] = [
  { id: 'TA0043', name: 'Reconnaissance', shortName: 'Recon', color: '#3399ff', description: 'Gather information to plan future operations' },
  { id: 'TA0042', name: 'Resource Development', shortName: 'Resource Dev', color: '#6655ff', description: 'Establish resources to support operations' },
  { id: 'TA0001', name: 'Initial Access', shortName: 'Initial Access', color: '#ff2222', description: 'Get into target network' },
  { id: 'TA0002', name: 'Execution', shortName: 'Execution', color: '#ff5500', description: 'Run malicious code on local or remote system' },
  { id: 'TA0003', name: 'Persistence', shortName: 'Persistence', color: '#ff8800', description: 'Maintain foothold across restarts' },
  { id: 'TA0004', name: 'Privilege Escalation', shortName: 'Priv Esc', color: '#ffaa00', description: 'Gain higher-level permissions' },
  { id: 'TA0005', name: 'Defense Evasion', shortName: 'Def Evasion', color: '#00cc44', description: 'Avoid detection and analysis' },
  { id: 'TA0006', name: 'Credential Access', shortName: 'Cred Access', color: '#00ff41', description: 'Steal account names and passwords' },
  { id: 'TA0007', name: 'Discovery', shortName: 'Discovery', color: '#00ccff', description: 'Learn about the environment' },
  { id: 'TA0008', name: 'Lateral Movement', shortName: 'Lateral Move', color: '#0088ff', description: 'Move through the environment' },
  { id: 'TA0009', name: 'Collection', shortName: 'Collection', color: '#aa44ff', description: 'Gather data of interest' },
  { id: 'TA0011', name: 'Command & Control', shortName: 'C2', color: '#ff44aa', description: 'Communicate with compromised systems' },
  { id: 'TA0010', name: 'Exfiltration', shortName: 'Exfiltration', color: '#ff6688', description: 'Steal data from target network' },
  { id: 'TA0040', name: 'Impact', shortName: 'Impact', color: '#ff2244', description: 'Manipulate, interrupt, or destroy systems' },
];

export const MITRE_TECHNIQUES: MitreTechnique[] = [
  // Reconnaissance
  { id: 'T1595', name: 'Active Scanning', tactics: ['TA0043'], description: 'Adversaries scan victim infrastructure to gather information during reconnaissance.', subtechniques: 3 },
  { id: 'T1592', name: 'Gather Victim Host Info', tactics: ['TA0043'], description: 'Information about the victim\'s hosts including hardware, software, and configurations.', subtechniques: 4 },
  { id: 'T1589', name: 'Gather Victim Identity Info', tactics: ['TA0043'], description: 'Credentials, email addresses, and employee names.', subtechniques: 3 },
  { id: 'T1590', name: 'Gather Victim Network Info', tactics: ['TA0043'], description: 'Network infrastructure, IP ranges, domain names, and topology.', subtechniques: 6 },
  { id: 'T1591', name: 'Gather Victim Org Info', tactics: ['TA0043'], description: 'Business operations, processes, and organizational structure.', subtechniques: 4 },
  { id: 'T1598', name: 'Phishing for Information', tactics: ['TA0043'], description: 'Spearphishing messages to elicit sensitive information from targets.', subtechniques: 4 },
  // Initial Access
  { id: 'T1189', name: 'Drive-by Compromise', tactics: ['TA0001'], description: 'User is compromised by visiting a website during normal browsing.', subtechniques: 0 },
  { id: 'T1190', name: 'Exploit Public-Facing App', tactics: ['TA0001'], description: 'Exploit a weakness in an Internet-facing host or system.', subtechniques: 0 },
  { id: 'T1133', name: 'External Remote Services', tactics: ['TA0001', 'TA0003'], description: 'VPNs, Citrix, and other remote access mechanisms.', subtechniques: 0 },
  { id: 'T1566', name: 'Phishing', tactics: ['TA0001'], description: 'Phishing messages with malicious links or attachments.', subtechniques: 4 },
  { id: 'T1195', name: 'Supply Chain Compromise', tactics: ['TA0001'], description: 'Manipulate products or delivery mechanisms before receipt.', subtechniques: 3 },
  { id: 'T1078', name: 'Valid Accounts', tactics: ['TA0001', 'TA0003', 'TA0004', 'TA0005'], description: 'Use credentials of existing accounts.', subtechniques: 4 },
  // Execution
  { id: 'T1059', name: 'Command & Scripting Interpreter', tactics: ['TA0002'], description: 'Abuse command and script interpreters to execute commands.', subtechniques: 9 },
  { id: 'T1203', name: 'Exploitation for Client Execution', tactics: ['TA0002'], description: 'Exploit software vulnerabilities to execute code.', subtechniques: 0 },
  { id: 'T1106', name: 'Native API', tactics: ['TA0002'], description: 'Interact with native OS APIs to execute behaviors.', subtechniques: 0 },
  { id: 'T1053', name: 'Scheduled Task/Job', tactics: ['TA0002', 'TA0003', 'TA0004'], description: 'Abuse task scheduling to execute code.', subtechniques: 6 },
  { id: 'T1204', name: 'User Execution', tactics: ['TA0002'], description: 'User executes malicious code or files.', subtechniques: 3 },
  { id: 'T1047', name: 'Windows Management Instrumentation', tactics: ['TA0002'], description: 'Use WMI to interact with local and remote systems.', subtechniques: 0 },
  // Persistence
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactics: ['TA0003', 'TA0004'], description: 'Configure programs to run at system startup or user logon.', subtechniques: 15 },
  { id: 'T1037', name: 'Boot or Logon Initialization Scripts', tactics: ['TA0003', 'TA0004'], description: 'Scripts executed during startup or logon initialization.', subtechniques: 5 },
  { id: 'T1543', name: 'Create or Modify System Process', tactics: ['TA0003', 'TA0004'], description: 'Create or modify system-level processes to repeatedly execute malicious payloads.', subtechniques: 4 },
  { id: 'T1546', name: 'Event Triggered Execution', tactics: ['TA0003', 'TA0004'], description: 'Triggered by system events to establish persistence.', subtechniques: 16 },
  // Privilege Escalation
  { id: 'T1548', name: 'Abuse Elevation Control Mechanism', tactics: ['TA0004', 'TA0005'], description: 'Abuse mechanisms to get higher-level permissions.', subtechniques: 5 },
  { id: 'T1134', name: 'Access Token Manipulation', tactics: ['TA0004', 'TA0005'], description: 'Manipulate tokens to operate under different user contexts.', subtechniques: 5 },
  { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactics: ['TA0004'], description: 'Exploit software vulnerabilities to elevate privileges.', subtechniques: 0 },
  { id: 'T1055', name: 'Process Injection', tactics: ['TA0004', 'TA0005'], description: 'Inject code into processes to evade defenses and elevate privileges.', subtechniques: 13 },
  // Defense Evasion
  { id: 'T1140', name: 'Deobfuscate/Decode Files', tactics: ['TA0005'], description: 'Deobfuscate or decode files or information during execution.', subtechniques: 0 },
  { id: 'T1562', name: 'Impair Defenses', tactics: ['TA0005'], description: 'Disable or modify tools to avoid detection.', subtechniques: 12 },
  { id: 'T1036', name: 'Masquerading', tactics: ['TA0005'], description: 'Manipulate features to make malicious behavior look legitimate.', subtechniques: 9 },
  { id: 'T1027', name: 'Obfuscated Files or Information', tactics: ['TA0005'], description: 'Encrypt, encode, or obfuscate content to avoid detection.', subtechniques: 13 },
  { id: 'T1620', name: 'Reflective Code Loading', tactics: ['TA0005'], description: 'Load code into process memory without writing to disk.', subtechniques: 0 },
  // Credential Access
  { id: 'T1110', name: 'Brute Force', tactics: ['TA0006'], description: 'Try many passwords to gain access to accounts.', subtechniques: 4 },
  { id: 'T1555', name: 'Credentials from Password Stores', tactics: ['TA0006'], description: 'Acquire credentials from password storage locations.', subtechniques: 6 },
  { id: 'T1212', name: 'Exploitation for Credential Access', tactics: ['TA0006'], description: 'Exploit software vulnerabilities in an attempt to collect credentials.', subtechniques: 0 },
  { id: 'T1187', name: 'Forced Authentication', tactics: ['TA0006'], description: 'Force systems or users to authenticate to attacker-controlled resources.', subtechniques: 0 },
  { id: 'T1056', name: 'Input Capture', tactics: ['TA0006'], description: 'Capture user input to obtain credentials or collect information.', subtechniques: 4 },
  { id: 'T1003', name: 'OS Credential Dumping', tactics: ['TA0006'], description: 'Dump credentials to obtain account login and credential material.', subtechniques: 8 },
  { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', tactics: ['TA0006'], description: 'Subvert Kerberos authentication to steal or forge tickets.', subtechniques: 5 },
  // Discovery
  { id: 'T1087', name: 'Account Discovery', tactics: ['TA0007'], description: 'Enumerate accounts on the system or domain.', subtechniques: 4 },
  { id: 'T1083', name: 'File and Directory Discovery', tactics: ['TA0007'], description: 'Enumerate files and directories on host or network shares.', subtechniques: 0 },
  { id: 'T1046', name: 'Network Service Discovery', tactics: ['TA0007'], description: 'Scan for services running on remote hosts.', subtechniques: 0 },
  { id: 'T1135', name: 'Network Share Discovery', tactics: ['TA0007'], description: 'Enumerate network shares and drives accessible from current system.', subtechniques: 0 },
  { id: 'T1057', name: 'Process Discovery', tactics: ['TA0007'], description: 'Enumerate running processes on a system.', subtechniques: 0 },
  { id: 'T1018', name: 'Remote System Discovery', tactics: ['TA0007'], description: 'Enumerate remote systems on a network.', subtechniques: 0 },
  { id: 'T1082', name: 'System Information Discovery', tactics: ['TA0007'], description: 'Gather detailed information about the operating system and hardware.', subtechniques: 0 },
  // Lateral Movement
  { id: 'T1210', name: 'Exploitation of Remote Services', tactics: ['TA0008'], description: 'Exploit remote services to gain access to internal systems.', subtechniques: 0 },
  { id: 'T1534', name: 'Internal Spearphishing', tactics: ['TA0008'], description: 'Use internal spearphishing to gain access to additional resources within a compromised environment.', subtechniques: 0 },
  { id: 'T1570', name: 'Lateral Tool Transfer', tactics: ['TA0008'], description: 'Move tools or files between systems in compromised environment.', subtechniques: 0 },
  { id: 'T1021', name: 'Remote Services', tactics: ['TA0008'], description: 'Use valid accounts to login to a service to execute commands or move laterally.', subtechniques: 8 },
  { id: 'T1091', name: 'Replication Through Removable Media', tactics: ['TA0008'], description: 'Move onto systems, possibly those not connected to the network, via removable media.', subtechniques: 0 },
  // Command & Control
  { id: 'T1071', name: 'Application Layer Protocol', tactics: ['TA0011'], description: 'Use application layer protocols to avoid detection of C2 traffic.', subtechniques: 4 },
  { id: 'T1092', name: 'Communication Through Removable Media', tactics: ['TA0011'], description: 'Perform C2 of compromised systems by communicating through removable media.', subtechniques: 0 },
  { id: 'T1132', name: 'Data Encoding', tactics: ['TA0011'], description: 'Encode data to make the content of C2 traffic more difficult to detect.', subtechniques: 2 },
  { id: 'T1001', name: 'Data Obfuscation', tactics: ['TA0011'], description: 'Obfuscate command and control traffic to make it more difficult to detect.', subtechniques: 3 },
  { id: 'T1568', name: 'Dynamic Resolution', tactics: ['TA0011'], description: 'Dynamically establish connections to C2 infrastructure to evade detection.', subtechniques: 3 },
  { id: 'T1090', name: 'Proxy', tactics: ['TA0011'], description: 'Use proxies or port redirection to obscure C2 infrastructure.', subtechniques: 4 },
  // Exfiltration
  { id: 'T1020', name: 'Automated Exfiltration', tactics: ['TA0010'], description: 'Automatically exfiltrate data over C2 channel.', subtechniques: 1 },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactics: ['TA0010'], description: 'Steal data by exfiltrating it over an existing C2 channel.', subtechniques: 0 },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactics: ['TA0010'], description: 'Use a different protocol than the one used for C2.', subtechniques: 3 },
  { id: 'T1567', name: 'Exfiltration Over Web Service', tactics: ['TA0010'], description: 'Use an existing legitimate external web service to exfiltrate data.', subtechniques: 4 },
  // Impact
  { id: 'T1485', name: 'Data Destruction', tactics: ['TA0040'], description: 'Destroy data and files on specific systems or in large numbers.', subtechniques: 0 },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactics: ['TA0040'], description: 'Encrypt data on target systems to interrupt availability.', subtechniques: 0 },
  { id: 'T1491', name: 'Defacement', tactics: ['TA0040'], description: 'Modify visual content available internally or externally.', subtechniques: 2 },
  { id: 'T1499', name: 'Endpoint Denial of Service', tactics: ['TA0040'], description: 'Perform denial of service to degrade availability.', subtechniques: 4 },
  { id: 'T1657', name: 'Financial Theft', tactics: ['TA0040'], description: 'Commit financial theft using access to compromised systems.', subtechniques: 0 },
  { id: 'T1490', name: 'Inhibit System Recovery', tactics: ['TA0040'], description: 'Delete or remove built-in operating system data and turn off recovery settings.', subtechniques: 0 },
  { id: 'T1489', name: 'Service Stop', tactics: ['TA0040'], description: 'Stop or disable services on a system to render those services unavailable.', subtechniques: 0 },
];
