"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";

import { completePasswordChangeAction } from "@/modules/auth/actions";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
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
    setIsSubmitting(true);

    try {
      const result = await completePasswordChangeAction({
        newPassword,
        confirmPassword,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      await signOut(getFirebaseClientAuth()).catch(() => undefined);
      router.replace("/login?passwordChanged=1");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full border-border/80 shadow-[0_18px_60px_rgb(6_22_42_/_0.08)]">
      <CardHeader className="border-b pb-5">
        <CardTitle className="text-xl">Buat kata sandi baru</CardTitle>
        <CardDescription>
          Gunakan minimal 10 karakter yang memuat huruf besar, huruf kecil, dan angka.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Kata Sandi Baru</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              placeholder="Minimal 10 karakter"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
            <PasswordInput
              id="confirmPassword"
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
              "Simpan dan Login Ulang"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
