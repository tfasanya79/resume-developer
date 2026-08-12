import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function HealthcareTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-white p-8 text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <header className="border-b-2 border-teal-600 pb-4">
        <h1 className="text-3xl font-bold text-teal-800">{personal.full_name || "Your Name"}</h1>
        {professional_title && <p className="text-sm text-teal-700">{professional_title}</p>}
        <ContactHeader personal={personal} className="mt-1 text-sm text-gray-600" />
      </header>
      {personal.summary && <p className="mt-4 text-sm">{personal.summary}</p>}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-teal-700" />
    </div>
  );
}
