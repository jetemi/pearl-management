import type { MetadataRoute } from "next";

const estateName = process.env.NEXT_PUBLIC_ESTATE_NAME ?? "Estate Management";

export default function manifest(): MetadataRoute.Manifest {
  const shortName = estateName.length > 12 ? "Estate" : estateName;

  return {
    name: estateName,
    short_name: shortName,
    description:
      "Estate management — service charge, diesel fund, units, and resident requests.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
