"use client";

import {
  ChevronLeft,
  ChevronRight,
  Edit,
  FolderKanban,
  Trash2,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type {
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProjectManagementTableProps = {
  projects: ProjectListItem[];
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  isPending: boolean;
  onEdit: (project: ProjectListItem) => void;
  onDelete: (project: ProjectListItem) => void;
  onPageChange: (page: number) => void;
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

function getStatusVariant(status: ProjectStatus) {
  if (status === "IN_PROGRESS" || status === "COMPLETED") {
    return "secondary" as const;
  }

  if (status === "CANCELLED" || status === "ARCHIVED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function getPriorityVariant(priority: ProjectPriority) {
  if (priority === "URGENT" || priority === "HIGH") {
    return "destructive" as const;
  }

  if (priority === "MEDIUM") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function ProjectManagementTable({
  projects,
  pagination,
  isPending,
  onEdit,
  onDelete,
  onPageChange,
}: ProjectManagementTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="size-5" />
            Daftar Proyek
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {pagination.totalItems} records - page {pagination.page} of{" "}
            {pagination.totalPages}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyek</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Anggaran</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Penagihan</TableHead>
                <TableHead className="w-[160px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectCode}
                      </p>
                      {project.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{project.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.clientCompany ?? "-"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {project.picName ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.picEmployeeId ?? "-"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>{formatCurrency(project.budget)}</TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(project.startDate)}</p>
                      <p className="text-muted-foreground">
                        to {formatDate(project.endDate)}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusVariant(project.status)}>
                      {getBusinessLabel(project.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getPriorityVariant(project.priority)}>
                      {getBusinessLabel(project.priority)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {getBusinessLabel(project.billingType)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(project)}
                        disabled={isPending}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(project)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Belum ada proyek.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {projects.length} dari {pagination.totalItems} proyek
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Berikutnya
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
