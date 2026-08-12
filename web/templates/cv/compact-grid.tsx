import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { CvSectionBlock, getOrderedContentSections } from "./sections";

export function CompactGridTemplate({ profile }: { profile: CvProfile; printMode?: boolean }) {
  const { personal, professional_title } = profile;
  const sections = getOrderedContentSections(profile);
  const left = sections.filter((_, i) => i % 2 === 0);
  const right = sections.filter((_, i) => i % 2 === 1);

  return (
    <div className="bg-white p-6 text-xs text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-xl font-bold">{personal.full_name || "Your Name"}</h1>
      {professional_title && <p className="text-gray-600">{professional_title}</p>}
      <ContactHeader
        personal={personal}
        className="text-gray-500"
        includeLocation={false}
      />
      {personal.summary && <p className="mt-2">{personal.summary}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          {left.map((id) => (
            <CvSectionBlock key={id} profile={profile} sectionId={id} style="compact" accentClass="text-gray-800" />
          ))}
        </div>
        <div>
          {right.map((id) => (
            <CvSectionBlock key={id} profile={profile} sectionId={id} style="compact" accentClass="text-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
