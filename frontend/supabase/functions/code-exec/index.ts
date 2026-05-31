import { corsHeaders } from '../_shared/cors.ts';

// ── Execution backends ──────────────────────────────────────────────────────
// emkc.org is whitelist-only as of 2025-02-15, removed.
// Backends tried in order: oncompute Piston → rextester API → Wandbox
const PISTON_URLS = [
  'https://piston.oncompute.com/api/v2/piston/execute',
  'https://execpiston.onrender.com/api/v2/piston/execute',
];

// Language → Piston runtime mapping
const LANG_MAP: Record<string, { language: string; version: string }> = {
  python:     { language: 'python',     version: '3.10.0'  },
  python3:    { language: 'python',     version: '3.10.0'  },
  bash:       { language: 'bash',       version: '5.2.0'   },
  sh:         { language: 'bash',       version: '5.2.0'   },
  javascript: { language: 'javascript', version: '18.15.0' },
  js:         { language: 'javascript', version: '18.15.0' },
  node:       { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3'   },
  ts:         { language: 'typescript', version: '5.0.3'   },
  ruby:       { language: 'ruby',       version: '3.0.1'   },
  go:         { language: 'go',         version: '1.16.2'  },
  rust:       { language: 'rust',       version: '1.50.0'  },
  c:          { language: 'c',          version: '10.2.0'  },
  cpp:        { language: 'c++',        version: '10.2.0'  },
  'c++':      { language: 'c++',        version: '10.2.0'  },
  java:       { language: 'java',       version: '15.0.2'  },
  php:        { language: 'php',        version: '8.0.2'   },
  perl:       { language: 'perl',       version: '5.36.0'  },
  powershell: { language: 'powershell', version: '7.4.0'   },
  lua:        { language: 'lua',        version: '5.4.4'   },
  swift:      { language: 'swift',      version: '5.3.3'   },
};

// Wandbox language mapping (fallback for common languages)
// Wandbox: https://wandbox.org — free, no auth, reliable
const WANDBOX_MAP: Record<string, { compiler: string }> = {
  python:     { compiler: 'cpython-3.12.0'      },
  python3:    { compiler: 'cpython-3.12.0'      },
  bash:       { compiler: 'bash'                 },
  sh:         { compiler: 'bash'                 },
  javascript: { compiler: 'nodejs-20.2.0'        },
  js:         { compiler: 'nodejs-20.2.0'        },
  node:       { compiler: 'nodejs-20.2.0'        },
  ruby:       { compiler: 'ruby-3.2.0'           },
  go:         { compiler: 'go-1.20.4'            },
  rust:       { compiler: 'rust-1.70.0'          },
  c:          { compiler: 'gcc-13.1.0'           },
  cpp:        { compiler: 'gcc-13.1.0-cpp'       },
  'c++':      { compiler: 'gcc-13.1.0-cpp'       },
  php:        { compiler: 'php-8.2.7'            },
  lua:        { compiler: 'lua-5.4.4'            },
  swift:      { compiler: 'swift-5.8.1'          },
};

interface ExecRequest {
  language: string;
  code: string;
  stdin?: string;
  args?: string[];
  timeout?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: ExecRequest = await req.json();
    const { language, code, stdin = '', args = [] } = body;

    if (!language || !code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: language, code', success: false, output: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const langKey = language.toLowerCase().trim();

    // Resolve runtime — exact match first, then fuzzy
    let runtime = LANG_MAP[langKey];
    if (!runtime) {
      const fuzzyKey = Object.keys(LANG_MAP).find(k => langKey.includes(k) || k.includes(langKey));
      if (fuzzyKey) runtime = LANG_MAP[fuzzyKey];
    }

    if (!runtime) {
      const keys = Object.keys(LANG_MAP);
      return new Response(
        JSON.stringify({
          error: `Unsupported language: ${language}`,
          success: false,
          output: `Unsupported language: ${language}. Supported: ${keys.join(', ')}`,
          supported: keys,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[code-exec] lang=${runtime.language}@${runtime.version} code_len=${code.length}`);

    // ── 1. Try Piston endpoints ─────────────────────────────────────────────
    const pistonPayload = {
      language: runtime.language,
      version: runtime.version,
      files: [{ name: getFilename(runtime.language), content: code }],
      stdin,
      args,
      compile_timeout: 15000,
      run_timeout: 15000,
    };

    let result: any = null;
    let lastError = '';

    for (const url of PISTON_URLS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'axiom-exec/2.5' },
          body: JSON.stringify(pistonPayload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          lastError = `HTTP ${response.status} from ${url}: ${errBody.slice(0, 200)}`;
          console.warn(`[code-exec] Piston failed: ${lastError}`);
          continue;
        }

        result = await response.json();
        console.log(`[code-exec] Piston OK via ${url}: exit=${result.run?.code}`);
        break;
      } catch (e: any) {
        lastError = `${url}: ${e?.message || String(e)}`;
        console.warn(`[code-exec] Piston fetch error: ${lastError}`);
      }
    }

    // Normalize Piston result
    if (result) {
      const stdout = result.run?.stdout || '';
      const stderr = result.run?.stderr || '';
      const exitCode = result.run?.code ?? -1;
      const signal = result.run?.signal || null;
      const compileStdout = result.compile?.stdout || '';
      const compileStderr = result.compile?.stderr || '';
      const output = buildOutput(stdout, stderr, compileStdout, compileStderr, exitCode, signal);
      const success = exitCode === 0 && !signal && !compileStderr;

      return new Response(
        JSON.stringify({ success, exitCode, signal, stdout, stderr, compileStdout, compileStderr, output, language: runtime.language, version: runtime.version, runtime: runtime.language }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Wandbox fallback ─────────────────────────────────────────────────
    const wandboxRuntime = WANDBOX_MAP[langKey] || WANDBOX_MAP[Object.keys(WANDBOX_MAP).find(k => langKey.includes(k) || k.includes(langKey)) || ''];

    if (wandboxRuntime) {
      console.log(`[code-exec] Trying Wandbox: compiler=${wandboxRuntime.compiler}`);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);

        const wandboxPayload: any = {
          compiler: wandboxRuntime.compiler,
          code,
          'compiler-option-raw': '',
          'runtime-option-raw': stdin ? stdin : '',
          save: false,
        };

        const wbRes = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wandboxPayload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (wbRes.ok) {
          const wbData = await wbRes.json();
          const stdout = wbData.program_output || '';
          const stderr = wbData.program_error || wbData.compiler_error || '';
          const exitCode = wbData.status ? parseInt(wbData.status, 10) : (stderr ? 1 : 0);
          const compileStderr = wbData.compiler_error || '';
          const output = buildOutput(stdout, stderr, '', compileStderr, exitCode, null);
          const success = exitCode === 0 && !compileStderr;

          console.log(`[code-exec] Wandbox OK: exit=${exitCode}`);
          return new Response(
            JSON.stringify({ success, exitCode, signal: null, stdout, stderr, compileStdout: '', compileStderr, output, language: runtime.language, version: runtime.version, runtime: 'wandbox' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          lastError = `Wandbox HTTP ${wbRes.status}`;
          console.warn(`[code-exec] Wandbox failed: ${lastError}`);
        }
      } catch (e: any) {
        lastError = `Wandbox: ${e?.message || String(e)}`;
        console.warn(`[code-exec] Wandbox error: ${lastError}`);
      }
    }

    // ── 3. All backends failed ──────────────────────────────────────────────
    console.error(`[code-exec] All backends failed. Last: ${lastError}`);
    return new Response(
      JSON.stringify({
        error: `All execution backends unavailable. Last error: ${lastError}`,
        success: false,
        output: `[ERROR] Execution engine unavailable.\n\nAll backends failed:\n- Piston (oncompute.com)\n- Wandbox\n\nLast error: ${lastError}\n\nTry again in a moment or check your network.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[code-exec] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: err?.message || 'Internal server error',
        success: false,
        output: `[INTERNAL ERROR] ${err?.message || 'Unknown error'}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getFilename(lang: string): string {
  const ext: Record<string, string> = {
    python: 'main.py', bash: 'main.sh', javascript: 'main.js',
    typescript: 'main.ts', ruby: 'main.rb', go: 'main.go',
    rust: 'main.rs', c: 'main.c', 'c++': 'main.cpp', java: 'Main.java',
    php: 'main.php', perl: 'main.pl', powershell: 'main.ps1',
    lua: 'main.lua', swift: 'main.swift',
  };
  return ext[lang] || 'main.txt';
}

function buildOutput(
  stdout: string, stderr: string,
  compileOut: string, compileErr: string,
  exitCode: number, signal: string | null
): string {
  const parts: string[] = [];
  if (compileErr) parts.push(`[COMPILE ERROR]\n${compileErr.trim()}`);
  if (compileOut) parts.push(`[COMPILE]\n${compileOut.trim()}`);
  if (stdout) parts.push(stdout.trimEnd());
  if (stderr && (exitCode !== 0 || !stdout)) parts.push(`[STDERR]\n${stderr.trim()}`);
  if (signal) parts.push(`\n[KILLED] Signal: ${signal}`);
  else if (exitCode !== 0 && exitCode !== null) parts.push(`\n[EXIT] Code: ${exitCode}`);
  return parts.join('\n') || '(no output)';
}
