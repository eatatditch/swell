import { cn } from "@/lib/utils";
import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
  UGC_STATUS_COLORS,
  UGC_STATUS_LABELS,
} from "@/lib/constants/catering";
import type {
  CateringEventStatus,
  CateringInvoiceStatus,
  CateringLeadStatus,
  CateringQuoteStatus,
  EventPaymentStatus,
  EventUgcStatus,
} from "@/lib/types/database";

const PILL =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function LeadStatusBadge({
  status,
  className,
}: {
  status: CateringLeadStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, LEAD_STATUS_COLORS[status], className)}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function EventStatusBadge({
  status,
  className,
}: {
  status: CateringEventStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, EVENT_STATUS_COLORS[status], className)}>
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: EventPaymentStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, PAYMENT_STATUS_COLORS[status], className)}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function UgcStatusBadge({
  status,
  className,
}: {
  status: EventUgcStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, UGC_STATUS_COLORS[status], className)}>
      {UGC_STATUS_LABELS[status]}
    </span>
  );
}

export function QuoteStatusBadge({
  status,
  className,
}: {
  status: CateringQuoteStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, QUOTE_STATUS_COLORS[status], className)}>
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: CateringInvoiceStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, INVOICE_STATUS_COLORS[status], className)}>
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
