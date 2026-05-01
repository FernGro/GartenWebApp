import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Garten Dienstplan",
    short_name: "Garten",
    description: "Gartenaufgaben fair planen und erledigen",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3f5ec",
    theme_color: "#2f6b3f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
