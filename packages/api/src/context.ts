import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@buenasmigas/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(req: IncomingHttpHeaders) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req),
  });
  return {
    headers: req,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
