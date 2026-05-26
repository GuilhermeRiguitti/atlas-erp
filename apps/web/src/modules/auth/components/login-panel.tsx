"use client";

import { LockKeyhole, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import * as yup from "yup";
import { apiClient } from "@/shared/api/http-client";

const loginSchema = yup.object({
  email: yup.string().email("Email invalido").required("Email obrigatorio"),
  password: yup.string().min(8, "Senha deve ter pelo menos 8 caracteres").required("Senha obrigatoria"),
});

export function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await loginSchema.validate({ email, password }, { abortEarly: false });
      await apiClient.post("/api/auth/login", { email, password });
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof yup.ValidationError ? caught.errors.join(", ") : caught instanceof Error ? caught.message : "Falha ao entrar");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f4] px-5 text-[#1d2520]">
      <form className="w-full max-w-md rounded-md border border-[#d9ded6] bg-white p-6 shadow-sm" onSubmit={login}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-[#e6f0e9] text-[#28785d]">
            <LockKeyhole className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#607568]">ERP Fiscal</p>
            <h1 className="text-xl font-semibold">Entrar no painel</h1>
          </div>
        </div>
        <label className="block text-sm font-medium text-[#4d5b52]">
          Email
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9ded6] px-3 text-sm outline-none focus:border-[#28785d]"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-[#4d5b52]">
          Senha
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9ded6] px-3 text-sm outline-none focus:border-[#28785d]"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#28785d] px-4 text-sm font-medium text-white disabled:opacity-60" disabled={isLoading} type="submit">
          <LogIn className="size-4" />
          Entrar
        </button>
      </form>
    </main>
  );
}
