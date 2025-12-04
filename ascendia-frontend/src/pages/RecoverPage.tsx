// pages/RecoverPage.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService } from "../services/authService";
import { InputField, ErrorPanel, IconSpinner, Toast } from "../components/UI";

const RecoverSchema = z.object({
  emailOrUsername: z.string().min(3, "Introduce tu email o username"),
});

type RecoverValues = z.infer<typeof RecoverSchema>;

export default function RecoverPage() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RecoverValues>({
    resolver: zodResolver(RecoverSchema),
    defaultValues: { emailOrUsername: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      const res = await authService.forgotPassword(values.emailOrUsername);
      setDevToken(res.token ?? null);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "No se pudo enviar el correo.");
    }
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_50%),linear-gradient(to_bottom,theme(colors.zinc.950),theme(colors.zinc.900))] text-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-[30px] bg-zinc-900/70 px-8 py-10 shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50">
        <h2 className="text-2xl font-semibold mb-2">Recuperar contraseña</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Te enviaremos un correo con un enlace y un token para restablecerla.
        </p>

        <form onSubmit={onSubmit}>
          <InputField
            label="Email o nombre de usuario"
            error={errors.emailOrUsername?.message}
            {...register("emailOrUsername")}
            placeholder="tu@email.com o username"
            required
          />

          {error && <ErrorPanel message={error} onRetry={() => setError("")} />}

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <IconSpinner /> : null}
            {isSubmitting ? "Enviando..." : "Enviar correo"}
          </button>
        </form>
      </div>

      {/* Modal/Toast estilo B */}
      <Toast show={sent}>
        <div className="space-y-2">
          <p>Correo enviado. Revisa tu bandeja de entrada.</p>
          {devToken ? (
            <p className="text-xs text-zinc-300">
              (DEV) Token: <span className="font-mono">{devToken}</span>
            </p>
          ) : null}
        </div>
      </Toast>
    </div>
  );
}