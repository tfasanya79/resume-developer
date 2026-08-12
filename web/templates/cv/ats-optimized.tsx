import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function AtsOptimizedTemplate({ profile, printMode }: TemplateProps) {
  const { personal, professional_title } = profile;

  return (
    <div
      className={`bg-white p-10 font-serif text-black ${printMode ? "" : "shadow-lg"}`}
      style={{ minHeight: "297mm", width: "210mm" }}
    >
      <h1 className="text-2xl font-bold">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="text-sm">{professional_title}</p>}
      <ContactHeader personal={personal} className="text-sm" separator="|" />
      {personal.summary && (
        <>
          <h2 className="mt-4 border-b border-black text-sm font-bold uppercase">Summary</h2>
          <p className="mt-1 text-sm">{personal.summary}</p>
        </>
      )}
      <OrderedCvSections profile={profile} style="ats" />
    </div>
  );
}
