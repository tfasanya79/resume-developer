import { NextRequest, NextResponse } from "next/server";
import type { LinkedInOptimization } from "@/types/cv";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function generateWithDeepSeek(
  headline: string,
  summary: string,
  experienceText: string,
  skills: string[],
): Promise<LinkedInOptimization | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an expert LinkedIn profile writer and career coach. Rewrite and improve the following LinkedIn profile content to be more compelling, keyword-rich, and recruiter-friendly, while staying truthful to the facts provided (do not invent employers, titles, or achievements not implied by the input).

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"headline":"...","summary":"...","experience_suggestions":["...","..."],"skills_suggestions":["...","..."],"improvements":["...","..."]}

Rules:
- "headline": a single punchy LinkedIn headline (under 220 characters), keyword-rich, not generic.
- "summary": a rewritten "About" section (3-6 short paragraphs or a strong single one), written in first person, highlighting value proposition and impact.
- "experience_suggestions": rewrite each non-empty input experience line into a stronger, quantifiable bullet point starting with an action verb (keep the same number of lines as meaningful input lines, max 8).
- "skills_suggestions": 5-10 relevant LinkedIn skill tags to add based on the content (only include skills not already obviously present).
- "improvements": 4-6 short, specific, actionable general tips for improving this profile further (not generic filler).

Current headline:
"""
${headline || "(none provided)"}
"""

Current About/summary:
"""
${summary || "(none provided)"}
"""

Current experience bullets (one per line):
"""
${experienceText || "(none provided)"}
"""

Current listed skills: ${skills.length ? skills.join(", ") : "(none provided)"}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const raw: string | undefined = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed: LinkedInOptimization = JSON.parse(cleaned);
    if (!parsed.headline || !parsed.summary) return null;
    return {
      headline: parsed.headline,
      summary: parsed.summary,
      experience_suggestions: Array.isArray(parsed.experience_suggestions) ? parsed.experience_suggestions.slice(0, 8) : [],
      skills_suggestions: Array.isArray(parsed.skills_suggestions) ? parsed.skills_suggestions.slice(0, 10) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

function fallbackOptimize(
  headline: string,
  summary: string,
  experienceText: string,
  skills: string[],
): LinkedInOptimization {
  const improvements = [
    "Add quantifiable achievements (%, $, time saved) to your headline and About section.",
    "Lead your About section with your unique value proposition, not your job title.",
    "Start every experience bullet with a strong action verb (Led, Built, Drove, Reduced).",
    "List 10+ relevant skills so recruiters can find you in search.",
    "Add a custom banner image and a professional headshot if you haven't already.",
  ];

  const headlineSuggestion =
    headline.trim().length < 40
      ? `${headline.trim() || "Professional"} | Driving measurable results through expertise & leadership`
      : headline.trim();

  const summarySuggestion =
    summary.trim().length < 100
      ? `${summary.trim()}\n\nPassionate professional with a track record of delivering measurable impact. Open to connecting with like-minded professionals and new opportunities.`.trim()
      : summary.trim();

  const expSuggestions = experienceText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((l) => (/^(led|built|drove|reduced|increased|launched|managed|created|delivered|designed|improved)/i.test(l) ? l : `Improved: ${l}`));

  return {
    headline: headlineSuggestion,
    summary: summarySuggestion,
    experience_suggestions: expSuggestions,
    skills_suggestions: skills.length ? [] : ["Leadership", "Communication", "Project Management"],
    improvements,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const headline: string = body.headline || "";
    const summary: string = body.summary || "";
    const experienceText: string = body.experienceText || "";
    const skills: string[] = Array.isArray(body.skills) ? body.skills : [];

    if (!headline.trim() && !summary.trim() && !experienceText.trim()) {
      return NextResponse.json({ error: "Provide at least a headline, summary, or experience." }, { status: 400 });
    }

    let result = await generateWithDeepSeek(headline, summary, experienceText, skills);
    let usedAi = true;
    if (!result) {
      result = fallbackOptimize(headline, summary, experienceText, skills);
      usedAi = false;
    }

    return NextResponse.json({ result, used_ai: usedAi });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

