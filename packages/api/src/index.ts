import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// Autorización por rol: solo admin (RF-AUTH-04 / matriz de capacidades)
const requireAdmin = o.middleware(async ({ context, next }) => {
  const user = context.session?.user as
    | { id: string; role?: string }
    | undefined;
  if (!user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Requiere rol admin." });
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
