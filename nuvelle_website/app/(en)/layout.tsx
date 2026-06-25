import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  title: "Nuvelle - The Home of AI Shorts",
  description:
    "Nuvelle is the home of premium AI-crafted vertical dramas. Billionaires, werewolves, second chances and sweet revenge.",
  other: {
    "facebook-domain-verification": "14ygh3kdihl9u9q638hyy6zls7gqzr",
  },
};

export default function EnglishRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
