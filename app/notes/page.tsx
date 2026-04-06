import type { Metadata } from "next";
import ObsidianApp from "@/components/obsidian/ObsidianApp";

export const metadata: Metadata = {
  title: "Web App",
  description:
    "Use Voltex Notes in the browser for markdown notes, graph view, backlinks, and real-time sync.",
  alternates: {
    canonical: "/notes",
  },
  openGraph: {
    title: "Voltex Notes Web App",
    description:
      "Use Voltex Notes in the browser for markdown notes, graph view, backlinks, and real-time sync.",
    url: "/notes",
  },
};

export default function NotesPage() {
  return <ObsidianApp />;
}
