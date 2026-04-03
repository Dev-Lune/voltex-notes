export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0f1117" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#3b8ef5" fillOpacity="0.12" />
            <path d="M8 16l4-8 4 8-4 8z" fill="#3b8ef5" />
            <path d="M16 16l4-8 4 8-4 8z" fill="#3b8ef5" fillOpacity="0.5" />
          </svg>
          <span style={{ color: "#d4d8e8", fontSize: 18, fontWeight: 600, letterSpacing: "0.3px" }}>
            Voltex Notes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#3b8ef5", animationDelay: "0ms" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#3b8ef5", animationDelay: "200ms" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#3b8ef5", animationDelay: "400ms" }}
          />
        </div>
      </div>
    </div>
  );
}
