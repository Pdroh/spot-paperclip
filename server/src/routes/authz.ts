import type { Request } from "express";
import { forbidden, unauthorized } from "../errors.js";
import type { Db } from "@paperclipai/db";
import { projectMemberships } from "@paperclipai/db";
import { and, eq } from "drizzle-orm";

export function assertAuthenticated(req: Request) {
  if (req.actor.type === "none") {
    throw unauthorized();
  }
}

export function assertBoard(req: Request) {
  if (req.actor.type !== "board") {
    throw forbidden("Board access required");
  }
}

export function hasBoardOrgAccess(req: Request) {
  if (req.actor.type !== "board") {
    return false;
  }
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
    return true;
  }
  return Array.isArray(req.actor.companyIds) && req.actor.companyIds.length > 0;
}

export function assertBoardOrgAccess(req: Request) {
  assertBoard(req);
  if (hasBoardOrgAccess(req)) {
    return;
  }
  throw forbidden("Company membership or instance admin access required");
}

export function assertInstanceAdmin(req: Request) {
  assertBoard(req);
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
    return;
  }
  throw forbidden("Instance admin access required");
}

export function assertCompanyAccess(req: Request, companyId: string) {
  assertAuthenticated(req);
  if (req.actor.type === "agent" && req.actor.companyId !== companyId) {
    throw forbidden("Agent key cannot access another company");
  }
  if (req.actor.type === "board" && req.actor.source !== "local_implicit") {
    const allowedCompanies = req.actor.companyIds ?? [];
    if (!allowedCompanies.includes(companyId)) {
      throw forbidden("User does not have access to this company");
    }
    const method = typeof req.method === "string" ? req.method.toUpperCase() : "GET";
    const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);
    if (!isSafeMethod && !req.actor.isInstanceAdmin && Array.isArray(req.actor.memberships)) {
      const membership = req.actor.memberships.find((item) => item.companyId === companyId);
      if (!membership || membership.status !== "active") {
        throw forbidden("User does not have active company access");
      }
      if (membership.membershipRole === "viewer") {
        throw forbidden("Viewer access is read-only");
      }
    }
  }
}

export function getActorInfo(req: Request) {
  assertAuthenticated(req);
  if (req.actor.type === "agent") {
    return {
      actorType: "agent" as const,
      actorId: req.actor.agentId ?? "unknown-agent",
      agentId: req.actor.agentId ?? null,
      runId: req.actor.runId ?? null,
    };
  }

  return {
    actorType: "user" as const,
    actorId: req.actor.userId ?? "board",
    agentId: null,
    runId: req.actor.runId ?? null,
  };
}

/**
 * Asserts that the current board user has access to the given project.
 * - Instance admins bypass the check.
 * - Agents are not restricted by project membership (they're restricted via project_agent_assignments).
 * - Board users must have an active membership in the project.
 */
export async function assertProjectAccess(req: Request, projectId: string, db: Db): Promise<void> {
  assertAuthenticated(req);

  // Agents are not checked here — their project scoping is handled separately.
  if (req.actor.type === "agent") return;

  // Instance admins and local board have full access.
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;

  const userId = req.actor.userId;
  if (!userId) throw forbidden("Board authentication required");

  const membership = await db
    .select({ role: projectMemberships.role })
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
        eq(projectMemberships.status, "active"),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    throw forbidden("User does not have access to this project");
  }
}

/**
 * Asserts that the current board user is an owner of the project (or instance admin).
 */
export async function assertProjectOwner(req: Request, projectId: string, db: Db): Promise<void> {
  assertAuthenticated(req);
  if (req.actor.type !== "board") throw forbidden("Board access required");
  if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) return;

  const userId = req.actor.userId;
  if (!userId) throw forbidden("Board authentication required");

  const membership = await db
    .select({ role: projectMemberships.role })
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
        eq(projectMemberships.status, "active"),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (!membership || membership.role !== "owner") {
    throw forbidden("Project owner access required");
  }
}
