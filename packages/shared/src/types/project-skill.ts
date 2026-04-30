import type { CompanySkillSourceType, CompanySkillTrustLevel, CompanySkillCompatibility, CompanySkillFileInventoryEntry } from "./company-skill.js";

export interface ProjectSkill {
  id: string;
  projectId: string;
  companyId: string;
  key: string;
  slug: string;
  name: string;
  description: string | null;
  markdown: string;
  sourceType: CompanySkillSourceType;
  sourceLocator: string | null;
  sourceRef: string | null;
  trustLevel: CompanySkillTrustLevel;
  compatibility: CompanySkillCompatibility;
  fileInventory: CompanySkillFileInventoryEntry[];
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSkillListItem extends Omit<ProjectSkill, "markdown" | "metadata"> {
  sourceLabel: string | null;
  sourcePath: string | null;
}
