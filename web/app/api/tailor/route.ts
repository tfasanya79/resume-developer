import { NextRequest, NextResponse } from "next/server";
import type { CvProfile, ExperienceItem, TailorProposal } from "@/types/cv";
import { extractKeywords } from "@/lib/ats";
import { diffProfiles, extractJobMetadata, tailorCvFallback } from "@/lib/tailor";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DeepSeekBulletUpdate {
  id: string;
  bullets: string[];
}

interface DeepSeekTailorResult {
  experience?: DeepSeekBulletUpdate[];
  summary?: string;
  skills_to_add?: string[];
}

async function tailorWithDeepSeek(
  profile: CvProfile,
  jobText: string,
): Promise<CvProfile | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const experienceForPrompt = profile.experience.map((e) => ({
    id: e.id,
    title: e.title,
    company: e.company,
    bullets: e.bullets,
  }));

  const prompt = `You are an expert resume writer. Given a job description and a candidate's current experience bullets, rewrite the bullets to better match the job (use relevant keywords naturally, keep them truthful to the original achievement, action-verb led, one sentence each, under 220 characters). Also suggest a short professional summary tailored to the role, and up to 5 additional skills present in the job description but missing from the candidate.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"experience":[{"id":"<same id as input>","bullets":["rewritten bullet", "..."]}],"summary":"tailored 2-3 sentence summary","skills_to_add":["skill1","skill2"]}

Job description:
"""
${jobText.slice(0, 4000)}
"""

Candidate experience (JSON):
${JSON.stringify(experienceForPrompt).slice(0, 6000)}`;

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
        temperature: 0.4,
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
    const parsed: DeepSeekTailorResult = JSON.parse(cleaned);

    const tailored: CvProfile = JSON.parse(JSON.stringify(profile));
    tailored.id = "";
    tailored.name = `${profile.name} (Tailored)`;

    if (Array.isArray(parsed.experience)) {
      for (const upd of parsed.experience) {
        const exp = tailored.experience.find((e: ExperienceItem) => e.id === upd.id);
        if (exp && Array.isArray(upd.bullets) && upd.bullets.length > 0) {
          exp.bullets = upd.bullets;
        }
      }
    }
    if (typeof parsed.summary === "string" && parsed.summary.trim()) {
      tailored.personal.summary = parsed.summary.trim();
    }
    if (Array.isArray(parsed.skills_to_add) && parsed.skills_to_add.length > 0) {
      const existing = new Set(tailored.skills.map((s) => s.toLowerCase()));
      const extra = parsed.skills_to_add.filter((s) => s && !existing.has(s.toLowerCase()));
      tailored.skills = [...tailored.skills, ...extra];
    }
    return tailored;
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
    if (!profile || !jobText.trim()) {
      return NextResponse.json({ error: "profile and jobDescription are required" }, { status: 400 });
    }

    const { company, role } = extractJobMetadata(jobText);
    const keywords = extractKeywords(jobText);

    let tailored = await tailorWithDeepSeek(profile, jobText);
    let usedAi = true;
    if (!tailored) {
      tailored = tailorCvFallback(profile, keywords);
      usedAi = false;
    }

    const changes = diffProfiles(profile, tailored, keywords);
    const proposal: TailorProposal = { changes, used_ai: usedAi, company, role };
    return NextResponse.json(proposal);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
