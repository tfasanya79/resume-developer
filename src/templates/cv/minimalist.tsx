import type { CvProfile } from "../../types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function MinimalistTemplate({ profile, printMode }: TemplateProps) {
  const { personal, professional_title } = profile;

  return (
    <div
      className={`bg-white p-12 text-gray-800 ${printMode ? "" : "shadow-lg"}`}
      style={{ minHeight: "297mm", width: "210mm" }}
    >
      <h1 className="text-4xl font-light tracking-tight">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="mt-1 text-sm text-gray-600">{professional_title}</p>}
      <ContactHeader personal={personal} className="mt-2 text-sm text-gray-500" />
      {personal.summary && <p className="mt-4 text-sm leading-relaxed">{personal.summary}</p>}
      <hr className="my-6 border-gray-200" />
      <OrderedCvSections profile={profile} style="modern" accentClass="text-gray-800" />
    </div>
  );
}
