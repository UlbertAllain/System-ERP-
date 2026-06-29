"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "firebase/auth";
import { Loader2 } from "lucide-react";

import { completePasswordChangeAction } from "@/features/auth/actions";
import { getFirebaseAuthErrorMessage } from "@/lib/auth/firebase-auth-error";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseClientAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setErrorMessage("Sesi Firebase tidak ditemukan. Silakan login ulang.");
        return;
      }

      await updatePassword(currentUser, newPassword);

      const idToken = await currentUser.getIdToken(true);

      const result = await completePasswordChangeAction({
        idToken,
      });

      if (!result.success) {
        setErrorMessage(result.message);
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
    <Card className="w-full max-w-lg border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Ganti Password</CardTitle>
        <CardDescription>
          Untuk keamanan, akun pertama wajib mengganti password sebelum masuk
          dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Password Baru"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
