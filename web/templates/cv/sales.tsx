import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

export function SalesTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  return (
    <div className="bg-white p-8" style={{ minHeight: "297mm", width: "210mm" }}>
      <div className="rounded-lg bg-orange-500 p-6 text-white">
        <h1 className="text-3xl font-bold">{personal.full_name || "Your Name"}</h1>
        {professional_title && <p className="mt-1 text-orange-100">{professional_title}</p>}
        <ContactHeader
          personal={personal}
          className="mt-2 text-sm"
          includeLocation={false}
        />
      </div>
      {personal.summary && <p className="mt-4 text-sm font-medium text-gray-800">{personal.summary}</p>}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-orange-600" />
    </div>
  );
}
