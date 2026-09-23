"use client";

import { FilterX, Search } from "lucide-react";

import { getBusinessLabel } from "@/lib/ui/business-labels";
import type { ProjectPriority, ProjectStatus } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProjectManagementFiltersProps = {
  statuses: readonly ProjectStatus[];
  priorities: readonly ProjectPriority[];
  search: string;
  status: string;
  priority: string;
  pageSize: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
};

export function ProjectManagementFilters({
  statuses,
  priorities,
  search,
  status,
  priority,
  pageSize,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onPageSizeChange,
  onApply,
  onReset,
}: ProjectManagementFiltersProps) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 xl:grid-cols-[1fr_180px_180px_140px_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onApply();
              }
            }}
            placeholder="Cari kode, proyek, pelanggan, atau PIC"
            className="pl-9"
          />
        </div>

        <select
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">Semua status</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {getBusinessLabel(item)}
            </option>
          ))}
        </select>

        <select
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value)}
        >
          <option value="">Semua prioritas</option>
          {priorities.map((item) => (
            <option key={item} value={item}>
              {getBusinessLabel(item)}
            </option>
          ))}
        </select>

        <select
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={String(size)}>
              {size} / halaman
            </option>
          ))}
        </select>

        <Button type="button" onClick={onApply}>
          Terapkan
        </Button>

        <Button type="button" variant="outline" onClick={onReset}>
          <FilterX className="size-4" />
          Atur Ulang
        </Button>
      </CardContent>
    </Card>
  );
}
