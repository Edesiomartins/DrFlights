"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form
      className="glass"
      onSubmit={onSubmit}
      data-testid="login-form"
      style={{ borderRadius: "1.25rem", padding: "1.5rem", display: "grid", gap: "1rem" }}
    >
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading} data-testid="login-submit">
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>
        Não tem conta? <Link href="/cadastro">Cadastre-se</Link>
      </p>
    </form>
  );
}

export default function EntrarPage() {
  return (
    <div className="shell" style={{ padding: "2rem 0", maxWidth: 480 }}>
      <h1 style={{ color: "var(--sand)", fontFamily: "var(--font-display)" }}>Entrar</h1>
      <Suspense fallback={<div className="glass" style={{ padding: "1.5rem", borderRadius: "1.25rem" }}>Carregando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
