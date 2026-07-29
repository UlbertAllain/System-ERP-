import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { NextyLabsMark } from "@/components/brand/nexty-labs-mark";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUserFromSession } from "@/lib/auth/session";

const metrics = [
  {
    label: "Proyek aktif",
    value: "24",
    icon: BriefcaseBusiness,
  },
  {
    label: "Tugas selesai",
    value: "87%",
    icon: CheckCircle2,
  },
  {
    label: "Tim terhubung",
    value: "48",
    icon: Users,
  },
];

const activities = [
  "Persetujuan pengeluaran diperbarui",
  "Tahapan proyek baru ditambahkan",
  "Laporan operasional tersedia",
];

export default async function LoginPage() {
  const currentUser = await getCurrentUserFromSession();

  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-navy px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgb(225_169_77_/_0.065)_1px,transparent_1px),linear-gradient(90deg,rgb(225_169_77_/_0.065)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="absolute -left-40 -top-48 size-[560px] rounded-full border border-gold/10" />
      <div className="absolute -left-20 -top-24 size-[380px] rounded-full border border-gold/10" />
      <div className="absolute -bottom-44 -right-40 size-[620px] rounded-full border border-gold/10" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1500px] overflow-hidden rounded-2xl border border-white/10 bg-background shadow-[0_38px_120px_rgb(0_0_0_/_0.42)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
        <section className="relative hidden overflow-hidden bg-navy px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgb(225_169_77_/_0.14),transparent_24rem)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgb(255_255_255_/_0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.04)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="absolute -bottom-28 -left-10 h-64 w-[120%] -rotate-6 border border-gold/10" />
          <div className="absolute -bottom-10 -left-10 h-52 w-[120%] -rotate-6 border border-gold/10" />

          <div className="relative flex items-center justify-between gap-4">
            <NextyLabsMark inverted className="text-gold" />
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[0.68rem] font-medium text-white/60">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Sistem operasional aktif
            </div>
          </div>

          <div className="relative my-auto py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              Enterprise Resource Planning
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.03] tracking-[-0.04em] xl:text-[4.35rem]">
              Satu pusat kerja untuk operasional yang lebih tertata.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60 xl:text-base">
              Pantau proyek, tugas, keuangan, pelanggan, dan sumber daya perusahaan melalui alur kerja yang jelas dan akses yang terkontrol.
            </p>

            <div className="mt-9 max-w-3xl rounded-xl border border-white/10 bg-white/[0.055] p-4 shadow-[0_28px_70px_rgb(0_0_0_/_0.2)] backdrop-blur-md xl:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/40">
                    Ringkasan operasional
                  </p>
                  <p className="mt-1 text-sm font-semibold">Hari ini</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-md border border-gold/20 bg-gold/10 text-gold">
                  <BarChart3 className="size-4" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {metrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-white/10 bg-black/10 p-3"
                    >
                      <Icon className="size-4 text-gold" />
                      <p className="mt-3 font-display text-2xl font-semibold">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-[0.68rem] text-white/40">
                        {metric.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/10 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold">Aktivitas terbaru</p>
                  <ArrowUpRight className="size-3.5 text-gold" />
                </div>
                <div className="space-y-2.5">
                  {activities.map((activity, index) => (
                    <div key={activity} className="flex items-center gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-[0.58rem] font-semibold text-gold">
                        {index + 1}
                      </span>
                      <p className="text-[0.72rem] text-white/50">{activity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-6 border-t border-white/10 pt-5 text-[0.68rem] text-white/40">
            <span>Modern · Classic · Professional</span>
            <span>Akses berbasis peran</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-background px-5 py-9 sm:px-10 lg:px-12 xl:px-16">
          <div className="absolute -right-24 -top-28 size-72 rounded-full border border-gold/10" />
          <div className="absolute -right-12 -top-14 size-48 rounded-full border border-gold/10" />
          <div className="absolute bottom-0 left-0 h-36 w-36 border-r border-t border-gold/10" />

          <div className="relative w-full max-w-[470px]">
            <div className="mb-9 flex items-center justify-between gap-4 lg:hidden">
              <NextyLabsMark className="text-gold" />
              <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-[0.68rem] text-muted-foreground shadow-sm">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Sistem aktif
              </div>
            </div>

            <div className="mb-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground">
                <ShieldCheck className="size-3.5 text-gold" />
                Akses internal perusahaan
              </div>
              <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-[2.8rem]">
                Selamat datang kembali.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                Masuk menggunakan akun yang telah dibuat administrator. Setelah masuk, menu dan panduan akan menyesuaikan peran Anda.
              </p>
            </div>

            <LoginForm />

            <div className="mt-6 flex gap-3 rounded-lg border border-border/70 bg-secondary/35 p-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
              <p className="text-xs leading-5 text-muted-foreground">
                Kesulitan masuk? Hubungi administrator internal untuk memeriksa status akun, email, atau peran yang diberikan kepada Anda.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
