"use client";

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
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Finance
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Finance Dashboard
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan invoice, payment, expense, outstanding, dan estimasi profit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="from">From Date</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="to">To Date</Label>
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
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilter}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Reset
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
          title="Total Invoice"
          value={formatCurrency(summary.totalInvoiceAmount)}
          description="Invoice non-void berdasarkan issue date"
          icon={FileText}
        />

        <MetricCard
          title="Invoice Paid"
          value={formatCurrency(summary.totalPaidAmount)}
          description="Paid amount dari invoice"
          icon={Banknote}
        />

        <MetricCard
          title="Payment Received"
          value={formatCurrency(summary.totalPaymentAmount)}
          description="Confirmed payments berdasarkan payment date"
          icon={Wallet}
        />

        <MetricCard
          title="Total Expense"
          value={formatCurrency(summary.totalExpenseAmount)}
          description="Expense non-rejected berdasarkan expense date"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Outstanding"
          value={formatCurrency(summary.totalOutstandingAmount)}
          description="Remaining receivables"
          icon={Wallet}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Estimated Gross Profit</CardTitle>
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
              Total invoice dikurangi expense non-rejected.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Estimated Cash Profit</CardTitle>
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
              Confirmed payment dikurangi paid expense.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Draft</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.draftInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Issued</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.issuedInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Paid</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.paidInvoices}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Void</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.voidInvoices}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-5">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Draft</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.draftExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Submitted</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.submittedExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Approved</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.approvedExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Paid</p>
              <p className="mt-1 text-2xl font-semibold">
                {summary.paidExpenses}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground">Rejected</p>
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
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
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
                      <Badge variant="outline">{invoice.status}</Badge>
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
                      Belum ada invoice pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-medium">{payment.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.method}
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
                      Belum ada payment pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
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
                      <Badge variant="outline">{expense.status}</Badge>
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
                      Belum ada expense pada periode ini.
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
