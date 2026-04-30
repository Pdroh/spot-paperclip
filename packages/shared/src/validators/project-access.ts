import { z } from "zod";

export const projectMembershipRoleSchema = z.enum(["owner", "member", "viewer"]);

export const projectMembershipStatusSchema = z.enum(["active", "inactive"]);

export const projectMembershipSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  userId: z.string().min(1),
  role: projectMembershipRoleSchema,
  status: projectMembershipStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const projectMembershipWithUserSchema = projectMembershipSchema.extend({
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
});

export const createProjectMembershipSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: projectMembershipRoleSchema.default("member"),
});

export const updateProjectMembershipSchema = z.object({
  role: projectMembershipRoleSchema,
});

export const projectAgentAssignmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  agentId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export const projectAgentAssignmentWithAgentSchema = projectAgentAssignmentSchema.extend({
  agentName: z.string().min(1),
  agentRole: z.string().min(1),
  agentAdapterType: z.string().min(1),
});

export const createProjectAgentAssignmentSchema = z.object({
  agentId: z.string().uuid("Valid agent UUID required"),
});

export type CreateProjectMembership = z.infer<typeof createProjectMembershipSchema>;
export type UpdateProjectMembership = z.infer<typeof updateProjectMembershipSchema>;
export type CreateProjectAgentAssignment = z.infer<typeof createProjectAgentAssignmentSchema>;
