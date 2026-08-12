import { NextRequest, NextResponse } from "next/server";
import type { CvProfile, InterviewQuestion } from "@/types/cv";
import { extractKeywords } from "@/lib/ats";
import { generateQuestionsFallback } from "@/lib/interview";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function generateWithDeepSeek(
  profile: CvProfile,
  jobText: string,
): Promise<InterviewQuestion[] | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const summary = {
    title: profile.professional_title,
    skills: profile.skills,
    experience: profile.experience.map((e) => ({ title: e.title, company: e.company, bullets: e.bullets })),
  };

  const prompt = `You are an expert interview coach. Based on the candidate's background and the job description below, generate exactly 6 likely interview questions: a mix of behavioral and technical/role-specific questions relevant to this job.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"questions":[{"question":"...","category":"behavioral|technical","tip":"short prep tip for this question"}]}

Job description:
"""
${jobText.slice(0, 4000)}
"""

Candidate background (JSON):
${JSON.stringify(summary).slice(0, 4000)}`;

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
        temperature: 0.5,
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
    const parsed: { questions?: InterviewQuestion[] } = JSON.parse(cleaned);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    return parsed.questions.slice(0, 8);
  } catch {
    return null;
  }
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
    const profile: CvProfile = body.profile;
    const jobText: string = body.jobDescription || "";
    if (!profile) {
      return NextResponse.json({ error: "profile is required" }, { status: 400 });
    }

    let questions = jobText.trim() ? await generateWithDeepSeek(profile, jobText) : null;
    let usedAi = true;
    if (!questions) {
      const keywords = jobText.trim() ? extractKeywords(jobText) : [];
      questions = generateQuestionsFallback(profile.skills, keywords);
      usedAi = false;
    }

    return NextResponse.json({ questions, used_ai: usedAi });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

