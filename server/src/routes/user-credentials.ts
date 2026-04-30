import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { upsertUserAdapterCredentialSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { userAdapterCredentialService } from "../services/user-adapter-credentials.js";
import { assertBoard } from "./authz.js";
import { unauthorized } from "../errors.js";

export function userCredentialRoutes(db: Db) {
  const router = Router();
  const svc = userAdapterCredentialService(db);

  /** List credentials for the currently signed-in user (metadata only — no secrets). */
  router.get("/users/me/credentials", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.userId;
    if (!userId) throw unauthorized("Board authentication required");
    const credentials = await svc.list(userId);
    res.json(credentials);
  });

  /** Create or update a credential for the given adapter type. */
  router.put(
    "/users/me/credentials/:adapterType",
    validate(upsertUserAdapterCredentialSchema),
    async (req, res) => {
      assertBoard(req);
      const userId = req.actor.userId;
      if (!userId) throw unauthorized("Board authentication required");
      const adapterType = req.params.adapterType as string;
      const { label, apiKey } = upsertUserAdapterCredentialSchema.parse(req.body);
      const credential = await svc.upsert(userId, adapterType, label, apiKey);
      res.json(credential);
    },
  );

  /** Delete a credential for the given adapter type. */
  router.delete("/users/me/credentials/:adapterType", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.userId;
    if (!userId) throw unauthorized("Board authentication required");
    const { adapterType } = req.params;
    await svc.remove(userId, adapterType as string);
    res.status(204).end();
  });

  return router;
}
