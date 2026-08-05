import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCvStore } from "../state/useCvStore";
import type { InterviewAnswerScore, InterviewSession } from "../types/cv";

export function InterviewCoachPage() {
  const { profile } = useCvStore();
  const [jobText, setJobText] = useState("");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<number, InterviewAnswerScore>>({});
  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);

  useEffect(() => {
    invoke<InterviewSession[]>("list_interview_sessions").then(setPastSessions).catch(() => {});
  }, []);

  const start = async () => {
    if (!profile.id) return;
    const res = await invoke<InterviewSession>("generate_interview_questions", {
      cvId: profile.id,
      jobText,
    });
    setSession(res);
    setNotes("");
    setAnswers({});
    setScores({});
    invoke<InterviewSession[]>("list_interview_sessions").then(setPastSessions).catch(() => {});
  };

  const scoreAnswer = async (index: number) => {
    const answer = answers[index];
    if (!session || !answer?.trim()) return;
    const q = session.questions[index];
    const res = await invoke<InterviewAnswerScore>("score_interview_answer_cmd", {
      question: q.question,
      answer,
    });
    setScores((prev) => ({ ...prev, [index]: res }));
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Interview Coach</h2>
      <textarea
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
        placeholder="Paste job description for targeted questions..."
        rows={5}
        className="w-full rounded-lg border border-gray-300 p-4 text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <button onClick={start} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
        Start Mock Interview
      </button>

      {pastSessions.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {pastSessions.length} past session(s) saved locally
        </div>
      )}

      {session && (
        <div className="mt-6 space-y-4">
          {session.questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/50">{q.category}</span>
              <p className="mt-2 font-medium">{q.question}</p>
              <p className="mt-1 text-sm text-gray-500">Tip: {q.tip}</p>
              <textarea
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                placeholder="Your answer..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <button onClick={() => scoreAnswer(i)} className="mt-2 text-sm text-blue-600 hover:underline">
                Get feedback
              </button>
              {scores[i] && (
                <div className="mt-2 rounded bg-gray-50 p-2 text-sm dark:bg-gray-800">
                  <p className="font-medium">Score: {scores[i].score.toFixed(0)}/100</p>
                  <p>{scores[i].feedback}</p>
                  <p className="text-xs text-gray-500">{scores[i].star_completeness}</p>
                </div>
              )}
            </div>
          ))}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Your interview notes..."
            rows={5}
            className="w-full rounded-lg border border-gray-300 p-4 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
      )}
    </div>
  );
}
