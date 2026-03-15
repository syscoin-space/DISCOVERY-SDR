import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/brand`, {
      next: { revalidate: 300 }, // cache 5min
    });

    if (!res.ok) return fallbackFavicon();

    const brand = await res.json();

    if (brand.favicon_url && brand.favicon_url.startsWith("data:")) {
      // Parse data URI: data:image/png;base64,xxxxx
      const match = brand.favicon_url.match(
        /^data:(image\/[a-z+]+);base64,(.+)$/i
      );
      if (match) {
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          },
        });
      }
    }

    // No custom favicon — redirect to default icon
    return fallbackFavicon();
  } catch {
    return fallbackFavicon();
  }
}

function fallbackFavicon() {
  // Serve a simple SVG favicon with the brand accent color
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#2E86AB"/>
    <text x="16" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="bold" fill="white">R</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
