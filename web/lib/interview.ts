import type { InterviewAnswerScore, InterviewQuestion } from "@/types/cv";

// Rule-based fallback question generator, used when the AI call is unavailable/fails.
// Ported from the original Tauri app's heuristic (src-tauri/src/nlp/rewrite.rs).
const BEHAVIORAL_BANK: InterviewQuestion[] = [
  {
    question: "Tell me about a time you had to meet a tight deadline. What did you do?",
    category: "behavioral",
    tip: "Use the STAR method: Situation, Task, Action, Result. Quantify the outcome.",
  },
  {
    question: "Describe a conflict you had with a coworker and how you resolved it.",
    category: "behavioral",
    tip: "Focus on your communication approach and the resolution, not blame.",
  },
  {
    question: "Tell me about a mistake you made at work and what you learned from it.",
    category: "behavioral",
    tip: "Own the mistake honestly, then pivot quickly to the lesson and how you apply it now.",
  },
  {
    question: "Describe a time you had to learn a new skill quickly to complete a project.",
    category: "behavioral",
    tip: "Show your learning process, not just the end result.",
  },
  {
    question: "Why do you want to work here, and why this role?",
    category: "behavioral",
    tip: "Reference something specific about the company/role, not a generic answer.",
  },
];

function technicalQuestionsFromSkills(skills: string[]): InterviewQuestion[] {
  const picked = skills.slice(0, 3);
  return picked.map((skill) => ({
    question: `Walk me through a project where you used ${skill}. What challenges did you face?`,
    category: "technical",
    tip: `Be specific about your individual contribution with ${skill}, and quantify impact if possible.`,
  }));
}

export function generateQuestionsFallback(skills: string[], keywords: string[]): InterviewQuestion[] {
  const relevantSkills = skills.filter((s) =>
    keywords.some((k) => k.toLowerCase() === s.toLowerCase()),
  );
  const techSkills = relevantSkills.length > 0 ? relevantSkills : skills;
  const technical = technicalQuestionsFromSkills(techSkills);
  const behavioral = BEHAVIORAL_BANK.slice(0, 6 - technical.length);
  return [...technical, ...behavioral].slice(0, 6);
}

export function scoreAnswerFallback(answer: string): InterviewAnswerScore {
  const trimmed = answer.trim();
  if (trimmed.length < 20) {
    return {
      score: 30,
      feedback: "Answer is too brief. Expand with a concrete example.",
      star_completeness: "Missing Situation, Task, Action, and Result.",
    };
  }
  const hasNumbers = /\d/.test(trimmed);
  const wordCount = trimmed.split(/\s+/).length;
  const score = Math.min(85, 40 + wordCount * 2 + (hasNumbers ? 15 : 0));
  return {
    score,
    feedback: hasNumbers
      ? "Good use of concrete detail. Make sure the result is clearly stated."
      : "Good start. Add specific metrics and a clearer result statement.",
    star_completeness:
      wordCount > 80 ? "Partial STAR — strengthen the Result." : "Expand with Situation and Task context.",
  };
}

