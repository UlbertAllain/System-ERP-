import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <Card className="w-full max-w-lg border-border/70 shadow-sm">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            NEXTY ERP
          </p>
          <CardTitle className="text-2xl">Akses Ditolak</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 text-sm text-muted-foreground">
          <p>
            Akun sir tidak memiliki permission yang diperlukan untuk membuka
            halaman ini.
          </p>

          <Button asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
