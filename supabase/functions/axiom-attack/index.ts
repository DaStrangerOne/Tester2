/**
 * axiom-attack — AI-Guided Attack Planner + Step Executor
 * Generates a structured multi-step attack plan, then streams execution guidance
 * for each step. Each step includes real executable code.
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
    const { objective, target, context, model, mode } = body;

    // mode = 'plan' | 'step' | 'analyze'
    const selectedModel = model || 'google/gemini-3-flash-preview';

    let systemPrompt = '';
    let userPrompt = '';

    if (mode === 'plan') {
      systemPrompt = `You are AXIOM, an elite red team AI. Generate structured attack plans.
ALWAYS respond with VALID JSON only. No markdown, no explanations outside JSON.
Schema:
{
  "title": "string - operation name",
  "objective": "string",
  "target": "string",
  "mitre_tactics": ["TA0001", ...],
  "opsec_level": "ghost|quiet|moderate|loud",
  "estimated_time": "string",
  "prerequisites": ["tool1", ...],
  "steps": [
    {
      "id": 1,
      "phase": "Recon|Initial Access|Execution|Persistence|PrivEsc|DefEvasion|CredAccess|LateralMove|Collection|C2|Exfil|Impact",
      "name": "string",
      "description": "string",
      "mitre_id": "T1xxx",
      "risk": "low|medium|high|critical",
      "language": "bash|python|javascript|powershell|go|rust",
      "code": "string - complete executable code, use {TARGET} placeholder",
      "expected_output": "string",
      "detection_risk": "string",
      "evasion_tips": "string"
    }
  ],
  "cleanup": ["cleanup command 1", ...],
  "notes": "string"
}`;
      userPrompt = `Generate a detailed, realistic attack plan.
Objective: ${objective}
Target: ${target || 'unspecified'}
Context: ${context || 'authorized penetration test'}

Include 5-10 steps covering the full kill chain. All code must be REAL and EXECUTABLE in a Linux bash environment (Piston sandbox). Use {TARGET} as placeholder for the target IP/domain. Focus on techniques that actually work.`;

    } else if (mode === 'step') {
      systemPrompt = `You are AXIOM, an elite red team AI executing attack steps.
Provide DETAILED technical guidance with real, executable code.
Format response as JSON only:
{
  "analysis": "string - technical analysis of step",
  "code": "string - complete executable code",
  "language": "bash|python|javascript|powershell",
  "explanation": "string - what each line does",
  "expected_output": "string",
  "next_actions": ["string - what to do with the output"],
  "evasion": "string - how to avoid detection",
  "pivot": "string - how to use results for next step"
}`;
      userPrompt = `Execute this attack step and provide full technical detail:
Step: ${objective}
Target: ${target || 'target'}
Context: ${context || ''}
Provide complete, working code. Be specific and technical.`;

    } else if (mode === 'analyze') {
      systemPrompt = `You are AXIOM, analyzing attack output. Respond as JSON:
{
  "success": true|false,
  "findings": ["finding1", ...],
  "vulnerabilities": ["vuln1", ...],
  "credentials": ["cred1", ...],
  "next_steps": ["next1", ...],
  "mitre_ids": ["T1xxx", ...],
  "pivot_opportunities": ["opportunity1", ...],
  "summary": "string"
}`;
      userPrompt = `Analyze this attack output and extract intelligence:
Command: ${objective}
Output: ${target}
Context: ${context || ''}`;
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
        temperature: 0.3,
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

    // Try to extract JSON from the response
    let parsed: any = null;
    try {
      // Direct parse
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON block
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { error: 'Failed to parse AI response', raw: content };
        }
      } else {
        parsed = { error: 'No JSON found in response', raw: content };
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('axiom-attack error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
