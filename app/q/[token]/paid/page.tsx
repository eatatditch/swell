import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { token: string };
}

export default function QuoteDepositPaidPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight">
          You&apos;re booked!
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your deposit has been received. We&apos;ll be in touch shortly to
          finalize the menu, headcount, and logistics.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          Reference:{" "}
          <Link
            href={`/q/${encodeURIComponent(params.token)}`}
            className="underline-offset-2 hover:underline"
          >
            view your quote
          </Link>
        </p>
      </div>
    </main>
  );
}
