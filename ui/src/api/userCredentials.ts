import type { UserAdapterCredential, UpsertUserAdapterCredential } from "@paperclipai/shared";
import { api } from "./client";

export const userCredentialsApi = {
  list: () =>
    api.get<UserAdapterCredential[]>("/users/me/credentials"),

  upsert: (adapterType: string, payload: UpsertUserAdapterCredential) =>
    api.put<UserAdapterCredential>(
      `/users/me/credentials/${encodeURIComponent(adapterType)}`,
      payload,
    ),

  remove: (adapterType: string) =>
    api.delete(`/users/me/credentials/${encodeURIComponent(adapterType)}`),
};
