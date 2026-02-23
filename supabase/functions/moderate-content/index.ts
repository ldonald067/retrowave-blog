// Supabase Edge Function for AI content moderation
// Deploy with: supabase functions deploy moderate-content
// Set secret: supabase secrets set OPENAI_API_KEY=your_key
// Set secret: supabase secrets set SITE_URL=https://yourapp.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: only allow the app's origin (not '*')
const ALLOWED_ORIGINS = [
  Deno.env.get('SITE_URL') ?? 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
];

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

interface ModerationRequest {
  title: string;
  content: string;
}

interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flagged_content?: string;
  severity: 'blocked' | 'warning' | 'clean';
}

function jsonResponse(
  body: ModerationResult | { error: string },
  origin: string | null,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  // ── JWT Authentication ───────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid Authorization header' }, origin, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    return jsonResponse({ error: 'Server misconfiguration' }, origin, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, origin, 401);
  }
  // ── End auth check ───────────────────────────────────────────────────

  try {
    const { title, content } = (await req.json()) as ModerationRequest;

    if (!title && !content) {
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      console.warn('OPENAI_API_KEY not configured for content moderation');
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    const moderationResponse = await fetch(
      'https://api.openai.com/v1/moderations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: `${title}\n\n${content}` }),
      },
    );

    if (!moderationResponse.ok) {
      console.error(
        'OpenAI moderation failed:',
        await moderationResponse.text(),
      );
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    if (result.flagged) {
      const flaggedCategories = Object.entries(
        result.categories as Record<string, boolean>,
      )
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      const severeCategories = [
        'hate',
        'hate/threatening',
        'self-harm',
        'self-harm/intent',
        'sexual/minors',
        'violence/graphic',
      ];
      const isSevere = flaggedCategories.some((cat) =>
        severeCategories.includes(cat),
      );

      const response: ModerationResult = {
        allowed: false,
        reason: isSevere
          ? 'Your post contains content that violates our community guidelines and cannot be published.'
          : 'Your post may contain inappropriate content. Please review and revise before posting.',
        flagged_content: flaggedCategories.join(', '),
        severity: isSevere ? 'blocked' : 'warning',
      };

      return jsonResponse(response, origin);
    }

    return jsonResponse({ allowed: true, severity: 'clean' }, origin);
  } catch (error) {
    console.error('Moderation error:', error);
    return jsonResponse({ allowed: true, severity: 'clean' }, origin);
  }
});
