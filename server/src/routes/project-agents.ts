import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createProjectAgentAssignmentSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectAgentAssignmentService } from "../services/project-agent-assignments.js";
import { logActivity } from "../services/index.js";
import { assertCompanyAccess, assertProjectAccess, assertProjectOwner, getActorInfo } from "./authz.js";
import { notFound } from "../errors.js";
import { agents, projects } from "@paperclipai/db";
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

async function resolveAgent(db: Db, companyId: string, agentId: string) {
  const agent = await db
    .select({ id: agents.id, companyId: agents.companyId })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)))
    .then((rows) => rows[0] ?? null);
  if (!agent) throw notFound("Agent not found in this company");
  return agent;
}

export function projectAgentRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = projectAgentAssignmentService(db);

  router.get(
    "/companies/:companyId/projects/:projectId/agents",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectAccess(req, projectId, db);
      const assignments = await svc.listByProject(projectId);
      res.json(assignments);
    },
  );

  router.post(
    "/companies/:companyId/projects/:projectId/agents",
    validate(createProjectAgentAssignmentSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      const { agentId } = createProjectAgentAssignmentSchema.parse(req.body);
      await resolveAgent(db, companyId, agentId);
      const assignment = await svc.assign(projectId, companyId, agentId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_agent.assign",
        entityType: "project",
        entityId: projectId,
        details: { agentId },
      });
      res.status(201).json(assignment);
    },
  );

  router.delete(
    "/companies/:companyId/projects/:projectId/agents/:agentId",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const projectId = req.params.projectId as string;
      const agentId = req.params.agentId as string;
      assertCompanyAccess(req, companyId);
      await resolveProject(db, companyId, projectId);
      await assertProjectOwner(req, projectId, db);
      await svc.unassign(projectId, agentId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "project_agent.unassign",
        entityType: "project",
        entityId: projectId,
        details: { agentId },
      });
      res.status(204).end();
    },
  );

  return router;
}
