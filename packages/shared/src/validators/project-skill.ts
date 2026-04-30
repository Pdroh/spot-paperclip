import { z } from "zod";
import {
  companySkillSourceTypeSchema,
  companySkillTrustLevelSchema,
  companySkillCompatibilitySchema,
  companySkillFileInventoryEntrySchema,
} from "./company-skill.js";

export const projectSkillSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  key: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  markdown: z.string(),
  sourceType: companySkillSourceTypeSchema,
  sourceLocator: z.string().nullable(),
  sourceRef: z.string().nullable(),
  trustLevel: companySkillTrustLevelSchema,
  compatibility: companySkillCompatibilitySchema,
  fileInventory: z.array(companySkillFileInventoryEntrySchema).default([]),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const projectSkillListItemSchema = projectSkillSchema
  .omit({ markdown: true, metadata: true })
  .extend({
    sourceLabel: z.string().nullable(),
    sourcePath: z.string().nullable(),
  });

export const createProjectSkillSchema = z.object({
  key: z.string().min(1, "Skill key is required"),
  name: z.string().min(1, "Skill name is required"),
  description: z.string().nullable().optional(),
  markdown: z.string().min(1, "Skill markdown content is required"),
  sourceType: companySkillSourceTypeSchema.default("local_path"),
  sourceLocator: z.string().nullable().optional(),
  trustLevel: companySkillTrustLevelSchema.default("markdown_only"),
});

export const updateProjectSkillSchema = createProjectSkillSchema.partial();

export type CreateProjectSkill = z.infer<typeof createProjectSkillSchema>;
export type UpdateProjectSkill = z.infer<typeof updateProjectSkillSchema>;
