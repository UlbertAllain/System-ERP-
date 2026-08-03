import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";

import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUserFromSession } from "@/lib/auth/session";

const workspaceModules = [
  {
    label: "Proyek & Operasional",
    description: "Proyek, tugas, milestone, dan aktivitas tim.",
    icon: BriefcaseBusiness,
  },
  {
    label: "Keuangan",
    description: "Invoice, pembayaran, pengeluaran, dan laporan.",
    icon: Calculator,
  },
  {
    label: "SDM & Akses",
    description: "Karyawan, kehadiran, peran, dan hak akses.",
    icon: Users,
  },
  {
    label: "Laporan",
    description: "Ringkasan kinerja dan data operasional.",
    icon: BarChart3,
  },
];

export default async function LoginPage() {
  const currentUser = await getCurrentUserFromSession();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="erp-page-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/80">
          <NextyLabsMark className="text-primary" />

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              Sistem internal aktif
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_460px]">
          <section className="hidden border-r border-border/80 py-12 pr-12 lg:flex lg:flex-col lg:justify-between xl:py-16 xl:pr-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                Ruang kerja perusahaan
              </div>

              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-0.035em] xl:text-[2.8rem]">
                Akses operasional perusahaan dalam satu sistem.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                Gunakan akun internal untuk membuka modul yang sesuai dengan peran dan tanggung jawab Anda.
              </p>

              <div className="mt-10 max-w-2xl border-y border-border/80">
                {workspaceModules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <div
                      key={module.label}
                      className="grid grid-cols-[40px_1fr] gap-4 border-b border-border/70 py-4 last:border-b-0"
                    >
                      <div className="flex size-9 items-center justify-center border border-border bg-card text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {module.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex max-w-2xl items-start gap-3 border-t border-border/80 pt-5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Akses berbasis peran
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Menu, data, dan tindakan dibatasi berdasarkan peran pengguna yang ditetapkan administrator.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center py-10 lg:justify-end lg:pl-12 xl:pl-16">
            <div className="w-full max-w-[420px]">
              <div className="mb-7">
                <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <LockKeyhole className="size-3.5 text-primary" />
                  Autentikasi
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
                  Masuk ke ERP
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Gunakan email dan kata sandi akun perusahaan Anda.
                </p>
              </div>

              <LoginForm />

              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Akun tidak dapat digunakan? Hubungi administrator internal untuk memeriksa status pengguna atau hak akses.
              </p>
            </div>
          </section>
        </div>

        <footer className="flex min-h-14 shrink-0 flex-col justify-center gap-1 border-t border-border/80 py-3 text-[0.68rem] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span>Nexty ERP · Operations Console</span>
          <span>Akses khusus pengguna terotorisasi</span>
        </footer>
      </div>
    </main>
  );
}
