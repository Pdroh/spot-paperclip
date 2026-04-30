import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectSkills } from "@paperclipai/db";
import type { ProjectSkill, ProjectSkillListItem } from "@paperclipai/shared";
import type { CreateProjectSkill, UpdateProjectSkill } from "@paperclipai/shared";
import { notFound } from "../errors.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ProjectSkillRow = typeof projectSkills.$inferSelect;

function rowToProjectSkill(row: ProjectSkillRow): ProjectSkill {
  return {
    ...row,
    sourceType: row.sourceType as ProjectSkill["sourceType"],
    trustLevel: row.trustLevel as ProjectSkill["trustLevel"],
    compatibility: row.compatibility as ProjectSkill["compatibility"],
    fileInventory: (row.fileInventory ?? []) as unknown as ProjectSkill["fileInventory"],
    metadata: row.metadata ?? null,
  };
}

function rowToListItem(row: Omit<ProjectSkillRow, "markdown" | "metadata">): ProjectSkillListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    companyId: row.companyId,
    key: row.key,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    sourceType: row.sourceType as ProjectSkillListItem["sourceType"],
    sourceLocator: row.sourceLocator ?? null,
    sourceRef: row.sourceRef ?? null,
    trustLevel: row.trustLevel as ProjectSkillListItem["trustLevel"],
    compatibility: row.compatibility as ProjectSkillListItem["compatibility"],
    fileInventory: (row.fileInventory ?? []) as unknown as ProjectSkillListItem["fileInventory"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sourceLabel: row.sourceLocator ?? null,
    sourcePath: row.sourceType === "local_path" ? (row.sourceLocator ?? null) : null,
  };
}

export function projectSkillService(db: Db) {
  async function list(projectId: string): Promise<ProjectSkillListItem[]> {
    const rows = await db
      .select({
        id: projectSkills.id,
        projectId: projectSkills.projectId,
        companyId: projectSkills.companyId,
        key: projectSkills.key,
        slug: projectSkills.slug,
        name: projectSkills.name,
        description: projectSkills.description,
        sourceType: projectSkills.sourceType,
        sourceLocator: projectSkills.sourceLocator,
        sourceRef: projectSkills.sourceRef,
        trustLevel: projectSkills.trustLevel,
        compatibility: projectSkills.compatibility,
        fileInventory: projectSkills.fileInventory,
        createdAt: projectSkills.createdAt,
        updatedAt: projectSkills.updatedAt,
      })
      .from(projectSkills)
      .where(eq(projectSkills.projectId, projectId));

    return rows.map(rowToListItem);
  }

  async function getById(projectId: string, skillId: string): Promise<ProjectSkill | null> {
    const row = await db
      .select()
      .from(projectSkills)
      .where(
        and(eq(projectSkills.projectId, projectId), eq(projectSkills.id, skillId)),
      )
      .then((rows) => rows[0] ?? null);

    return row ? rowToProjectSkill(row) : null;
  }

  async function create(projectId: string, companyId: string, input: CreateProjectSkill): Promise<ProjectSkill> {
    const slug = slugify(input.name);
    const created = await db
      .insert(projectSkills)
      .values({
        projectId,
        companyId,
        key: input.key,
        slug,
        name: input.name,
        description: input.description ?? null,
        markdown: input.markdown,
        sourceType: input.sourceType ?? "local_path",
        sourceLocator: input.sourceLocator ?? null,
        trustLevel: input.trustLevel ?? "markdown_only",
      })
      .returning()
      .then((rows) => rows[0]!);

    return rowToProjectSkill(created);
  }

  async function update(projectId: string, skillId: string, patch: UpdateProjectSkill): Promise<ProjectSkill> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) {
      updates.name = patch.name;
      updates.slug = slugify(patch.name);
    }
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.markdown !== undefined) updates.markdown = patch.markdown;
    if (patch.sourceType !== undefined) updates.sourceType = patch.sourceType;
    if (patch.sourceLocator !== undefined) updates.sourceLocator = patch.sourceLocator;
    if (patch.trustLevel !== undefined) updates.trustLevel = patch.trustLevel;

    const updated = await db
      .update(projectSkills)
      .set(updates)
      .where(
        and(eq(projectSkills.projectId, projectId), eq(projectSkills.id, skillId)),
      )
      .returning()
      .then((rows) => rows[0] ?? null);

    if (!updated) throw notFound("Project skill not found");
    return rowToProjectSkill(updated);
  }

  async function remove(projectId: string, skillId: string): Promise<void> {
    const result = await db
      .delete(projectSkills)
      .where(
        and(eq(projectSkills.projectId, projectId), eq(projectSkills.id, skillId)),
      )
      .returning({ id: projectSkills.id });

    if (result.length === 0) throw notFound("Project skill not found");
  }

  /** Returns skill keys from both company and project levels for a given project. */
  async function getProjectSkillKeys(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ key: projectSkills.key })
      .from(projectSkills)
      .where(eq(projectSkills.projectId, projectId));
    return rows.map((r) => r.key);
  }

  return { list, getById, create, update, remove, getProjectSkillKeys };
}
