"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn-secondary site-nav-cta"
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sair
    </button>
  );
}
