"use client";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { ReportsDashboardSummary } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportsRecentTablesProps = {
  summary: Pick<
    ReportsDashboardSummary,
    "recentInvoices" | "recentTasks" | "recentProjects" | "recentExpenses"
  >;
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

export function ReportsRecentTables({ summary }: ReportsRecentTablesProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
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
                      <Badge variant="outline">
                        {getBusinessLabel(invoice.status)}
                      </Badge>
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
            <CardTitle>Tugas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tugas</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Tenggat: {formatDate(task.dueDate)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{task.projectCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.projectName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getBusinessLabel(task.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {summary.recentTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada tugas pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proyek Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectCode}
                      </p>
                    </TableCell>
                    <TableCell>{project.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getBusinessLabel(project.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}

                {summary.recentProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada proyek pada periode ini.
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
                      <Badge variant="outline">
                        {getBusinessLabel(expense.status)}
                      </Badge>
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
    </>
  );
}
