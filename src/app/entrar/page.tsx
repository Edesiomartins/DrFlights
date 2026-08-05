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
      className="glass auth-form"
      onSubmit={onSubmit}
      data-testid="login-form"
    >
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <p className="form-error auth-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading} data-testid="login-submit">
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="auth-switch">
        Não tem conta? <Link href="/cadastro">Cadastre-se</Link>
      </p>
    </form>
  );
}

export default function EntrarPage() {
  return (
    <div className="auth-page shell">
      <div className="auth-intro"><span>Acesse sua viagem</span><h1>Entrar</h1><p>Seus alertas, buscas e oportunidades em um só lugar.</p></div>
      <Suspense fallback={<div className="glass auth-form">Carregando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
