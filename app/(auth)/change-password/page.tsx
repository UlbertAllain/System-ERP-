import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { clearSessionAction } from "@/features/auth/actions";
import { getCurrentUserFromSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUserFromSession();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.mustChangePassword) {
    redirect("/dashboard");
  }

  async function logout() {
    "use server";

    await clearSessionAction();
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            NEXTY Labs
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            NEXTY ERP
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Akun sir wajib mengganti password sebelum masuk dashboard.
          </p>
        </div>

        <ChangePasswordForm />

        <form className="mt-4 text-center" action={logout}>
          <Button type="submit" variant="ghost">
            Logout
          </Button>
        </form>
      </div>
    </main>
  );
}
