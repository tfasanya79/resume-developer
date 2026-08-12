import { NextRequest, NextResponse } from "next/server";
import type { InterviewAnswerScore } from "@/types/cv";
import { scoreAnswerFallback } from "@/lib/interview";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function scoreWithDeepSeek(
  question: string,
  answer: string,
): Promise<InterviewAnswerScore | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an expert interview coach scoring a candidate's spoken interview answer. Score it 0-100 based on clarity, relevance, and use of the STAR method (Situation, Task, Action, Result) where applicable. Give constructive, specific feedback (2-3 sentences) and a short note on STAR completeness.

Return ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"score": 0, "feedback": "...", "star_completeness": "..."}

Question: ${question}

Answer: ${answer.slice(0, 3000)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
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
    const parsed: InterviewAnswerScore = JSON.parse(cleaned);
    if (typeof parsed.score !== "number") return null;
    return parsed;
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
    const question: string = body.question || "";
    const answer: string = body.answer || "";
    if (!question.trim() || !answer.trim()) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }

    let result = answer.trim().length >= 20 ? await scoreWithDeepSeek(question, answer) : null;
    let usedAi = true;
    if (!result) {
      result = scoreAnswerFallback(answer);
      usedAi = false;
    }

    return NextResponse.json({ ...result, used_ai: usedAi });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

