import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function StartupTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-gradient-to-br from-violet-50 to-white p-8" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-3xl font-extrabold text-violet-900">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="text-violet-700">{professional_title}</p>}
      <ContactHeader personal={personal} className="mt-2 text-sm text-gray-600" />
      {personal.summary && <p className="mt-4 rounded-lg bg-white/80 p-3 text-sm shadow-sm">{personal.summary}</p>}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-violet-700" />
    </div>
  );
}
