"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormField } from "./FormField";
import type { CvDesign, LinkItem, PersonalInfo } from "@/types/cv";
import { newId, suggestLabelFromUrl } from "@/types/cv";

interface Props {
  data: PersonalInfo;
  professionalTitle: string;
  design?: CvDesign;
  onChange: (data: PersonalInfo) => void;
  onTitleChange: (title: string) => void;
  onDesignChange?: (design: CvDesign) => void;
}

export function PersonalInfoForm({
  data,
  professionalTitle,
  design,
  onChange,
  onTitleChange,
  onDesignChange,
}: Props) {
  const update = (field: keyof PersonalInfo, value: string) =>
    onChange({ ...data, [field]: value });

  const links = data.links ?? [];

  const updateLinks = (next: LinkItem[]) => onChange({ ...data, links: next });

  const updateLink = (index: number, item: LinkItem) => {
    const next = [...links];
    next[index] = item;
    updateLinks(next);
  };

  const addLink = () => updateLinks([...links, { id: newId(), label: "", url: "" }]);

  const d = design ?? { accent_color: "#2563eb", font_pair: "system", photo_path: "" };

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onDesignChange) return;
    const reader = new FileReader();
    reader.onload = () => {
      onDesignChange({ ...d, photo_path: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField
          label="Professional Title"
          value={professionalTitle}
          onChange={onTitleChange}
          placeholder="e.g. Cybersecurity Consultant | Network Technician"
        />
      </div>
      <FormField label="Full Name" value={data.full_name} onChange={(v) => update("full_name", v)} />
      <FormField label="Email" value={data.email} onChange={(v) => update("email", v)} type="email" />
      <FormField label="Phone" value={data.phone} onChange={(v) => update("phone", v)} />
      <FormField label="Location" value={data.location} onChange={(v) => update("location", v)} />

      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Links</span>
          <button type="button" onClick={addLink} className="flex items-center gap-1 text-sm text-blue-600">
            <Plus size={14} /> Add link
          </button>
        </div>
        <div className="space-y-3">
          {links.length === 0 && (
            <p className="text-sm text-gray-500">
              Add LinkedIn, Credly, GitHub, portfolio, or any other profile links.
            </p>
          )}
          {links.map((link, i) => (
            <div
              key={link.id}
              className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_2fr_auto] dark:border-gray-700"
            >
              <FormField
                label="Link name"
                value={link.label}
                onChange={(v) => updateLink(i, { ...link, label: v })}
                placeholder="LinkedIn"
              />
              <FormField
                label="Link URI"
                value={link.url}
                onChange={(v) => {
                  const next: LinkItem = { ...link, url: v };
                  if (!link.label.trim() && v.trim()) {
                    next.label = suggestLabelFromUrl(v);
                  }
                  updateLink(i, next);
                }}
                placeholder="linkedin.com/in/yourname"
              />
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => updateLinks(links.filter((_, idx) => idx !== i))}
                  className="rounded p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Remove link"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onDesignChange && (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Accent Color</span>
            <input
              type="color"
              value={d.accent_color || "#2563eb"}
              onChange={(e) => onDesignChange({ ...d, accent_color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600"
            />
          </label>
          <div>
            <span className="text-sm font-medium">Photo (optional)</span>
            <label className="mt-1 block cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-2 text-center text-sm dark:border-gray-600">
              {d.photo_path ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
            </label>
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <FormField
          label="Professional Summary"
          value={data.summary}
          onChange={(v) => update("summary", v)}
          multiline
          placeholder="Brief overview of your experience and goals..."
        />
      </div>
    </div>
  );
}
