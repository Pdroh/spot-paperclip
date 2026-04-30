import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createProjectSkillSchema, updateProjectSkillSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectSkillService } from "../services/project-skills.js";
import { logActivity } from "../services/index.js";
import { assertCompanyAccess, assertProjectAccess, assertProjectOwner, getActorInfo } from "./authz.js";
import { notFound } from "../errors.js";
import { projects } from "@paperclipai/db";
import { and, eq } from "drizzle-orm";

async function resolveProject(db: Db, companyId: string, projectId: string) {
  const project = await db
    .select({ id: projects.id, companyId: projects.companyId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
    .then((rows) => rows[0] ?? null);
  if (!project) throw notFound("Project not found");
  return project;
}

export function projectSkillRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = projectSkillService(db);

  router.get(
    "/companies/:companyId/projects/:projectId/skills",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectAccess(req, projectId, db);
      const skills = await svc.list(projectId);
      res.json(skills);
    },
  );

  router.get(
    "/companies/:companyId/projects/:projectId/skills/:skillId",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const skillId = req.params.skillId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectAccess(req, projectId, db);
      const skill = await svc.getById(projectId, skillId);
      if (!skill) throw notFound("Project skill not found");
      res.json(skill);
    },
  );

  router.post(
    "/companies/:companyId/projects/:projectId/skills",
    validate(createProjectSkillSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      const input = createProjectSkillSchema.parse(req.body);
      const skill = await svc.create(projectId, companyId, input);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_skill.create",
        entityType: "project",
        entityId: projectId,
        details: { skillId: skill.id, key: skill.key },
      });
      res.status(201).json(skill);
    },
  );

  router.patch(
    "/companies/:companyId/projects/:projectId/skills/:skillId",
    validate(updateProjectSkillSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const skillId = req.params.skillId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      const patch = updateProjectSkillSchema.parse(req.body);
      const skill = await svc.update(projectId, skillId, patch);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_skill.update",
        entityType: "project",
        entityId: projectId,
        details: { skillId },
      });
      res.json(skill);
    },
  );

  router.delete(
    "/companies/:companyId/projects/:projectId/skills/:skillId",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const skillId = req.params.skillId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      await svc.remove(projectId, skillId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_skill.delete",
        entityType: "project",
        entityId: projectId,
        details: { skillId },
      });
      res.status(204).end();
    },
  );

  return router;
}
