import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckSquare2,
  Flag,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ProjectWorkspaceAccess = {
  projects: boolean;
  members: boolean;
  milestones: boolean;
  tasks: boolean;
};

type ProjectWorkspaceNavProps = {
  active: "projects" | "members" | "milestones" | "tasks";
  access: ProjectWorkspaceAccess;
};

const items = [
  {
    key: "projects" as const,
    step: "01",
    label: "Proyek",
    description: "Identitas dan jadwal",
    href: "/projects",
    icon: BriefcaseBusiness,
  },
  {
    key: "members" as const,
    step: "02",
    label: "Anggota",
    description: "Tim yang terlibat",
    href: "/projects/members",
    icon: UsersRound,
  },
  {
    key: "milestones" as const,
    step: "03",
    label: "Tahapan",
    description: "Target utama proyek",
    href: "/projects/milestones",
    icon: Flag,
  },
  {
    key: "tasks" as const,
    step: "04",
    label: "Tugas",
    description: "Pekerjaan harian",
    href: "/projects/tasks",
    icon: CheckSquare2,
  },
];

export function ProjectWorkspaceNav({
  active,
  access,
}: ProjectWorkspaceNavProps) {
  const visibleItems = items.filter((item) => access[item.key]);

  if (visibleItems.length <= 1) {
    return null;
  }

  return (
    <section aria-label="Alur kerja proyek" className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md border bg-card px-4 py-3 transition-all",
              isActive
                ? "border-gold/45 bg-gold/[0.07] shadow-[inset_3px_0_0_#e1a94d]"
                : "hover:border-gold/30 hover:bg-secondary/45",
            )}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border",
                isActive
                  ? "border-gold/25 bg-gold/10 text-gold"
                  : "border-border bg-secondary/55 text-muted-foreground group-hover:text-gold",
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Langkah {item.step}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{item.label}</p>
              <p className="truncate text-[0.68rem] text-muted-foreground">
                {item.description}
              </p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
