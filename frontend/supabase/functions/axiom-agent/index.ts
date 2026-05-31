/**
 * axiom-agent — Autonomous Agent Executor
 * Runs autonomous red team agents with AI-driven step planning and real code execution
 * Modes: plan (generate agent steps), step (analyze output & decide next), summarize
 */
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'OnSpace AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { mode, agentType, target, objective, context, previousSteps, currentOutput, model } = body;

    const selectedModel = model || 'google/gemini-3-flash-preview';

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'plan') {
      // Generate initial agent plan
      const agentPersonas: Record<string, string> = {
        recon: `You are AXIOM Recon Agent. Generate a comprehensive reconnaissance operation plan.
Focus on: passive OSINT, DNS enumeration, port scanning, service fingerprinting, web technology detection, certificate transparency, subdomain discovery, banner grabbing.
Use REAL bash/python commands that work in a Linux sandbox.`,
        exploit: `You are AXIOM Exploit Agent. Generate a targeted exploitation plan.
Focus on: vulnerability identification, CVE exploitation, web app attacks (SQLi/XSS/LFI/RCE), authentication bypass, service exploitation.
Use REAL bash/python commands.`,
        postexploit: `You are AXIOM Post-Exploit Agent. Generate a post-exploitation operation plan.
Focus on: privilege escalation, persistence, credential harvesting, lateral movement, data exfiltration, covering tracks.
Use REAL bash/python commands.`,
        evasion: `You are AXIOM Evasion Agent. Generate a defense evasion plan.
Focus on: AV/EDR bypass, log clearing, AMSI patching, obfuscation, living-off-the-land, traffic blending.
Use REAL bash/python/powershell commands.`,
        fullchain: `You are AXIOM Full Chain Agent. Generate a complete attack chain from recon to impact.
Cover all phases: Recon → Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Lateral Movement → Exfiltration.
Use REAL commands that execute in a Linux bash sandbox.`,
      };

      systemPrompt = `${agentPersonas[agentType] || agentPersonas.recon}

CRITICAL: Respond ONLY with valid JSON. No markdown, no code fences.
Schema:
{
  "agent": "${agentType}",
  "objective": "string",
  "target": "string",
  "estimated_duration": "string",
  "risk_level": "low|medium|high|critical",
  "steps": [
    {
      "id": 1,
      "name": "step name",
      "phase": "phase name",
      "objective": "what this step achieves",
      "language": "bash|python|javascript",
      "code": "COMPLETE executable code using {TARGET} placeholder",
      "expected_output": "what success looks like",
      "decision_logic": "how to interpret results for next step",
      "mitre_id": "T1xxx",
      "risk": "low|medium|high|critical",
      "evasion": "evasion notes if applicable"
    }
  ],
  "success_criteria": "string",
  "notes": "string"
}`;

      userPrompt = `Generate an autonomous ${agentType} agent plan.
Target: ${target || 'unspecified (use 127.0.0.1 for safe demo)'}
Objective: ${objective || 'Comprehensive ' + agentType + ' operation'}
Context: ${context || 'Authorized security assessment, Linux environment'}

Generate 6-10 realistic steps. All code must be EXECUTABLE in bash/python. Use {TARGET} placeholder for target IP/domain. Make each step's output parseable for autonomous decision-making.`;

    } else if (mode === 'step') {
      // AI analyzes step output and decides next action
      systemPrompt = `You are AXIOM Autonomous Agent decision engine.
Analyze the output of an executed attack step and determine:
1. Was it successful?
2. What intelligence was gathered?
3. What is the optimal next action?

Respond ONLY with JSON:
{
  "success": true|false,
  "confidence": 0-100,
  "findings": ["finding1", "finding2"],
  "extracted_data": {
    "ips": ["ip1"],
    "ports": ["80/tcp http"],
    "services": ["service1"],
    "credentials": ["cred1"],
    "vulnerabilities": ["vuln1"],
    "mitre_ids": ["T1xxx"]
  },
  "threat_assessment": "string",
  "next_action": "continue|pivot|abort|complete",
  "next_step_suggestion": "specific next command or action",
  "notes": "string"
}`;

      const stepsContext = previousSteps?.length > 0
        ? `Previous steps:\n${previousSteps.map((s: any) => `- ${s.name}: ${s.success ? 'SUCCESS' : 'FAILED'}`).join('\n')}`
        : 'No previous steps';

      userPrompt = `Analyze this agent step output:

Agent Type: ${agentType}
Target: ${target}
Current Step: ${objective}
${stepsContext}

Command Output:
${currentOutput || '(no output)'}

Determine success, extract intelligence, and recommend next action.`;

    } else if (mode === 'summarize') {
      // Generate final agent operation report
      systemPrompt = `You are AXIOM reporting on a completed autonomous agent operation.
Generate a comprehensive operation summary.
Respond ONLY with JSON:
{
  "title": "Operation title",
  "status": "success|partial|failed",
  "duration": "estimated duration",
  "findings_summary": "string",
  "critical_findings": ["finding1"],
  "attack_surface": ["surface1"],
  "credentials_found": ["cred1"],
  "vulnerabilities": ["vuln1"],
  "mitre_coverage": ["T1xxx"],
  "recommendations": ["rec1"],
  "risk_level": "low|medium|high|critical",
  "next_operations": ["suggested next operation"]
}`;

      userPrompt = `Summarize this autonomous agent operation:

Agent: ${agentType}
Target: ${target}
Objective: ${objective}

Completed Steps:
${previousSteps?.map((s: any) => `[${s.success ? 'OK' : 'FAIL'}] ${s.name}\nOutput: ${(s.output || '').slice(0, 200)}`).join('\n\n') || 'No steps'}`;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `AI Error: ${errText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Extract JSON from response
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { error: 'Failed to parse AI response', raw: content.slice(0, 500) };
        }
      } else {
        parsed = { error: 'No JSON in response', raw: content.slice(0, 500) };
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('axiom-agent error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
