import type {
  FormField,
  FormSchema,
  FormSettings,
  LeadFieldMapping,
  ContactFieldMapping,
} from "@/lib/types/database";

export const FIELD_TYPE_LABELS: Record<FormField["type"], string> = {
  text: "Short text",
  textarea: "Paragraph",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  time: "Time",
  select: "Dropdown",
  radio: "Single choice",
  checkbox_group: "Multiple choice",
  checkbox: "Checkbox",
  hidden: "Hidden",
};

export const LEAD_FIELD_LABELS: Record<LeadFieldMapping, string> = {
  event_type: "Event type",
  desired_date: "Desired date",
  party_size: "Party size",
  budget_low: "Budget (low)",
  budget_high: "Budget (high)",
  estimated_value: "Estimated deal value",
  notes: "Notes",
  source: "Source",
};

export const CONTACT_FIELD_LABELS: Record<ContactFieldMapping, string> = {
  full_name: "Contact name",
  email: "Contact email",
  phone: "Contact phone",
  company: "Company",
};

// Default schema for a brand-new form.
export function defaultSchema(): FormSchema {
  return {
    rows: [
      {
        id: cryptoId(),
        columns: 1,
        fields: [
          {
            id: cryptoId(),
            type: "text",
            label: "Your name",
            key: "name",
            required: true,
            contactField: "full_name",
          },
        ],
      },
      {
        id: cryptoId(),
        columns: 2,
        fields: [
          {
            id: cryptoId(),
            type: "email",
            label: "Email",
            key: "email",
            required: true,
            contactField: "email",
          },
          {
            id: cryptoId(),
            type: "phone",
            label: "Phone",
            key: "phone",
            required: false,
            contactField: "phone",
          },
        ],
      },
      {
        id: cryptoId(),
        columns: 2,
        fields: [
          {
            id: cryptoId(),
            type: "date",
            label: "Event date",
            key: "event_date",
            required: false,
            leadField: "desired_date",
          },
          {
            id: cryptoId(),
            type: "number",
            label: "Guest count",
            key: "guests",
            required: false,
            leadField: "party_size",
          },
        ],
      },
      {
        id: cryptoId(),
        columns: 1,
        fields: [
          {
            id: cryptoId(),
            type: "select",
            label: "Event type",
            key: "event_type",
            required: false,
            leadField: "event_type",
            options: [
              { label: "Wedding", value: "wedding" },
              { label: "Corporate", value: "corporate" },
              { label: "Birthday", value: "birthday" },
              { label: "Holiday", value: "holiday" },
              { label: "Other", value: "other" },
            ],
          },
        ],
      },
      {
        id: cryptoId(),
        columns: 1,
        fields: [
          {
            id: cryptoId(),
            type: "textarea",
            label: "Tell us about your event",
            key: "notes",
            required: false,
            leadField: "notes",
          },
        ],
      },
    ],
  };
}

export function defaultSettings(): FormSettings {
  return {
    submitLabel: "Send inquiry",
    successMessage:
      "Thanks — we'll be in touch within one business day to talk through the details.",
    honeypotKey: "website",
  };
}

// Walk a schema and flatten fields in display order.
export function allFields(schema: FormSchema): FormField[] {
  return schema.rows.flatMap((r) => r.fields);
}

// Slug-safe random ID for rows/fields. Browsers and Node 18+ both ship
// crypto.randomUUID(); fall back to Math.random for SSR edge cases.
export function cryptoId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// Coerce a submitted payload into a {contact, lead} shape based on which
// fields map to contact/lead columns. Anything unmapped stays in payload.
export interface MappedSubmission {
  contact: {
    full_name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  lead: {
    event_type?: string | null;
    desired_date?: string | null;
    party_size?: number | null;
    budget_low_cents?: number | null;
    budget_high_cents?: number | null;
    estimated_value_cents?: number | null;
    notes?: string | null;
    source?: string | null;
  };
}

export function mapSubmissionToLead(
  schema: FormSchema,
  payload: Record<string, unknown>,
): MappedSubmission {
  const contact: MappedSubmission["contact"] = {};
  const lead: MappedSubmission["lead"] = {};

  for (const field of allFields(schema)) {
    const raw = payload[field.key];
    if (raw === undefined || raw === null || raw === "") continue;
    const str = String(raw).trim();
    if (!str) continue;

    if (field.contactField) {
      contact[field.contactField] = str;
    }

    if (field.leadField) {
      switch (field.leadField) {
        case "party_size": {
          const n = Number.parseInt(str, 10);
          if (Number.isFinite(n) && n >= 0) lead.party_size = n;
          break;
        }
        case "budget_low":
        case "budget_high":
        case "estimated_value": {
          const n = Number.parseFloat(str);
          if (Number.isFinite(n) && n >= 0) {
            const cents = Math.round(n * 100);
            if (field.leadField === "budget_low") lead.budget_low_cents = cents;
            if (field.leadField === "budget_high")
              lead.budget_high_cents = cents;
            if (field.leadField === "estimated_value")
              lead.estimated_value_cents = cents;
          }
          break;
        }
        case "desired_date": {
          // Accept ISO date or yyyy-mm-dd; postgres date column will parse.
          lead.desired_date = str;
          break;
        }
        default: {
          lead[field.leadField] = str;
        }
      }
    }
  }

  // If notes wasn't mapped explicitly, build a fallback notes blob with all
  // unmapped non-empty fields so the operator sees them on the lead.
  if (lead.notes == null) {
    const lines: string[] = [];
    for (const field of allFields(schema)) {
      if (field.leadField || field.contactField) continue;
      if (field.type === "hidden") continue;
      const raw = payload[field.key];
      if (raw === undefined || raw === null || raw === "") continue;
      const value = Array.isArray(raw) ? raw.join(", ") : String(raw);
      if (!value.trim()) continue;
      lines.push(`${field.label}: ${value}`);
    }
    if (lines.length > 0) lead.notes = lines.join("\n");
  }

  return { contact, lead };
}

export interface ValidationError {
  key: string;
  message: string;
}

// Validate a submission against a schema. Returns ordered list of errors.
export function validateSubmission(
  schema: FormSchema,
  payload: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of allFields(schema)) {
    if (field.type === "hidden") continue;
    const raw = payload[field.key];
    const empty =
      raw === undefined ||
      raw === null ||
      raw === "" ||
      (Array.isArray(raw) && raw.length === 0);

    if (field.required && empty) {
      errors.push({ key: field.key, message: `${field.label} is required` });
      continue;
    }
    if (empty) continue;

    if (field.type === "email") {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw));
      if (!ok) errors.push({ key: field.key, message: "Enter a valid email" });
    } else if (field.type === "number") {
      const n = Number.parseFloat(String(raw));
      if (!Number.isFinite(n)) {
        errors.push({ key: field.key, message: `${field.label} must be a number` });
      } else {
        if (field.min != null && n < field.min) {
          errors.push({ key: field.key, message: `${field.label} must be ≥ ${field.min}` });
        }
        if (field.max != null && n > field.max) {
          errors.push({ key: field.key, message: `${field.label} must be ≤ ${field.max}` });
        }
      }
    } else if (field.type === "text" || field.type === "textarea") {
      const s = String(raw);
      if (field.minLength != null && s.length < field.minLength) {
        errors.push({
          key: field.key,
          message: `${field.label} must be at least ${field.minLength} characters`,
        });
      }
      if (field.maxLength != null && s.length > field.maxLength) {
        errors.push({
          key: field.key,
          message: `${field.label} must be at most ${field.maxLength} characters`,
        });
      }
    }
  }
  return errors;
}
