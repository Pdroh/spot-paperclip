import type {
  ProjectAgentAssignment,
  ProjectAgentAssignmentWithAgent,
  CreateProjectAgentAssignment,
} from "@paperclipai/shared";
import { api } from "./client";

const base = (companyId: string, projectId: string) =>
  `/companies/${encodeURIComponent(companyId)}/projects/${encodeURIComponent(projectId)}/agents`;

export const projectAgentsApi = {
  list: (companyId: string, projectId: string) =>
    api.get<ProjectAgentAssignmentWithAgent[]>(base(companyId, projectId)),

  assign: (companyId: string, projectId: string, payload: CreateProjectAgentAssignment) =>
    api.post<ProjectAgentAssignment>(base(companyId, projectId), payload),

  unassign: (companyId: string, projectId: string, agentId: string) =>
    api.delete(`${base(companyId, projectId)}/${encodeURIComponent(agentId)}`),
};
