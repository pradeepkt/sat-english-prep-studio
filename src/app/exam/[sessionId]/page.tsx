import { Suspense } from "react"
import { ExamRoom } from "@/components/exam/exam-room"

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center font-serif text-3xl">Opening the module</div>
      }
    >
      <ExamRoom />
    </Suspense>
  )
}
