import type { CvProfile } from "../../types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function BoldModernTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title, design } = profile;
  const accent = design?.accent_color || "#dc2626";
  return (
    <div className="bg-white p-8" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: accent }}>
        {personal.full_name || "Your Name"}
      </h1>
      {professional_title && <p className="mt-2 text-lg font-semibold">{professional_title}</p>}
      <ContactHeader personal={personal} className="mt-2 text-sm text-gray-600" />
      {personal.summary && <p className="mt-4 border-l-4 pl-4 text-sm" style={{ borderColor: accent }}>{personal.summary}</p>}
      <OrderedCvSections profile={profile} style="modern" accentClass="" />
    </div>
  );
}
