"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  FileText,
  Receipt,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import type { FinanceDashboardSummary } from "@/types/finance-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FinanceDashboardClientProps = {
  summary: FinanceDashboardSummary;
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

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getFinanceTone(value: number) {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
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

export function FinanceDashboardClient({
  summary,
  initialFrom = "",
  initialTo = "",
}: FinanceDashboardClientProps) {
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

    router.push(query ? `/finance?${query}` : "/finance");
  }

  function resetFilter() {
    setFrom("");
    setTo("");
    router.push("/finance");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Keuangan
          </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Ringkasan Keuangan
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pantau tagihan, pembayaran, pengeluaran, piutang, dan estimasi hasil usaha dalam satu tampilan.
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
          value={formatCurrency(summary.totalInvoiceAmount)}
          description="Tagihan aktif berdasarkan tanggal penerbitan"
          icon={FileText}
        />

        <MetricCard
          title="Tagihan Lunas"
          value={formatCurrency(summary.totalPaidAmount)}
          description="Nominal yang telah dibayar pada tagihan"
          icon={Banknote}
        />

        <MetricCard
          title="Pembayaran Diterima"
          value={formatCurrency(summary.totalPaymentAmount)}
          description="Pembayaran terkonfirmasi berdasarkan tanggal pembayaran"
          icon={Wallet}
        />

        <MetricCard
          title="Total Pengeluaran"
          value={formatCurrency(summary.totalExpenseAmount)}
          description="Pengeluaran selain ditolak berdasarkan tanggal pengeluaran"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Sisa Piutang"
          value={formatCurrency(summary.totalOutstandingAmount)}
          description="Total tagihan yang belum diterima"
          icon={Wallet}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Estimasi Laba Kotor</CardTitle>
            <TrendingUp className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-semibold ${getFinanceTone(
                summary.estimatedGrossProfit,
              )}`}
            >
              {formatCurrency(summary.estimatedGrossProfit)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Total tagihan dikurangi pengeluaran yang tidak ditolak.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Estimasi Arus Kas Bersih</CardTitle>
            <TrendingDown className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-semibold ${getFinanceTone(
                summary.estimatedCashProfit,
              )}`}
            >
              {formatCurrency(summary.estimatedCashProfit)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pembayaran terkonfirmasi dikurangi pengeluaran yang telah dibayar.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Tagihan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-5">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Draf</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.draftInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Diterbitkan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.issuedInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Dibayar Sebagian</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.partiallyPaidInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Lunas</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.paidInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Dibatalkan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.voidInvoices}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-5">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Draf</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.draftExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Diajukan</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.submittedExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Disetujui</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.approvedExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Lunas</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.paidExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Ditolak</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.rejectedExpenses}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tagihan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.clientName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBusinessLabel(invoice.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  </TableRow>
                ))}

                {summary.recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada tagihan pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pembayaran Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-medium">{payment.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {getBusinessLabel(payment.method)}
                      </p>
                    </TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))}

                {summary.recentPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada pembayaran pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengeluaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <p className="font-medium">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expenseNumber}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBusinessLabel(expense.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}

                {summary.recentExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada pengeluaran pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
