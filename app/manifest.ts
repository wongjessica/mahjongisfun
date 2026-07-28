import type { MetadataRoute } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Web app manifest. `display: standalone` (plus the apple meta tags in the
 * layout) is what makes "Add to Home Screen" launch the game chrome-free on
 * iOS -- the real fullscreen path there, since iOS Safari can't fullscreen an
 * element. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hong Kong Mahjong",
    short_name: "Mahjong",
    description: "Hong Kong-style mahjong vs. bots and friends",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#0f1f19",
    theme_color: "#14663d",
    orientation: "any",
    icons: [
      { src: `${basePath}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
