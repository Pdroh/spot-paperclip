import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createProjectMembershipSchema,
  updateProjectMembershipSchema,
  type ProjectMembershipRole,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectMembershipService } from "../services/project-memberships.js";
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

export function projectMemberRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = projectMembershipService(db);

  router.get(
    "/companies/:companyId/projects/:projectId/members",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectAccess(req, projectId, db);
      const members = await svc.list(projectId);
      res.json(members);
    },
  );

  router.post(
    "/companies/:companyId/projects/:projectId/members",
    validate(createProjectMembershipSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      const { userId, role } = createProjectMembershipSchema.parse(req.body);
      const membership = await svc.add(projectId, companyId, userId, role as ProjectMembershipRole);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_member.add",
        entityType: "project",
        entityId: projectId,
        details: { userId, role },
      });
      res.status(201).json(membership);
    },
  );

  router.patch(
    "/companies/:companyId/projects/:projectId/members/:userId",
    validate(updateProjectMembershipSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const userId = req.params.userId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      const { role } = updateProjectMembershipSchema.parse(req.body);
      const membership = await svc.update(projectId, userId, role as ProjectMembershipRole);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_member.update",
        entityType: "project",
        entityId: projectId,
        details: { userId, role },
      });
      res.json(membership);
    },
  );

  router.delete(
    "/companies/:companyId/projects/:projectId/members/:userId",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const userId = req.params.userId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      await svc.remove(projectId, userId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_member.remove",
        entityType: "project",
        entityId: projectId,
        details: { userId },
      });
      res.status(204).end();
    },
  );

  return router;
}
