"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-serif text-3xl">Something broke in the studio</h1>
      <p className="mt-3 text-[#4a433a]">{error.message || "Try the page again."}</p>
      <button className="mt-6 underline" onClick={reset} type="button">
        Retry
      </button>
    </div>
  );
}
