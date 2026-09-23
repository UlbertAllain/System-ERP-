"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Receipt,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type { ReportsDashboardSummary } from "@/types/report";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportsRecentTables } from "@/features/reports/components/reports-recent-tables";

type ReportsDashboardClientProps = {
  summary: ReportsDashboardSummary;
  initialFrom?: string;
  initialTo?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ReportsDashboardClient({
  summary,
  initialFrom = "",
  initialTo = "",
}: ReportsDashboardClientProps) {
  const router = useRouter();

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const activeFilterLabel = useMemo(() => {
    if (!initialFrom && !initialTo) {
      return "Semua periode";
    }

    if (initialFrom && initialTo) {
      return `${initialFrom} sampai ${initialTo}`;
    }

    if (initialFrom) {
      return `Mulai ${initialFrom}`;
    }

    return `Sampai ${initialTo}`;
  }, [initialFrom, initialTo]);

  function applyFilter() {
    const params = new URLSearchParams();

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    const query = params.toString();

    router.push(query ? `/reports?${query}` : "/reports");
  }

  function resetFilter() {
    setFrom("");
    setTo("");
    router.push("/reports");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Pelaporan
          </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Laporan Manajemen
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan lintas modul untuk keuangan, proyek, tugas, pelanggan, dan sumber daya manusia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Tanggal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="from">Dari Tanggal</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="to">Sampai Tanggal</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={applyFilter} className="gap-2">
              <Search className="size-4" />
              Terapkan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilter}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Atur Ulang
            </Button>
          </div>

          <p className="text-sm text-muted-foreground md:col-span-3">
            Periode aktif:{" "}
            <span className="font-medium">{activeFilterLabel}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Tagihan"
          value={formatCurrency(summary.finance.totalInvoiceAmount)}
          description="Total tagihan aktif"
          icon={FileText}
        />

        <MetricCard
          title="Pendapatan Diterima"
          value={formatCurrency(summary.finance.totalPaidAmount)}
          description="Pendapatan yang sudah diterima"
          icon={Wallet}
        />

        <MetricCard
          title="Outstanding"
          value={formatCurrency(summary.finance.totalOutstandingAmount)}
          description="Tagihan belum lunas"
          icon={TrendingUp}
        />

        <MetricCard
          title="Pengeluaran"
          value={formatCurrency(summary.finance.totalExpenseAmount)}
          description="Pengeluaran selain ditolak"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross Profit"
          value={formatCurrency(summary.finance.estimatedGrossProfit)}
          description="Total tagihan - total pengeluaran"
          icon={BarChart3}
        />

        <MetricCard
          title="Cash Profit"
          value={formatCurrency(summary.finance.estimatedCashProfit)}
          description="Pendapatan diterima - pengeluaran dibayar"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Proyek"
          value={summary.projects.totalProjects}
          description="Total proyek pada periode"
          icon={Briefcase}
        />

        <MetricCard
          title="Karyawan"
          value={summary.hr.totalEmployees}
          description="Total karyawan terdaftar"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Proyek</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Planning</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.planningProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Berjalan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.inProgressProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Selesai</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.completedProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">On Hold</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.onHoldProjects}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Dibatalkan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.projects.cancelledProjects}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Tugas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Belum dimulai</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.todoTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Berjalan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.inProgressTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Dalam peninjauan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.inReviewTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Selesai</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.doneTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Terhambat</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.blockedTasks}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Dibatalkan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.tasks.cancelledTasks}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Ringkasan Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.totalClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Aktif</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.activeClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Tidak Aktif</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.inactiveClients}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Diarsipkan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.clients.archivedClients}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Ringkasan SDM
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.totalEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Aktif</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.activeEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Tidak Aktif</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.inactiveEmployees}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Mengundurkan diri</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.hr.resignedEmployees}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReportsRecentTables summary={summary} />
    </div>
  );
}
