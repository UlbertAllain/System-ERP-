import { CompanySettingClient } from "@/features/settings/components/company-setting-client";
import { getCompanySettingAction } from "@/features/settings/actions";
import { requireAnyPagePermission } from "@/lib/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompanySettingsPage() {
  await requireAnyPagePermission(["setting.system.read"]);

  const settingResult = await getCompanySettingAction();

  if (!settingResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Setting Error</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {settingResult.message}
        </CardContent>
      </Card>
    );
  }

  return <CompanySettingClient setting={settingResult.data} />;
}
