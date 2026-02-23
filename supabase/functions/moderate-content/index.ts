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

// ── C4 FIX: Server-side URL blocklist ─────────────────────────────────────
// These lists were previously client-only (src/lib/moderation.ts).
// A user calling the REST API directly could bypass all URL filtering.
// Now validated server-side before content is stored.

const BLOCKED_DOMAINS = [
  // Major porn sites
  'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn',
  'tube8', 'spankbang', 'xozilla', 'eporner', 'pornone', 'thumbzilla',
  'xtube', 'porn.com', 'porn', 'xxx', 'sex.com', 'brazzers', 'bangbros',
  'realitykings', 'naughtyamerica', 'mofos', 'fakehub', 'teamskeet',
  'blacked', 'tushy', 'vixen',
  // Cam sites
  'chaturbate', 'stripchat', 'bongacams', 'livejasmin', 'cam4',
  'camsoda', 'myfreecams', 'flirt4free',
  // OnlyFans and similar
  'onlyfans', 'fansly', 'fanvue', 'loyalfans', 'justforfans',
  // Hentai/animated
  'hentai', 'nhentai', 'hanime', 'rule34', 'e621', 'gelbooru', 'danbooru',
  // Image sharing adult
  'redgifs',
  // Escort/hookup
  'backpage', 'skipthegames', 'bedpage', 'escortdirectory',
  // Gore/shock
  'liveleak', 'bestgore', 'rotten', 'theync', 'kaotic',
  // Piracy
  'thepiratebay', 'kickass', '1337x', 'rarbg',
];

const ADULT_URL_KEYWORDS = [
  'porn', 'xxx', 'nude', 'naked', 'nsfw', 'escort', 'camgirl',
  'onlyfan', 'hentai', 'erotic', 'fetish', 'bdsm', 'milf',
];

/** Check a single URL against the server-side blocklist */
function isBlockedUrl(url: string): { blocked: boolean; reason?: string } {
  const lowerUrl = url.toLowerCase();

  for (const domain of BLOCKED_DOMAINS) {
    if (lowerUrl.includes(domain)) {
      return { blocked: true, reason: 'Links to adult or inappropriate websites are not allowed.' };
    }
  }

  try {
    const urlObj = new URL(url);
    const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
    for (const keyword of ADULT_URL_KEYWORDS) {
      if (pathAndQuery.includes(keyword) || urlObj.hostname.includes(keyword)) {
        return { blocked: true, reason: 'Links containing adult content are not allowed.' };
      }
    }
  } catch {
    // If URL parsing fails, do a simple keyword check
    for (const keyword of ADULT_URL_KEYWORDS) {
      if (lowerUrl.includes(keyword)) {
        return { blocked: true, reason: 'Links containing adult content are not allowed.' };
      }
    }
  }

  return { blocked: false };
}

/** Extract all http(s) URLs from text */
function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) || [];
}

/**
 * Validate all URLs — from text content AND from embedded_links.
 * Returns a ModerationResult if any URL is blocked, or null if all clean.
 */
function checkAllUrls(
  title: string,
  content: string,
  embeddedLinks?: Array<{ url?: string }>,
): ModerationResult | null {
  // Collect all URLs: from text + from embedded_links
  const urls = new Set<string>([
    ...extractUrls(title),
    ...extractUrls(content),
  ]);

  if (embeddedLinks) {
    for (const link of embeddedLinks) {
      if (typeof link?.url === 'string' && link.url) {
        urls.add(link.url);
      }
    }
  }

  for (const url of urls) {
    const result = isBlockedUrl(url);
    if (result.blocked) {
      return {
        allowed: false,
        reason: result.reason ?? 'Blocked URL detected.',
        flagged_content: url,
        severity: 'blocked',
      };
    }
  }

  return null;
}
// ── End URL blocklist ─────────────────────────────────────────────────────

interface ModerationRequest {
  title: string;
  content: string;
  embedded_links?: Array<{ url?: string }>;
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

// H6 FIX: Max request body size (100 KB)
const MAX_BODY_SIZE = 100_000;

// H7 FIX: OpenAI fetch timeout (5 seconds)
const OPENAI_TIMEOUT_MS = 5_000;

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  // M6 FIX: Reject non-POST methods
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, origin, 405);
  }

  // H6 FIX: Reject oversized request bodies before parsing
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return jsonResponse({ error: 'Request body too large' }, origin, 413);
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
    const { title, content, embedded_links } = (await req.json()) as ModerationRequest;

    if (!title && !content) {
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    // C4 FIX: Server-side URL validation (runs BEFORE OpenAI to fail fast)
    const urlResult = checkAllUrls(title ?? '', content ?? '', embedded_links);
    if (urlResult) {
      return jsonResponse(urlResult, origin);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      console.warn('OPENAI_API_KEY not configured for content moderation');
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    // H7 FIX: Timeout on OpenAI fetch to prevent hung requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let moderationResponse: Response;
    try {
      moderationResponse = await fetch(
        'https://api.openai.com/v1/moderations',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: `${title}\n\n${content}` }),
          signal: controller.signal,
        },
      );
    } catch (fetchError) {
      // Timeout or network error — fail open (intentional design choice)
      console.error('OpenAI fetch error (timeout or network):', fetchError);
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!moderationResponse.ok) {
      console.error(
        'OpenAI moderation failed:',
        await moderationResponse.text(),
      );
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results?.[0];

    if (!result) {
      console.error('OpenAI returned unexpected response shape:', moderationData);
      return jsonResponse({ allowed: true, severity: 'clean' }, origin);
    }

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
