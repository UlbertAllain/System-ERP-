"use client";

import { useState, useTransition } from "react";
import { Building2, ImageIcon, Loader2, Save } from "lucide-react";

import {
  updateCompanyLogoAction,
  updateCompanySettingAction,
} from "@/features/settings/actions";
import {
  uploadImageToCloudinaryUnsigned,
  validateImageFile,
} from "@/lib/cloudinary/client";
import type { CompanySetting } from "@/types/company-setting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CompanySettingClientProps = {
  setting: CompanySetting;
};

type CompanySettingFormState = {
  companyName: string;
  legalName: string;
  brandName: string;

  email: string;
  phone: string;
  website: string;
  address: string;

  taxNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;

  invoicePrefix: string;
  expensePrefix: string;

  currency: string;
  timezone: string;

  invoiceNotes: string;
  paymentInstructions: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWebsiteInput(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function createInitialForm(setting: CompanySetting): CompanySettingFormState {
  return {
    companyName: setting.companyName,
    legalName: setting.legalName ?? "",
    brandName: setting.brandName ?? "",

    email: setting.email ?? "",
    phone: setting.phone ?? "",
    website: setting.website ?? "",
    address: setting.address ?? "",

    taxNumber: setting.taxNumber ?? "",
    bankName: setting.bankName ?? "",
    bankAccountName: setting.bankAccountName ?? "",
    bankAccountNumber: setting.bankAccountNumber ?? "",

    invoicePrefix: setting.invoicePrefix,
    expensePrefix: setting.expensePrefix,

    currency: setting.currency,
    timezone: setting.timezone,

    invoiceNotes: setting.invoiceNotes ?? "",
    paymentInstructions: setting.paymentInstructions ?? "",
  };
}

export function CompanySettingClient({ setting }: CompanySettingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CompanySettingFormState>(() =>
    createInitialForm(setting),
  );
  const [logoUrl, setLogoUrl] = useState(setting.logo?.url ?? null);

  function updateForm<K extends keyof CompanySettingFormState>(
    key: K,
    value: CompanySettingFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    setMessage(null);

    startTransition(async () => {
      const result = await updateCompanySettingAction({
        companyName: form.companyName,
        legalName: emptyToNull(form.legalName),
        brandName: emptyToNull(form.brandName),

        email: emptyToNull(form.email),
        phone: emptyToNull(form.phone),
        website: normalizeWebsiteInput(form.website),
        address: emptyToNull(form.address),

        taxNumber: emptyToNull(form.taxNumber),
        bankName: emptyToNull(form.bankName),
        bankAccountName: emptyToNull(form.bankAccountName),
        bankAccountNumber: emptyToNull(form.bankAccountNumber),

        invoicePrefix: form.invoicePrefix,
        expensePrefix: form.expensePrefix,

        currency: form.currency,
        timezone: form.timezone,

        invoiceNotes: emptyToNull(form.invoiceNotes),
        paymentInstructions: emptyToNull(form.paymentInstructions),
      });

      setMessage(result.message);

      if (result.success) {
        setForm(createInitialForm(result.data));
        setLogoUrl(result.data.logo?.url ?? null);
      }
    });
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) {
      return;
    }

    setMessage(null);

    const validationMessage = validateImageFile(file, "clientLogo");

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setIsUploadingLogo(true);

      const uploadedImage = await uploadImageToCloudinaryUnsigned(
        file,
        "nexty/settings/company/logo",
      );

      const result = await updateCompanyLogoAction({
        url: uploadedImage.url,
        publicId: uploadedImage.publicId,
      });

      setMessage(result.message);

      if (result.success) {
        setLogoUrl(result.data.logo?.url ?? uploadedImage.url);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload logo gagal.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  const saving = isPending || isUploadingLogo;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Settings
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Company Settings
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kelola identitas perusahaan, invoice prefix, bank account, dan
          instruksi pembayaran.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              Company Logo
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <Building2 className="mx-auto mb-3 size-10" />
                  Belum ada logo
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="companyLogo">Upload Logo</Label>
              <Input
                id="companyLogo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                onChange={(event) =>
                  handleLogoUpload(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                Format JPG, PNG, atau WEBP. Maksimal 2 MB.
              </p>
            </div>

            {isUploadingLogo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Uploading logo...
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(event) =>
                      updateForm("companyName", event.target.value)
                    }
                    placeholder="NEXTY Labs"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={form.legalName}
                    onChange={(event) =>
                      updateForm("legalName", event.target.value)
                    }
                    placeholder="PT NEXTY Labs Indonesia"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={form.brandName}
                    onChange={(event) =>
                      updateForm("brandName", event.target.value)
                    }
                    placeholder="NEXTY Labs"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    placeholder="hello@nextylabs.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    placeholder="+62..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(event) =>
                      updateForm("website", event.target.value)
                    }
                    placeholder="https://nextylabs.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  placeholder="Alamat perusahaan"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Finance & Invoice Defaults</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input
                    id="invoicePrefix"
                    value={form.invoicePrefix}
                    onChange={(event) =>
                      updateForm("invoicePrefix", event.target.value)
                    }
                    placeholder="INV"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expensePrefix">Expense Prefix</Label>
                  <Input
                    id="expensePrefix"
                    value={form.expensePrefix}
                    onChange={(event) =>
                      updateForm("expensePrefix", event.target.value)
                    }
                    placeholder="EXP"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(event) =>
                      updateForm("currency", event.target.value)
                    }
                    placeholder="IDR"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={form.timezone}
                    onChange={(event) =>
                      updateForm("timezone", event.target.value)
                    }
                    placeholder="Asia/Jakarta"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="taxNumber">Tax Number</Label>
                  <Input
                    id="taxNumber"
                    value={form.taxNumber}
                    onChange={(event) =>
                      updateForm("taxNumber", event.target.value)
                    }
                    placeholder="NPWP / Tax ID"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={form.bankName}
                    onChange={(event) =>
                      updateForm("bankName", event.target.value)
                    }
                    placeholder="BCA / Mandiri / BRI"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="bankAccountName">Bank Account Name</Label>
                  <Input
                    id="bankAccountName"
                    value={form.bankAccountName}
                    onChange={(event) =>
                      updateForm("bankAccountName", event.target.value)
                    }
                    placeholder="PT NEXTY Labs Indonesia"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    value={form.bankAccountNumber}
                    onChange={(event) =>
                      updateForm("bankAccountNumber", event.target.value)
                    }
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invoiceNotes">Default Invoice Notes</Label>
                <Textarea
                  id="invoiceNotes"
                  value={form.invoiceNotes}
                  onChange={(event) =>
                    updateForm("invoiceNotes", event.target.value)
                  }
                  placeholder="Terima kasih atas kerja samanya."
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="paymentInstructions">
                  Payment Instructions
                </Label>
                <Textarea
                  id="paymentInstructions"
                  value={form.paymentInstructions}
                  onChange={(event) =>
                    updateForm("paymentInstructions", event.target.value)
                  }
                  placeholder="Mohon lakukan pembayaran ke rekening perusahaan."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Company Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
