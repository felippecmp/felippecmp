"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  getAppPassword,
  getAuthSecret,
  signAuthCookie,
} from "@/lib/auth";

export type LoginResult = { ok: false; error: string };

export async function loginAction(
  _prev: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const password = formData.get("password");
  const next = (formData.get("next") as string) || "/";

  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Informe a senha." };
  }

  let appPassword: string;
  let secret: string;
  try {
    appPassword = getAppPassword();
    secret = getAuthSecret();
  } catch {
    return {
      ok: false,
      error: "Configuração do servidor incompleta. Contate o admin.",
    };
  }

  if (password !== appPassword) {
    // Small delay to discourage brute-force
    await new Promise((r) => setTimeout(r, 400));
    return { ok: false, error: "Senha incorreta." };
  }

  const value = await signAuthCookie(secret);
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  // Validate `next` is an internal path
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(safeNext);
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/login");
}
