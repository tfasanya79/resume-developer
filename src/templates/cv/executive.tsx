import type { CvProfile } from "../../types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function ExecutiveTemplate({ profile }: TemplateProps) {
  const { personal, professional_title } = profile;

  return (
    <div className="bg-white p-10 text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <header className="border-b-4 border-gray-900 pb-4">
        <h1 className="text-4xl font-light tracking-wide">{personal.full_name || "Your Name"}</h1>
        {professional_title && <p className="mt-2 text-lg text-gray-600">{professional_title}</p>}
        <ContactHeader personal={personal} className="mt-2 text-sm text-gray-500" />
      </header>
      {personal.summary && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Executive Summary</h2>
          <p className="text-sm leading-relaxed">{personal.summary}</p>
        </section>
      )}
      <OrderedCvSections profile={profile} style="modern" accentClass="text-gray-900" />
    </div>
  );
}
