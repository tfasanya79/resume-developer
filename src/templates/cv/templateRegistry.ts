import type { CvProfile } from "../../types/cv";
import { ModernProfessionalTemplate } from "./modern-professional";
import { AtsOptimizedTemplate } from "./ats-optimized";
import { MinimalistTemplate } from "./minimalist";
import { CreativeTemplate } from "./creative";
import { ExecutiveTemplate } from "./executive";
import { OnePageTemplate } from "./one-page";
import { TechFocusTemplate } from "./tech-focus";
import { AcademicTemplate } from "./academic";
import { HealthcareTemplate } from "./healthcare";
import { SalesTemplate } from "./sales";
import { StartupTemplate } from "./startup";
import { ClassicSerifTemplate } from "./classic-serif";
import { BoldModernTemplate } from "./bold-modern";
import { CompactGridTemplate } from "./compact-grid";

export type CvTemplateComponent = React.FC<{ profile: CvProfile; printMode?: boolean }>;

export const TEMPLATE_REGISTRY: Record<string, CvTemplateComponent> = {
  "modern-professional": ModernProfessionalTemplate,
  "ats-optimized": AtsOptimizedTemplate,
  minimalist: MinimalistTemplate,
  creative: CreativeTemplate,
  executive: ExecutiveTemplate,
  "one-page": OnePageTemplate,
  "tech-focus": TechFocusTemplate,
  academic: AcademicTemplate,
  healthcare: HealthcareTemplate,
  sales: SalesTemplate,
  startup: StartupTemplate,
  "classic-serif": ClassicSerifTemplate,
  "bold-modern": BoldModernTemplate,
  "compact-grid": CompactGridTemplate,
};

export function getTemplateComponent(templateId: string): CvTemplateComponent {
  return TEMPLATE_REGISTRY[templateId] ?? ModernProfessionalTemplate;
}
