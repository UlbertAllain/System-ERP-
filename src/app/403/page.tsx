import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy px-6 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(225,169,77,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(225,169,77,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />

      <Card className="relative w-full max-w-lg border-white/15 bg-[#fffdf8] shadow-2xl">
        <CardContent className="p-8 md:p-10">
          <NextyLabsMark />

          <div className="mt-10 flex size-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
            <LockKeyhole className="size-5" />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Akses Terbatas
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-navy">
            Halaman tidak dapat dibuka.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Peran akun Anda belum memiliki hak akses yang diperlukan. Hubungi
            administrator bila halaman ini memang dibutuhkan untuk pekerjaan
            Anda.
          </p>

          <Button asChild className="mt-8">
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
