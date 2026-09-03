import { NextRequest, NextResponse } from 'next/server';
import type { BulletRewriteResult } from '@/types/cv';
import { requestDeepSeekJson } from '@/lib/deepseek';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RewriteMode = 'star' | 'metrics';

interface DeepSeekRewritePayload {
  rewritten?: string;
  note?: string;
}

function normalizeSentence(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

function sanitizeMetricPlaceholders(original: string, rewritten: string): string {
  if (/\d/.test(original)) return rewritten;
  return rewritten
    .replace(/\b\d+(?:\.\d+)?%/g, 'X%')
    .replace(/\b\d+(?:\.\d+)?\b/g, 'N');
}

function fallbackRewrite(bullet: string, mode: RewriteMode): BulletRewriteResult {
  const base = normalizeSentence(bullet.replace(/^[•*-]\s*/, ''));
  if (!base) {
    return { original: bullet, rewritten: '', used_ai: false, mode };
  }

  if (mode === 'metrics') {
    const rewritten = /\d/.test(base)
      ? `${base} while clarifying the business KPI it improved.`
      : `${base} while improving a measurable KPI such as conversion rate, cycle time, or cost per task.`;
    return {
      original: bullet,
      rewritten,
      used_ai: false,
      mode,
    };
  }

  const rewritten = /\b(result|increased|reduced|improved|grew|saved|delivered)\b/i.test(base)
    ? base
    : `${base}, aligning the work to a clear team goal and delivering a measurable business result.`;
  return {
    original: bullet,
    rewritten,
    used_ai: false,
    mode,
  };
}

async function rewriteWithDeepSeek(
  bullet: string,
  mode: RewriteMode,
  context: { jobTitle?: string; company?: string; jobDescription?: string },
): Promise<BulletRewriteResult | null> {
  const prompt = `You are an expert resume writer improving one resume bullet point.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"rewritten":"...","note":"..."}

Rules:
- Keep it truthful to the original bullet.
- Keep it to one sentence.
- Use 220 characters or fewer.
- Start with a strong action verb.
- If mode is star, make the bullet read like Situation, Task, Action, Result, but keep it concise enough for a resume.
- If mode is metrics, keep the original claim and add plausible metric framing without inventing a fake number. You may refer to metrics like conversion rate, latency, revenue, cost, adoption, throughput, or retention.
- Do not use first person pronouns.

Mode: ${mode}
Role context: ${context.jobTitle || 'Unknown role'}
Company context: ${context.company || 'Unknown company'}
Job description context:
"""
${(context.jobDescription || '').slice(0, 1800) || '(none provided)'}
"""

Original bullet:
"""
${bullet.slice(0, 1200)}
"""`;

  const parsed = await requestDeepSeekJson<DeepSeekRewritePayload>(prompt, {
    temperature: 0.4,
    timeoutMs: 25000,
  });

  const rewritten = normalizeSentence(parsed?.rewritten || '');
  if (!rewritten || rewritten.toLowerCase() === normalizeSentence(bullet).toLowerCase()) return null;

  const sanitized = mode === 'metrics' ? sanitizeMetricPlaceholders(bullet, rewritten) : rewritten;
  const note = normalizeSentence(parsed?.note || '');
  const placeholderNote = 'Replace X% placeholders with your real numbers before using this bullet.';

  return {
    original: bullet,
    rewritten: sanitized,
    used_ai: true,
    mode,
    note: mode === 'metrics' && !/\d/.test(bullet)
      ? note ? `${placeholderNote} ${note.replace(/\b\d+(?:\.\d+)?%?/g, 'X%')}` : placeholderNote
      : note,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const bullet = typeof body.bullet === 'string' ? body.bullet.trim() : '';
    const mode: RewriteMode = body.mode === 'metrics' ? 'metrics' : 'star';
    const context = typeof body.context === 'object' && body.context ? body.context : {};

    if (!bullet) {
      return NextResponse.json({ error: 'bullet is required' }, { status: 400 });
    }

    const aiResult = bullet.length >= 20 ? await rewriteWithDeepSeek(bullet, mode, context) : null;
    const result = aiResult ?? fallbackRewrite(bullet, mode);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
