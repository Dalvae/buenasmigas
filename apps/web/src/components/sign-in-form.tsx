import { Button } from "@buenasmigas/ui/components/button";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

// Login por email + clave. No hay registro público: el admin crea las cuentas
// (RF-AUTH-07). Si se olvida la clave, el admin la resetea.
export default function SignInForm() {
  const navigate = useNavigate();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        { email: value.email, password: value.password },
        {
          onSuccess: () => {
            toast.success("Bienvenido");
            navigate({ to: "/dashboard" });
          },
          onError: (error) => {
            toast.error(error.error.message || "No se pudo iniciar sesión");
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Email inválido"),
        password: z.string().min(8, "Mínimo 8 caracteres"),
      }),
    },
  });

  if (isPending) return <Loader />;

  return (
    <div className="mx-auto mt-16 w-full max-w-sm p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Buenas Migas</h1>
        <p className="text-muted-foreground mt-1 text-sm">Registro de producción</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Correo</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="username"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.map((err) => (
                <p key={err?.message} className="text-sm text-red-500">
                  {err?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Contraseña</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.map((err) => (
                <p key={err?.message} className="text-sm text-red-500">
                  {err?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        ¿Olvidaste tu clave? Pídele al administrador que te la resetee.
      </p>
    </div>
  );
}
