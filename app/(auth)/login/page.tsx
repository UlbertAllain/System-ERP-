import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUserFromSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const currentUser = await getCurrentUserFromSession();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            NEXTY Labs
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            NEXTY ERP
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Internal command center untuk operasional software house.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
