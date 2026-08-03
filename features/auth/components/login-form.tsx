"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
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
    <div className="border border-border bg-card">
      <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
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
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? "login-error" : undefined}
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
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? "login-error" : undefined}
            disabled={isSubmitting}
            required
          />
        </div>

        {errorMessage ? (
          <div
            id="login-error"
            role="alert"
            className="flex gap-3 border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-5 text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <Button
          className="h-11 w-full justify-center px-4"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Memeriksa akun
            </>
          ) : (
            <>
              Masuk ke sistem
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="flex items-center gap-2 border-t border-border bg-secondary/35 px-5 py-3 text-[0.68rem] leading-5 text-muted-foreground sm:px-6">
        <ShieldCheck className="size-3.5 shrink-0 text-primary" />
        Sesi aman dan akses dibatasi berdasarkan peran pengguna.
      </div>
    </div>
  );
}
