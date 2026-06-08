import { env } from "@buenasmigas/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { setToken, TOKEN_KEY } from "./token";

// Auth Bearer: guarda el token que devuelve el server (set-auth-token) y lo
// reenvía en cada request. Sesión de 90 días → mínima fricción ("llega y pum").
export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  // El rol (operario | admin) es un campo adicional del server (RF-AUTH-02);
  // lo declaramos aquí para que `session.user.role` quede tipado en el cliente.
  plugins: [
    inferAdditionalFields({
      user: { role: { type: "string", required: false, input: false } },
    }),
  ],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem(TOKEN_KEY) ?? "",
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) setToken(token);
    },
  },
});
