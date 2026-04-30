import { z } from "zod";

export const userAdapterCredentialSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  adapterType: z.string().min(1),
  label: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const upsertUserAdapterCredentialSchema = z.object({
  label: z.string().default(""),
  apiKey: z.string().min(1, "API key is required"),
});

export type UpsertUserAdapterCredential = z.infer<typeof upsertUserAdapterCredentialSchema>;
