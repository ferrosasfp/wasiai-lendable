"use client";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-paper">
      <h1 className="serif text-3xl mb-3">Sin conexión</h1>
      <p className="text-sm text-muted mb-6">
        El demo determinístico sigue funcionando.
      </p>
      <button
        type="button"
        onClick={() => location.reload()}
        className="bg-ink text-paper px-6 py-3 mono text-xs uppercase tracking-widest"
      >
        Reintentar
      </button>
    </main>
  );
}
