import type { PermissionSlug } from "@/constants/permissions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  permissions: PermissionSlug[];
};

export async function ModulePlaceholder({
  title,
  description,
  permissions,
}: ModulePlaceholderProps) {
  await requireAnyPagePermission(permissions);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Module
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backend Module Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Route dan permission guard sudah siap. CRUD/service layer module ini
          akan dibuat pada phase berikutnya.
        </CardContent>
      </Card>
    </div>
  );
}
