import type { CvProfile } from "../../types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function ClassicSerifTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-amber-50 p-10 font-serif text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-3xl">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="italic text-gray-700">{professional_title}</p>}
      <ContactHeader personal={personal} className="mt-2 text-sm" />
      {personal.summary && <p className="mt-4 text-sm leading-relaxed">{personal.summary}</p>}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-amber-900" />
    </div>
  );
}
