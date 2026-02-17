// Supabase Edge Function for AI content moderation
// Deploy with: supabase functions deploy moderate-content
// Set secret: supabase secrets set OPENAI_API_KEY=your_key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, content } = (await req.json()) as ModerationRequest;

    if (!title && !content) {
      return new Response(
        JSON.stringify({ allowed: true, severity: 'clean' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      // No API key configured, allow content but log warning
      console.warn('OPENAI_API_KEY not configured for content moderation');
      return new Response(
        JSON.stringify({ allowed: true, severity: 'clean' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use OpenAI's moderation endpoint (free and fast)
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: `${title}\n\n${content}`,
      }),
    });

    if (!moderationResponse.ok) {
      console.error('OpenAI moderation failed:', await moderationResponse.text());
      return new Response(
        JSON.stringify({ allowed: true, severity: 'clean' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const moderationData = await moderationResponse.json();
    const result = moderationData.results[0];

    // Check if content is flagged
    if (result.flagged) {
      // Find which categories were flagged
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      // Determine severity based on flagged categories
      const severeCategories = [
        'hate',
        'hate/threatening',
        'self-harm',
        'self-harm/intent',
        'sexual/minors',
        'violence/graphic',
      ];

      const isSevere = flaggedCategories.some((cat) =>
        severeCategories.includes(cat)
      );

      const response: ModerationResult = {
        allowed: false,
        reason: isSevere
          ? 'Your post contains content that violates our community guidelines and cannot be published.'
          : 'Your post may contain inappropriate content. Please review and revise before posting.',
        flagged_content: flaggedCategories.join(', '),
        severity: isSevere ? 'blocked' : 'warning',
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Content is clean
    return new Response(
      JSON.stringify({ allowed: true, severity: 'clean' } as ModerationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Moderation error:', error);
    // On error, allow content but log the issue
    return new Response(
      JSON.stringify({ allowed: true, severity: 'clean' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
