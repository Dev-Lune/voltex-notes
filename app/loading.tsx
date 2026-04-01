export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0f1117" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{
            borderColor: "#1e2030",
            borderTopColor: "#3b8ef5",
          }}
        />
        <span className="text-sm" style={{ color: "#666" }}>
          Loading…
        </span>
      </div>
    </div>
  );
}
