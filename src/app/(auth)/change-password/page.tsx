import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import { ChangePasswordForm } from "@/modules/auth/components/change-password-form";
import { getCurrentUserFromSession } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
    throw new Error("UNREACHABLE");
  }

  if (!currentUser.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <NextyLabsMark className="justify-center text-gold" />
          <div className="mx-auto mt-8 flex size-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <KeyRound className="size-5" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
            Amankan akun Anda
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Kata sandi sementara wajib diganti sebelum Anda dapat menggunakan sistem.
          </p>
        </div>

        <ChangePasswordForm />

        <div className="mt-5 flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
          Gunakan minimal 10 karakter dengan kombinasi huruf besar, huruf kecil, dan angka.
        </div>
      </div>
    </main>
  );
}
