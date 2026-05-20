"use client";

import { useEffect, useState } from "react";

import type {
  FormField,
  FormSchema,
  FormSettings,
} from "@/lib/types/database";

interface PublicFormProps {
  slug: string;
  schema: FormSchema;
  settings: FormSettings;
  embed: boolean;
}

export function PublicForm({ slug, schema, settings, embed }: PublicFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // In embed mode, post height changes to the parent so the iframe can resize.
  useEffect(() => {
    if (!embed) return;
    const post = () => {
      try {
        window.parent.postMessage(
          {
            type: "swell-form-resize",
            slug,
            height: document.documentElement.scrollHeight,
          },
          "*",
        );
      } catch {
        /* parent unavailable */
      }
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embed, slug, success]);

  function setValue(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const { [key]: _, ...rest } = e;
        return rest;
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: values,
          source_url:
            typeof window !== "undefined" && window.parent !== window
              ? document.referrer || window.location.href
              : window.location.href,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: { key: string; message: string }[];
        successMessage?: string | null;
        redirectUrl?: string | null;
      };
      if (!res.ok || !data.ok) {
        if (data.errors && data.errors.length > 0) {
          const map: Record<string, string> = {};
          for (const e of data.errors) map[e.key] = e.message;
          setErrors(map);
        }
        setGlobalError(data.error ?? "Submission failed");
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setSuccess(true);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 leading-[3rem] text-emerald-700">
          ✓
        </div>
        <h2 className="font-display text-2xl font-bold">Thanks!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {settings.successMessage ??
            "We'll be in touch shortly to talk through the details."}
        </p>
      </div>
    );
  }

  const submitLabel = settings.submitLabel ?? "Send inquiry";

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      {schema.rows.map((row) => (
        <div
          key={row.id}
          className={
            row.columns === 3
              ? "grid gap-4 sm:grid-cols-3"
              : row.columns === 2
                ? "grid gap-4 sm:grid-cols-2"
                : "grid gap-4 grid-cols-1"
          }
        >
          {row.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              onChange={(v) => setValue(field.key, v)}
            />
          ))}
        </div>
      ))}

      {/* Honeypot — hidden from real users, bots fill it. */}
      <div className="hidden" aria-hidden="true">
        <label>
          {settings.honeypotKey ?? "website"}
          <input
            type="text"
            name={settings.honeypotKey ?? "website"}
            tabIndex={-1}
            autoComplete="off"
            value={(values[settings.honeypotKey ?? "website"] as string) ?? ""}
            onChange={(e) =>
              setValue(settings.honeypotKey ?? "website", e.target.value)
            }
          />
        </label>
      </div>

      {globalError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {globalError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error: string | undefined;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "hidden") {
    return (
      <input
        type="hidden"
        name={field.key}
        value={(value as string) ?? field.defaultValue ?? ""}
        onChange={() => {
          /* fixed */
        }}
      />
    );
  }

  const baseInputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  const labelEl = (
    <label
      htmlFor={field.id}
      className="block text-sm font-semibold text-foreground"
    >
      {field.label}
      {field.required ? <span className="text-rose-600"> *</span> : null}
    </label>
  );

  const errorEl = error ? (
    <p className="mt-1 text-xs text-rose-700">{error}</p>
  ) : null;

  const helpEl = field.helpText ? (
    <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
  ) : null;

  if (field.type === "textarea") {
    return (
      <div>
        {labelEl}
        <textarea
          id={field.id}
          rows={4}
          placeholder={field.placeholder ?? ""}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClass} mt-1.5`}
        />
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {labelEl}
        <select
          id={field.id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClass} mt-1.5`}
        >
          <option value="">{field.placeholder ?? "Choose…"}</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "radio") {
    const current = (value as string) ?? "";
    return (
      <div>
        {labelEl}
        <div className="mt-1.5 space-y-1.5">
          {(field.options ?? []).map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={field.key}
                value={o.value}
                checked={current === o.value}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "checkbox_group") {
    const current = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {labelEl}
        <div className="mt-1.5 space-y-1.5">
          {(field.options ?? []).map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={current.includes(o.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...current, o.value]);
                  } else {
                    onChange(current.filter((x) => x !== o.value));
                  }
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const checked = value === true || value === "true";
    return (
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
          {field.required ? <span className="text-rose-600"> *</span> : null}
        </label>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  // text, email, phone, number, date, time — single input.
  const inputType =
    field.type === "phone"
      ? "tel"
      : field.type === "text"
        ? "text"
        : field.type;

  return (
    <div>
      {labelEl}
      <input
        id={field.id}
        type={inputType}
        placeholder={field.placeholder ?? ""}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInputClass} mt-1.5`}
        min={field.min}
        max={field.max}
        minLength={field.minLength}
        maxLength={field.maxLength}
        // Snap time pickers to 15-minute increments so guests can't pick
        // 6:43 PM. 900 = 15 * 60 seconds.
        step={field.type === "time" ? 900 : undefined}
        inputMode={
          field.type === "phone"
            ? "tel"
            : field.type === "number"
              ? "numeric"
              : field.type === "email"
                ? "email"
                : undefined
        }
      />
      {helpEl}
      {errorEl}
    </div>
  );
}
