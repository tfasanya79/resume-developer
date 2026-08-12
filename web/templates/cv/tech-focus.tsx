import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function TechFocusTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-slate-950 p-8 text-slate-100" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="font-mono text-3xl font-bold text-emerald-400">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="mt-1 font-mono text-sm text-emerald-300">{professional_title}</p>}
      <ContactHeader
        personal={personal}
        className="mt-2 font-mono text-xs text-slate-400"
        separator="//"
      />
      {personal.summary && <p className="mt-4 text-sm text-slate-300">{personal.summary}</p>}
      <div className="text-slate-200 [&_h2]:text-emerald-400 [&_h3]:text-white">
        <OrderedCvSections profile={profile} style="modern" accentClass="text-emerald-400" />
      </div>
    </div>
  );
}
