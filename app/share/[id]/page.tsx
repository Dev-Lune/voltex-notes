import type { Metadata } from "next";
import SharedNoteClient from "./SharedNoteClient";

interface FirestoreField {
  stringValue?: string;
}

interface FirestoreDoc {
  fields?: {
    title?: FirestoreField;
    content?: FirestoreField;
    sharedByName?: FirestoreField;
  };
}

async function fetchSharedNote(shareId: string): Promise<FirestoreDoc | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/shared/${encodeURIComponent(shareId)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return (await res.json()) as FirestoreDoc;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const doc = await fetchSharedNote(id);
  const title = doc?.fields?.title?.stringValue || "Shared Note";
  const content = doc?.fields?.content?.stringValue || "";
  const sharedBy = doc?.fields?.sharedByName?.stringValue || "Someone";
  const description =
    content.replace(/[#*`>\[\]()_~\-]/g, "").slice(0, 160).trim() ||
    `A note shared by ${sharedBy} on Voltex Notes`;

  return {
    title: `${title} — Voltex Notes`,
    description,
    openGraph: {
      title,
      description,
      siteName: "Voltex Notes",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function SharedNotePage() {
  return <SharedNoteClient />;
}
