"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createSessionAction } from "@/features/auth/actions";
import { getFirebaseAuthErrorMessage } from "@/lib/auth/firebase-auth-error";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const auth = getFirebaseClientAuth();

      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const idToken = await credential.user.getIdToken();

      const result = await createSessionAction({
        idToken,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      if (result.data.user.mustChangePassword) {
        router.replace("/change-password");
        router.refresh();
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="relative w-full overflow-hidden border-gold/20 bg-card shadow-[0_22px_70px_rgb(6_22_42_/_0.11)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <CardHeader className="border-b bg-secondary/25 pb-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Masuk ke Nexty Labs ERP</CardTitle>
            <CardDescription className="mt-1">
              Gunakan email dan kata sandi akun perusahaan.
            </CardDescription>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
            <ShieldCheck className="size-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email perusahaan</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@perusahaan.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 pl-10"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11"
              leadingIcon={<KeyRound className="size-4" />}
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}

          <Button
            className="h-11 w-full justify-between px-4"
            type="submit"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? "Memeriksa akun..." : "Masuk ke sistem"}</span>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
            )}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-[0.68rem] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-gold" />
          Sesi diamankan dan akses dibatasi berdasarkan peran
        </div>
      </CardContent>
    </Card>
  );
}
