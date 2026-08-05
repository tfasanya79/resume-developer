import { useState } from "react";
import { X } from "lucide-react";
import { COMMON_SKILLS } from "../utils/commonSkills";

interface Props {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsEditor({ skills, onChange }: Props) {
  const [input, setInput] = useState("");

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s || skills.some((k) => k.toLowerCase() === s.toLowerCase())) return;
    onChange([...skills, s]);
    setInput("");
  };

  const suggestions = COMMON_SKILLS.filter(
    (s) =>
      input.length > 1 &&
      s.toLowerCase().includes(input.toLowerCase()) &&
      !skills.some((k) => k.toLowerCase() === s.toLowerCase()),
  ).slice(0, 6);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Skills</label>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span key={s} className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
            {s}
            <button onClick={() => onChange(skills.filter((k) => k !== s))} className="text-blue-600">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addSkill(input.replace(",", ""));
            }
          }}
          placeholder="Type a skill and press Enter"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
