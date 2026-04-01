import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0f1117", color: "#e0e0e0" }}
    >
      <div className="text-center max-w-md px-6">
        <FileQuestion
          size={64}
          className="mx-auto mb-6"
          style={{ color: "#3b8ef5" }}
        />
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#fff" }}>
          404
        </h1>
        <p className="text-lg mb-1" style={{ color: "#ccc" }}>
          Page not found
        </p>
        <p className="text-sm mb-8" style={{ color: "#666" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#3b8ef5", color: "#fff" }}
        >
          Back to Voltex Notes
        </Link>
      </div>
    </div>
  );
}
