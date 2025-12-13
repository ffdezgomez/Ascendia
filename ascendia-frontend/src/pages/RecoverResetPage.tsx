// pages/RecoverResetPage.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { InputField, ErrorPanel, IconSpinner, Toast } from "../components/UI";

const ResetSchema = z.object({
  token: z.string().min(10, "Token requerido"),
  newPassword: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Debe tener mayúscula, minúscula y número"),
});

type ResetValues = z.infer<typeof ResetSchema>;

export default function RecoverResetPage() {
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = params.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ResetValues>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { token: tokenFromUrl, newPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      await authService.resetPassword(values.token, values.newPassword);
      setOk(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || "No se pudo cambiar la contraseña.");
    }
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_50%),linear-gradient(to_bottom,theme(colors.zinc.950),theme(colors.zinc.900))] text-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-[30px] bg-zinc-900/70 px-8 py-10 shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50">
        <h2 className="text-2xl font-semibold mb-2">Nueva contraseña</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Introduce el token recibido y tu nueva contraseña.
        </p>

        <form onSubmit={onSubmit}>
          <InputField
            label="Token"
            error={errors.token?.message}
            {...register("token")}
            placeholder="Pega el token del correo"
            required
          />

          <InputField
            label="Nueva contraseña"
            error={errors.newPassword?.message}
            {...register("newPassword")}
            placeholder="********"
            type="password"
            required
          />

          {error && <ErrorPanel message={error} onRetry={() => setError("")} />}

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <IconSpinner /> : null}
            {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      </div>

      <Toast show={ok}>Contraseña actualizada. Redirigiendo…</Toast>
    </div>
  );
}