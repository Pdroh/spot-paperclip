import type {
  ProjectMembership,
  ProjectMembershipWithUser,
  CreateProjectMembership,
  UpdateProjectMembership,
} from "@paperclipai/shared";
import { api } from "./client";

const base = (companyId: string, projectId: string) =>
  `/companies/${encodeURIComponent(companyId)}/projects/${encodeURIComponent(projectId)}/members`;

export const projectMembersApi = {
  list: (companyId: string, projectId: string) =>
    api.get<ProjectMembershipWithUser[]>(base(companyId, projectId)),

  add: (companyId: string, projectId: string, payload: CreateProjectMembership) =>
    api.post<ProjectMembership>(base(companyId, projectId), payload),

  update: (companyId: string, projectId: string, userId: string, payload: UpdateProjectMembership) =>
    api.patch<ProjectMembership>(
      `${base(companyId, projectId)}/${encodeURIComponent(userId)}`,
      payload,
    ),

  remove: (companyId: string, projectId: string, userId: string) =>
    api.delete(`${base(companyId, projectId)}/${encodeURIComponent(userId)}`),
};
