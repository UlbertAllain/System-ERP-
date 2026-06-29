import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function TasksPage() {
  return (
    <ModulePlaceholder
      title="Tasks"
      description="Task management module."
      permissions={["task.read", "task.read_all", "task.read_assigned"]}
    />
  );
}
