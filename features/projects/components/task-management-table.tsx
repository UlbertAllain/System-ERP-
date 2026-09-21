"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  MessageSquare,
  Trash2,
} from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { TaskListItem, TaskPriority, TaskStatus } from "@/types/task";
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

type TaskManagementTableProps = {
  tasks: TaskListItem[];
  pagination: {
    totalItems: number;
    page: number;
    totalPages: number;
  };
  canReadComments: boolean;
  isPending: boolean;
  onOpenComments: (task: TaskListItem) => void;
  onEdit: (task: TaskListItem) => void;
  onDelete: (task: TaskListItem) => void;
  onPageChange: (page: number) => void;
};

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

function getStatusVariant(status: TaskStatus) {
  if (status === "DONE") {
    return "secondary" as const;
  }

  if (status === "BLOCKED" || status === "CANCELLED") {
    return "destructive" as const;
  }

  return "outline" as const;
}

function getPriorityVariant(priority: TaskPriority) {
  if (priority === "URGENT" || priority === "HIGH") {
    return "destructive" as const;
  }

  if (priority === "MEDIUM") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function TaskManagementTable({
  tasks,
  pagination,
  canReadComments,
  isPending,
  onOpenComments,
  onEdit,
  onDelete,
  onPageChange,
}: TaskManagementTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5" />
            Daftar Tugas
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
                <TableHead>Tugas</TableHead>
                <TableHead>Proyek</TableHead>
                <TableHead>Tahapan</TableHead>
                <TableHead>Penanggung Jawab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Tenggat</TableHead>
                <TableHead className="w-[200px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Urutan: {task.order}
                      </p>
                      {task.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="font-medium">{task.projectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.projectCode}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>{task.milestoneTitle ?? "-"}</TableCell>
                  <TableCell>
                    {task.assigneeName ?? "Belum ditugaskan"}
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusVariant(task.status)}>
                      {getBusinessLabel(task.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getPriorityVariant(task.priority)}>
                      {getBusinessLabel(task.priority)}
                    </Badge>
                  </TableCell>

                  <TableCell>{formatDate(task.dueDate)}</TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      {canReadComments ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenComments(task)}
                          disabled={isPending}
                          title="Buka komentar"
                        >
                          <MessageSquare className="size-4" />
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(task)}
                        disabled={isPending}
                      >
                        <Edit className="size-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(task)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Belum ada tugas.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {tasks.length} dari {pagination.totalItems} tugas
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
