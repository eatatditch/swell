import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { appUrl } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PNG QR code that points at the hosted form. Used for table tents / print
// where you want a guest to scan and land on the inquiry form.
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.toLowerCase();
  if (!slug) {
    return new NextResponse("Missing slug", { status: 400 });
  }

  const host = appUrl().replace(/\/$/, "");
  const target = `${host}/f/${encodeURIComponent(slug)}`;

  // 600px is a good balance between print quality and file size for a
  // table-tent-sized QR. High error correction so the code still scans if
  // the print gets a coffee ring on it.
  const png = await QRCode.toBuffer(target, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 600,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  // Coerce Node Buffer → Uint8Array so Next's Response constructor accepts it.
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Disposition": `inline; filename="swell-form-${slug}.png"`,
    },
  });
}
