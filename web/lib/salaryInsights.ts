import type { SalaryInsight } from '@/types/cv';
import { requestDeepSeekJson } from '@/lib/deepseek';

interface DeepSeekSalaryPayload {
  region?: string;
  min_salary?: number;
  max_salary?: number;
  median_salary?: number;
  currency?: string;
  negotiation_tips?: string[];
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function inferSeniority(title: string): number {
  const lower = title.toLowerCase();
  if (/principal|head|director|vp|chief/.test(lower)) return 1.65;
  if (/staff|lead/.test(lower)) return 1.45;
  if (/senior/.test(lower)) return 1.25;
  if (/junior|associate|entry/.test(lower)) return 0.75;
  return 1;
}

function inferRoleBase(title: string): { min: number; max: number } {
  const lower = title.toLowerCase();
  if (/product manager/.test(lower)) return { min: 70000, max: 120000 };
  if (/data scientist/.test(lower)) return { min: 65000, max: 115000 };
  if (/designer/.test(lower)) return { min: 50000, max: 85000 };
  if (/frontend|ui|react/.test(lower)) return { min: 50000, max: 90000 };
  if (/backend|full stack|fullstack|software|engineer|developer/.test(lower)) return { min: 60000, max: 110000 };
  if (/marketing/.test(lower)) return { min: 45000, max: 80000 };
  if (/sales/.test(lower)) return { min: 40000, max: 90000 };
  return { min: 50000, max: 85000 };
}

function inferRegion(location: string, jobDescription: string): { region: string; multiplier: number; currency: string } {
  const source = `${location} ${jobDescription}`.toLowerCase();
  if (source.includes('switzerland')) return { region: 'Switzerland', multiplier: 1.7, currency: 'CHF' };
  if (source.includes('germany') || source.includes('berlin') || source.includes('munich')) return { region: 'Germany', multiplier: 1, currency: 'EUR' };
  if (source.includes('united kingdom') || source.includes('london') || source.includes('uk')) return { region: 'United Kingdom', multiplier: 1.05, currency: 'GBP' };
  if (source.includes('canada') || source.includes('toronto') || source.includes('vancouver')) return { region: 'Canada', multiplier: 0.95, currency: 'CAD' };
  if (source.includes('lagos') || source.includes('nigeria')) return { region: 'Nigeria', multiplier: 0.28, currency: 'USD' };
  if (source.includes('india') || source.includes('bangalore')) return { region: 'India', multiplier: 0.3, currency: 'USD' };
  if (source.includes('remote')) return { region: normalizeText(location) || 'Remote', multiplier: 1.05, currency: 'USD' };
  if (source.includes('united states') || source.includes('new york') || source.includes('san francisco') || source.includes('usa')) {
    return { region: 'United States', multiplier: 1.3, currency: 'USD' };
  }
  return { region: normalizeText(location) || 'Global estimate', multiplier: 1, currency: 'USD' };
}

function fallbackInsight(jobTitle: string, location: string, jobDescription: string): SalaryInsight {
  const base = inferRoleBase(jobTitle);
  const seniority = inferSeniority(jobTitle);
  const region = inferRegion(location, jobDescription);
  const minSalary = Math.round(base.min * seniority * region.multiplier / 1000) * 1000;
  const maxSalary = Math.round(base.max * seniority * region.multiplier / 1000) * 1000;
  const medianSalary = Math.round((minSalary + maxSalary) / 2 / 1000) * 1000;

  return {
    role: normalizeText(jobTitle) || 'Role',
    region: region.region,
    min_salary: minSalary,
    max_salary: Math.max(maxSalary, minSalary + 5000),
    median_salary: medianSalary,
    currency: region.currency,
    negotiation_tips: [
      'Anchor the conversation around the value you can deliver in the first 6 to 12 months.',
      'Bring 2 or 3 quantified achievements that match this role before discussing compensation.',
      'If the base salary is fixed, ask about bonus, equity, learning budget, or review timing.',
    ],
  };
}

function sanitizeInsight(input: SalaryInsight, fallback: SalaryInsight): SalaryInsight {
  const minSalary = Number.isFinite(input.min_salary) ? Number(input.min_salary) : fallback.min_salary;
  const maxSalary = Number.isFinite(input.max_salary) ? Number(input.max_salary) : fallback.max_salary;
  const orderedMin = Math.min(minSalary, maxSalary);
  const orderedMax = Math.max(minSalary, maxSalary);
  const medianSalary = Number.isFinite(input.median_salary)
    ? Number(input.median_salary)
    : Math.round((orderedMin + orderedMax) / 2);

  return {
    role: normalizeText(input.role || fallback.role),
    region: normalizeText(input.region || fallback.region),
    min_salary: orderedMin,
    max_salary: orderedMax,
    median_salary: medianSalary,
    currency: normalizeText(input.currency || fallback.currency) || fallback.currency,
    negotiation_tips: (input.negotiation_tips ?? []).map(normalizeText).filter(Boolean).slice(0, 3),
  };
}

async function aiInsight(jobTitle: string, location: string, jobDescription: string): Promise<SalaryInsight | null> {
  const fallback = fallbackInsight(jobTitle, location, jobDescription);
  const prompt = `You are a pragmatic compensation coach. Estimate a reasonable annual salary range for the role below. This is an AI estimate, not live market data, so keep it conservative and realistic.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"region":"...","min_salary":0,"max_salary":0,"median_salary":0,"currency":"USD","negotiation_tips":["...","...","..."]}

Rules:
- Use yearly compensation numbers.
- Keep min_salary <= median_salary <= max_salary.
- Give 2 or 3 concise negotiation tips tied to this role.
- If location is unclear, fall back to a global remote estimate.

Job title: ${jobTitle}
Location context: ${location || 'Unknown'}
Job description:
"""
${jobDescription.slice(0, 2400) || '(none provided)'}
"""`;

  const parsed = await requestDeepSeekJson<DeepSeekSalaryPayload>(prompt, {
    temperature: 0.35,
    timeoutMs: 25000,
  });

  if (!parsed) return null;

  return sanitizeInsight(
    {
      role: normalizeText(jobTitle) || fallback.role,
      region: normalizeText(parsed.region || fallback.region),
      min_salary: Number(parsed.min_salary),
      max_salary: Number(parsed.max_salary),
      median_salary: Number(parsed.median_salary),
      currency: normalizeText(parsed.currency || fallback.currency),
      negotiation_tips: Array.isArray(parsed.negotiation_tips) ? parsed.negotiation_tips : fallback.negotiation_tips,
    },
    fallback,
  );
}

export async function getSalaryInsight(
  jobTitle: string,
  location = '',
  jobDescription = '',
): Promise<SalaryInsight & { used_ai: boolean }> {
  const fallback = fallbackInsight(jobTitle, location, jobDescription);
  const ai = await aiInsight(jobTitle, location, jobDescription);
  const result = ai ?? fallback;
  return {
    ...result,
    used_ai: Boolean(ai),
    negotiation_tips: result.negotiation_tips.length > 0 ? result.negotiation_tips : fallback.negotiation_tips,
  };
}
