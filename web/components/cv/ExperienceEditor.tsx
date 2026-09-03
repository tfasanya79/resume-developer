"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { BulletRewriteResult, ExperienceItem } from "@/types/cv";
import { newId } from "@/types/cv";
import { withAppBasePath } from "@/lib/paths";

interface Props {
  items: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
  jobContext?: string;
}

type RewriteMode = "star" | "metrics";

interface SuggestionState extends BulletRewriteResult {
  error?: string;
}

export function ExperienceEditor({ items, onChange, jobContext }: Props) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestionState>>({});

  const add = () =>
    onChange([
      ...items,
      {
        id: newId(),
        company: "",
        title: "",
        location: "",
        start_date: "",
        end_date: "",
        current: false,
        bullets: [""],
      },
    ]);

  const update = (index: number, item: ExperienceItem) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const requestRewrite = async (item: ExperienceItem, expIndex: number, bulletIndex: number, mode: RewriteMode) => {
    const bullet = item.bullets[bulletIndex]?.trim() || "";
    if (!bullet) return;
    const key = `${item.id}:${bulletIndex}:${mode}`;
    setLoadingKey(key);
    try {
      const res = await fetch(withAppBasePath("/api/bullet-rewrite"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet,
          mode,
          context: {
            jobTitle: item.title,
            company: item.company,
            jobDescription: jobContext || "",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suggestion failed");
      setSuggestions((prev) => ({ ...prev, [key]: data }));
    } catch (error) {
      setSuggestions((prev) => ({
        ...prev,
        [key]: {
          original: bullet,
          rewritten: "",
          used_ai: false,
          mode,
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  const acceptSuggestion = (item: ExperienceItem, expIndex: number, bulletIndex: number, mode: RewriteMode) => {
    const key = `${item.id}:${bulletIndex}:${mode}`;
    const suggestion = suggestions[key];
    if (!suggestion?.rewritten) return;
    const bullets = [...item.bullets];
    bullets[bulletIndex] = suggestion.rewritten;
    update(expIndex, { ...item, bullets });
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const dismissSuggestion = (itemId: string, bulletIndex: number, mode: RewriteMode) => {
    const key = `${itemId}:${bulletIndex}:${mode}`;
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium">Experience {i + 1}</h4>
            <button onClick={() => remove(i)} className="text-red-500 hover:text-red-700">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Job Title" value={item.title} onChange={(v) => update(i, { ...item, title: v })} />
            <FormField label="Company" value={item.company} onChange={(v) => update(i, { ...item, company: v })} />
            <FormField label="Start Date" value={item.start_date} onChange={(v) => update(i, { ...item, start_date: v })} placeholder="Jan 2020" />
            <FormField label="End Date" value={item.end_date} onChange={(v) => update(i, { ...item, end_date: v })} placeholder="Present" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={item.current} onChange={(e) => update(i, { ...item, current: e.target.checked })} />
            Currently working here
          </label>
          <div className="mt-3 space-y-2">
            <span className="text-sm font-medium">Bullet Points</span>
            {item.bullets.map((bullet, bi) => {
              const starKey = `${item.id}:${bi}:star`;
              const metricsKey = `${item.id}:${bi}:metrics`;
              const starSuggestion = suggestions[starKey];
              const metricsSuggestion = suggestions[metricsKey];

              return (
                <div key={bi} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      value={bullet}
                      onChange={(e) => {
                        const bullets = [...item.bullets];
                        bullets[bi] = e.target.value;
                        update(i, { ...item, bullets });
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                      placeholder="Achievement or responsibility..."
                    />
                    <button
                      onClick={() => {
                        const bullets = item.bullets.filter((_, idx) => idx !== bi);
                        update(i, { ...item, bullets: bullets.length ? bullets : [""] });
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void requestRewrite(item, i, bi, "star")}
                      disabled={!bullet.trim() || loadingKey === starKey}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-300 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20"
                    >
                      <Sparkles size={12} /> {loadingKey === starKey ? "Writing..." : "STAR rewrite"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestRewrite(item, i, bi, "metrics")}
                      disabled={!bullet.trim() || loadingKey === metricsKey}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                    >
                      <Sparkles size={12} /> {loadingKey === metricsKey ? "Writing..." : "Add metrics"}
                    </button>
                  </div>

                  {[starSuggestion, metricsSuggestion].filter(Boolean).map((suggestion) => (
                    <div
                      key={`${item.id}:${bi}:${suggestion?.mode}`}
                      className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/60"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {suggestion?.mode === "star" ? "STAR suggestion" : "Metrics suggestion"}
                        {suggestion?.used_ai ? " , AI" : " , fallback"}
                      </p>
                      {suggestion?.error ? (
                        <p className="mt-1 text-red-600 dark:text-red-300">{suggestion.error}</p>
                      ) : (
                        <>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Current</p>
                          <p className="mt-1 text-gray-600 dark:text-gray-300">{suggestion?.original}</p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Suggested</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">{suggestion?.rewritten}</p>
                          {suggestion?.note && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{suggestion.note}</p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => acceptSuggestion(item, i, bi, suggestion.mode)}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Replace bullet
                            </button>
                            <button
                              type="button"
                              onClick={() => dismissSuggestion(item.id, bi, suggestion.mode)}
                              className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                            >
                              Dismiss
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <button onClick={() => update(i, { ...item, bullets: [...item.bullets, ""] })} className="text-sm text-blue-600 hover:underline">
              + Add bullet
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600">
        <Plus size={16} /> Add Experience
      </button>
    </div>
  );
}
