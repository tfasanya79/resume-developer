import type { CvProfile } from "@/types/cv";
import { getTemplateComponent } from "@/templates/cv/templateRegistry";

interface Props {
  profile: CvProfile;
  printMode?: boolean;
}

export function CvPreview({ profile, printMode }: Props) {
  const Template = getTemplateComponent(profile.template);

  if (printMode) {
    return <Template profile={profile} printMode />;
  }

  return (
    <div className="flex justify-center overflow-auto bg-gray-200 p-4 dark:bg-gray-800">
      <div className="origin-top scale-[0.55] sm:scale-[0.65] lg:scale-75">
        <Template profile={profile} />
      </div>
    </div>
  );
}
