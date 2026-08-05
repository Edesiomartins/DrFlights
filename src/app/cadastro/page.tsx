"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CadastroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setLoading(false);
      setError(json.error ?? "Não foi possível criar a conta.");
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/entrar");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="auth-page shell">
      <div className="auth-intro"><span>Comece a comparar</span><h1>Cadastro</h1><p>Crie sua conta para salvar buscas e acompanhar preços.</p></div>
      <form
        className="glass auth-form"
        onSubmit={onSubmit}
        data-testid="register-form"
      >
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" name="name" required minLength={2} />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha (mín. 8)</label>
          <input id="password" name="password" type="password" required minLength={8} />
        </div>
        {error ? <p className="form-error auth-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading} data-testid="register-submit">
          {loading ? "Criando…" : "Criar conta"}
        </button>
        <p className="auth-switch">
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
