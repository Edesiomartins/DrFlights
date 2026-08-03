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
    <div className="shell" style={{ padding: "2rem 0", maxWidth: 480 }}>
      <h1 style={{ color: "var(--sand)", fontFamily: "var(--font-display)" }}>Cadastro</h1>
      <form
        className="glass"
        onSubmit={onSubmit}
        data-testid="register-form"
        style={{ borderRadius: "1.25rem", padding: "1.5rem", display: "grid", gap: "1rem" }}
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
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading} data-testid="register-submit">
          {loading ? "Criando…" : "Criar conta"}
        </button>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
