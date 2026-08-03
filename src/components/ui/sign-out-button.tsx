"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ padding: "0.4rem 0.9rem" }}
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sair
    </button>
  );
}
