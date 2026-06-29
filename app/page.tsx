import { redirect } from "next/navigation";

import { getCurrentUserFromSession } from "@/lib/auth/session";

export default async function HomePage() {
  const currentUser = await getCurrentUserFromSession();

  if (currentUser) {
    redirect("/dashboard");
  }

  redirect("/login");
}
