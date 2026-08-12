import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function AcademicTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-white p-10 font-serif text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-center text-2xl font-bold">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="text-center text-sm italic">{professional_title}</p>}
      <ContactHeader personal={personal} className="mt-2 text-center text-xs" align="center" />
      {personal.summary && (
        <p className="mx-auto mt-6 max-w-prose text-justify text-sm leading-relaxed">{personal.summary}</p>
      )}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-gray-800" />
    </div>
  );
}
