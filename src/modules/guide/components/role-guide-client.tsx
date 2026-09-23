"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Compass,
  Layers3,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PermissionSlug } from "@/constants/permissions";
import {
  getRoleGuide,
  type GuideWorkflow,
  type RoleGuide,
} from "@/features/guide/data/role-guides";
import { cn } from "@/lib/utils";

type RoleGuideClientProps = {
  userName: string;
  roleSlugs: string[];
  permissions: PermissionSlug[];
};

function canAccessWorkflow(
  workflow: GuideWorkflow,
  permissions: Set<PermissionSlug>,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin || !workflow.requiredPermissions?.length) {
    return true;
  }

  return workflow.requiredPermissions.some((permission) =>
    permissions.has(permission),
  );
}

function getVisibleWorkflows(
  guide: RoleGuide,
  permissions: Set<PermissionSlug>,
  isSuperAdmin: boolean,
): GuideWorkflow[] {
  return guide.workflows.filter((workflow) =>
    canAccessWorkflow(workflow, permissions, isSuperAdmin),
  );
}

export function RoleGuideClient({
  userName,
  roleSlugs,
  permissions,
}: RoleGuideClientProps) {
  const guides = useMemo(() => {
    const uniqueRoleSlugs = Array.from(new Set(roleSlugs.filter(Boolean)));

    return (uniqueRoleSlugs.length > 0 ? uniqueRoleSlugs : ["employee"]).map(
      getRoleGuide,
    );
  }, [roleSlugs]);

  const [activeRoleSlug, setActiveRoleSlug] = useState(guides[0]?.slug ?? "employee");
  const activeGuide =
    guides.find((guide) => guide.slug === activeRoleSlug) ?? guides[0];
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const isSuperAdmin = roleSlugs.includes("super_admin");
  const visibleWorkflows = activeGuide
    ? getVisibleWorkflows(activeGuide, permissionSet, isSuperAdmin)
    : [];

  if (!activeGuide) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-gold/20 bg-navy px-6 py-7 text-white shadow-[0_24px_70px_rgb(6_22_42_/_0.18)] md:px-8 md:py-9">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgb(225_169_77_/_0.08)_1px,transparent_1px),linear-gradient(90deg,rgb(225_169_77_/_0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute -right-24 -top-28 size-80 rounded-full border border-gold/15" />
        <div className="absolute -right-10 -top-8 size-52 rounded-full border border-gold/10" />

        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="flex size-11 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <BookOpenCheck className="size-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Panduan berdasarkan peran
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-4xl">
              Halo, {userName || "Pengguna"}. Berikut cara menggunakan sistem sesuai tanggung jawab Anda.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
              Panduan hanya menampilkan alur yang relevan dengan peran akun Anda. Tombol dan data yang terlihat tetap mengikuti hak akses aktual yang ditetapkan administrator.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-gold/10 text-gold">
                <Layers3 className="size-4" />
              </div>
              <div>
                <p className="text-xs text-white/45">Peran aktif pada akun</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {guides.length} peran terhubung
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {guides.map((guide) => (
                <span
                  key={guide.slug}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[0.7rem] font-medium text-white/70"
                >
                  {guide.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border pb-0"
          role="tablist"
          aria-label="Panduan peran"
        >
          {guides.map((guide, index) => {
            const active = guide.slug === activeGuide.slug;

            return (
              <button
                key={guide.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveRoleSlug(guide.slug)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-2 text-sm font-semibold transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex size-6 items-center justify-center rounded-full border text-[0.68rem]">
                  {index + 1}
                </span>
                Sebagai {guide.label}
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-[-1px] h-0.5 transition-colors",
                    active ? "bg-gold" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <Card className="border-gold/20">
            <CardHeader className="border-b bg-secondary/35">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                    {activeGuide.eyebrow}
                  </p>
                  <CardTitle className="mt-1 text-2xl">
                    Sebagai {activeGuide.label}, Anda bisa apa?
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-gold/25 bg-gold/10 text-foreground">
                  Panduan {guides.findIndex((guide) => guide.slug === activeGuide.slug) + 1} dari {guides.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm leading-7 text-muted-foreground">
                {activeGuide.summary}
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {activeGuide.capabilities.map((capability) => (
                  <div
                    key={capability}
                    className="flex gap-3 rounded-lg border border-border/75 bg-background/55 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                    <p className="text-sm leading-6">{capability}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Alur penggunaan
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold">
                  Cara menjalankan pekerjaan Anda
                </h3>
              </div>
              <Badge variant="secondary">
                {visibleWorkflows.length} panduan
              </Badge>
            </div>

            <div className="space-y-4">
              {visibleWorkflows.map((workflow, workflowIndex) => (
                <Card key={`${activeGuide.slug}-${workflow.title}`}>
                  <CardHeader className="border-b">
                    <div className="flex gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary font-display text-base font-semibold text-primary-foreground">
                        {String(workflowIndex + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{workflow.title}</CardTitle>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <ol className="space-y-4">
                      {workflow.steps.map((step, stepIndex) => (
                        <li key={step} className="flex gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-[0.68rem] font-bold text-foreground">
                            {stepIndex + 1}
                          </span>
                          <p className="pt-0.5 text-sm leading-6 text-foreground/80">
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-5 border-t pt-4">
                      <Button asChild variant="outline" className="gap-2">
                        <Link href={workflow.href}>
                          {workflow.actionLabel}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {visibleWorkflows.length === 0 ? (
                <Card>
                  <CardContent className="flex gap-3 pt-5">
                    <CircleAlert className="mt-0.5 size-5 shrink-0 text-gold" />
                    <div>
                      <p className="font-semibold">Belum ada alur yang dapat ditampilkan.</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Peran terdeteksi, tetapi hak akses terkait tidak aktif pada akun Anda. Hubungi administrator untuk memeriksa konfigurasi peran.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="border-gold/20 bg-navy text-white">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-gold/25 bg-gold/10 text-gold">
                  <ShieldCheck className="size-4" />
                </div>
                <CardTitle className="font-sans text-base text-white">
                  Hal penting untuk diingat
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="space-y-4">
                {activeGuide.reminders.map((reminder) => (
                  <li key={reminder} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                    <p className="text-sm leading-6 text-white/65">{reminder}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Compass className="size-4" />
                </div>
                <CardTitle className="font-sans text-base">
                  Cara membaca sistem
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex gap-3">
                <ListChecks className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Sidebar menunjukkan modul yang dapat diakses oleh akun Anda.
                </p>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Tidak semua pengguna melihat tombol dan data yang sama karena akses dibatasi berdasarkan peran.
                </p>
              </div>
              <div className="flex gap-3">
                <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-gold" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Kembali ke halaman ini ketika peran atau tanggung jawab Anda berubah.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
