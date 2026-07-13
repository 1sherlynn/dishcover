import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dishcover",
    short_name: "Dishcover",
    description:
      "Turn what's already in your kitchen into recipes — with honest nutrition, every time.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf3e3",
    theme_color: "#faf3e3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
