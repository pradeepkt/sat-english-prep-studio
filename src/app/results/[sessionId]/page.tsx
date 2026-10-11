import { Suspense } from "react"
import { ResultsView } from "@/components/results/results-view"

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16 text-sm text-muted-foreground">Scoring the session…</div>}>
      <ResultsView />
    </Suspense>
  )
}
