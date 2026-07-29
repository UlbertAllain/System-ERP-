export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;

  clientId: string;
  clientName: string;
  clientCompany: string | null;

  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;

  status: InvoiceStatus;

  issueDate: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;

  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  notes: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type InvoiceDetail = InvoiceListItem & {
  lineItems: InvoiceLineItem[];
};
