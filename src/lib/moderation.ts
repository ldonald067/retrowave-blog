// Content moderation utilities
// Uses a combination of local filtering and optional AI moderation

// Basic word filter - catches obvious slurs and hate speech
// This runs client-side as a first pass
const BLOCKED_PATTERNS = [
  // Slurs and hate speech (regex patterns)
  /\bn[i1!|]gg[e3a@][r5s]?\b/gi,
  /\bf[a@4]gg?[o0][t7]s?\b/gi,
  /\br[e3]t[a@4]rd(ed|s)?\b/gi,
  /\bk[i1!][k]+[e3]s?\b/gi,
  /\bsp[i1!][c]+s?\b/gi,
  /\bch[i1!]nks?\b/gi,
  /\bgooks?\b/gi,
  /\bw[e3]tb[a@4]cks?\b/gi,
  /\btr[a@4]nn(y|ies)\b/gi,
  /\bd[y1!]k[e3]s?\b/gi,
  // Violence
  /\bk[i1!]ll\s*(yourself|urself|your\s*self)\b/gi,
  /\bk[y1!]s\b/gi,
  /\bsuicide\s*is\s*(the\s*)?(answer|solution)\b/gi,
  // Nazi/white supremacy
  /\bh[e3][i1!]l\s*h[i1!]tl[e3]r\b/gi,
  /\b14\s*88\b/gi,
  /\bwh[i1!]t[e3]\s*p[o0]w[e3]r\b/gi,
  /\bwh[i1!]t[e3]\s*suprem/gi,
];

// Blocked adult/porn domains (common ones)
const BLOCKED_DOMAINS = [
  // Major porn sites
  'pornhub',
  'xvideos',
  'xnxx',
  'xhamster',
  'redtube',
  'youporn',
  'tube8',
  'spankbang',
  'xozilla',
  'eporner',
  'pornone',
  'thumbzilla',
  'xtube',
  'porn.com',
  'porn',
  'xxx',
  'sex.com',
  'brazzers',
  'bangbros',
  'realitykings',
  'naughtyamerica',
  'mofos',
  'fakehub',
  'teamskeet',
  'blacked',
  'tushy',
  'vixen',
  // Cam sites
  'chaturbate',
  'stripchat',
  'bongacams',
  'livejasmin',
  'cam4',
  'camsoda',
  'myfreecams',
  'flirt4free',
  // OnlyFans and similar
  'onlyfans',
  'fansly',
  'fanvue',
  'loyalfans',
  'justforfans',
  // Hentai/animated
  'hentai',
  'nhentai',
  'hanime',
  'rule34',
  'e621',
  'gelbooru',
  'danbooru',
  // Image sharing adult
  'imgur.com/a/', // Imgur albums can contain NSFW
  'redgifs',
  'gfycat', // Often used for NSFW
  // Escort/hookup
  'backpage',
  'skipthegames',
  'bedpage',
  'escortdirectory',
  // Gore/shock
  'liveleak',
  'bestgore',
  'rotten',
  'theync',
  'documenting',
  'kaotic',
  // Piracy (bonus protection)
  'thepiratebay',
  'kickass',
  '1337x',
  'rarbg',
];

// Adult content keywords in URLs
const ADULT_URL_KEYWORDS = [
  'porn',
  'xxx',
  'sex',
  'nude',
  'naked',
  'nsfw',
  'adult',
  'escort',
  'camgirl',
  'onlyfan',
  'hentai',
  'erotic',
  'fetish',
  'bdsm',
  'milf',
  'teen', // Often used in adult context
  'fuck',
  'pussy',
  'cock',
  'dick',
  'boob',
  'tits',
  'ass',
  'anal',
  'blowjob',
  'creampie',
  'cumshot',
  'gangbang',
  'threesome',
  'lesbian',
  'gay', // In adult context URLs
  'orgasm',
  'masturbat',
  'dildo',
  'vibrator',
  'stripper',
  'hooker',
  'whore',
  'slut',
];

// Words that are concerning but need context
const WARNING_WORDS = [
  'hate',
  'kill',
  'die',
  'death',
  'murder',
  'attack',
  'destroy',
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flagged_content?: string;
  severity?: 'blocked' | 'warning' | 'clean';
}

/**
 * Extract all URLs from text
 */
function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlPattern) || [];
}

/**
 * Check if a URL points to blocked adult/harmful content
 */
function isBlockedUrl(url: string): { blocked: boolean; reason?: string } {
  const lowerUrl = url.toLowerCase();

  // Check against blocked domains
  for (const domain of BLOCKED_DOMAINS) {
    if (lowerUrl.includes(domain)) {
      return {
        blocked: true,
        reason: 'Links to adult or inappropriate websites are not allowed.'
      };
    }
  }

  // Check for adult keywords in URL path/query
  for (const keyword of ADULT_URL_KEYWORDS) {
    // Check if keyword appears in the URL (but not as part of a larger word in domain)
    // We check the path portion more strictly
    try {
      const urlObj = new URL(url);
      const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
      if (pathAndQuery.includes(keyword)) {
        return {
          blocked: true,
          reason: 'Links containing adult content are not allowed.'
        };
      }
      // Also check subdomain
      if (urlObj.hostname.includes(keyword)) {
        return {
          blocked: true,
          reason: 'Links to adult websites are not allowed.'
        };
      }
    } catch {
      // If URL parsing fails, do a simple check
      if (lowerUrl.includes(keyword)) {
        return {
          blocked: true,
          reason: 'Links containing adult content are not allowed.'
        };
      }
    }
  }

  return { blocked: false };
}

/**
 * Check all URLs in text for blocked content
 */
export function checkUrls(text: string): ModerationResult {
  const urls = extractUrls(text);

  for (const url of urls) {
    const result = isBlockedUrl(url);
    if (result.blocked) {
      return {
        allowed: false,
        reason: result.reason,
        flagged_content: url,
        severity: 'blocked',
      };
    }
  }

  return { allowed: true, severity: 'clean' };
}

/**
 * Quick client-side check for obvious violations
 * This is fast and doesn't require API calls
 */
export function quickContentCheck(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true, severity: 'clean' };
  }

  // Check for blocked URLs first
  const urlCheck = checkUrls(text);
  if (!urlCheck.allowed) {
    return urlCheck;
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        allowed: false,
        reason: 'Your post contains content that violates our community guidelines.',
        flagged_content: match[0],
        severity: 'blocked',
      };
    }
  }

  // Check for warning words (just flag, don't block)
  const lowerText = text.toLowerCase();
  const foundWarnings = WARNING_WORDS.filter(word => lowerText.includes(word));
  if (foundWarnings.length >= 3) {
    // Multiple warning words might indicate problematic content
    return {
      allowed: true, // Still allow, but could trigger AI review
      reason: 'Content flagged for review',
      severity: 'warning',
    };
  }

  return { allowed: true, severity: 'clean' };
}

/**
 * Full moderation check using Supabase Edge Function.
 * Requires the caller to supply a function that resolves the user's JWT
 * so the edge function can authenticate the request.
 *
 * C4 FIX: Now accepts embedded_links and forwards them to the edge function
 * for server-side URL validation. Previously URL checking was client-only
 * and could be bypassed by calling the REST API directly.
 *
 * @param title - Post title
 * @param content - Post body
 * @param embeddedLinks - Array of link preview objects (optional)
 * @param supabaseUrl - VITE_SUPABASE_URL
 * @param getAuthToken - async fn returning the user's JWT, or null
 */
export async function moderateContent(
  title: string,
  content: string,
  embeddedLinks: Array<{ url: string }> | null | undefined,
  supabaseUrl: string,
  getAuthToken: () => Promise<string | null>,
): Promise<ModerationResult> {
  // First, do a quick local check (text patterns + client-side URL check)
  const quickCheck = quickContentCheck(`${title} ${content}`);
  if (!quickCheck.allowed) {
    return quickCheck;
  }

  // Also check embedded link URLs locally for immediate feedback
  if (embeddedLinks) {
    for (const link of embeddedLinks) {
      if (link.url) {
        const urlResult = checkUrls(link.url);
        if (!urlResult.allowed) return urlResult;
      }
    }
  }

  // For warning-level content or longer posts, use AI moderation
  const needsAIReview = quickCheck.severity === 'warning' || content.length > 500;

  if (!needsAIReview) {
    return { allowed: true, severity: 'clean' };
  }

  try {
    const token = await getAuthToken();
    if (!token) {
      // No authenticated user — skip AI moderation, local check already passed
      console.warn('No auth token available for moderation; skipping AI check');
      return { allowed: true, severity: 'clean' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // C4 FIX: Pass embedded_links for server-side URL validation
      body: JSON.stringify({
        title,
        content,
        embedded_links: embeddedLinks ?? undefined,
      }),
    });

    if (!response.ok) {
      console.warn('Moderation service unavailable, using local check only');
      return { allowed: true, severity: 'clean' };
    }

    const result = await response.json();
    return result as ModerationResult;
  } catch (error) {
    console.warn('Moderation check failed:', error);
    return { allowed: true, severity: 'clean' };
  }
}

/**
 * Sanitize content by removing potentially harmful HTML/scripts
 * (Additional layer of protection)
 */
export function sanitizeContent(text: string): string {
  return text
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove onclick and other event handlers
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs that could be harmful
    .replace(/data:text\/html/gi, '');
}
