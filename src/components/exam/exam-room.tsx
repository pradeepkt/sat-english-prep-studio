"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Bookmark, Clock, Highlighter, Strikethrough, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ExamQuestion, ExamSession } from "@/lib/exam-types"
import { formatClock } from "@/lib/labels"
import { useExamUi } from "@/stores/exam-ui"

function renderPassage(passage: string, highlights: string[]) {
  const usable = highlights.filter((item) => item.length > 1)
  if (!usable.length) return passage
  const pattern = usable
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  const parts = passage.split(new RegExp(`(${pattern})`, "g"))
  return parts.map((part, index) =>
    usable.includes(part) ? (
      <mark key={`${part}-${index}`} className="bg-[#f3e2a8] text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>
    ),
  )
}

export function ExamRoom() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<"loading" | "test" | "review" | "transition" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const timeRef = useRef(0)
  const pausedRef = useRef(false)
  const timingRef = useRef(true)
  const questionsRef = useRef<ExamQuestion[]>([])
  const indexRef = useRef(0)
  const enteredAt = useRef(Date.now())
  const ui = useExamUi()

  const question = session?.questions[index]

  useEffect(() => {
    questionsRef.current = session?.questions ?? []
  }, [session])

  useEffect(() => {
    indexRef.current = index
    enteredAt.current = Date.now()
  }, [index])

  async function load() {
    setPhase("loading")
    setError(null)
    const response = await fetch(`/api/sessions/${sessionId}`)
    const body = await response.json()
    if (!response.ok) {
      setError(body.error ?? "This session could not be opened.")
      setPhase("error")
      return
    }
    const next = body as ExamSession
    if (next.status === "COMPLETED") {
      router.replace(`/results/${sessionId}`)
      return
    }
    if (next.status === "ABANDONED") {
      setError("This session was abandoned and cannot be resumed.")
      setPhase("error")
      return
    }
    setSession(next)
    const startIndex = Math.min(
      Math.max(0, next.resumeIndex ?? 0),
      Math.max(0, next.questions.length - 1),
    )
    setIndex(startIndex)
    indexRef.current = startIndex
    timeRef.current = next.timeRemainingSec
    setTimeLeft(next.timeRemainingSec)
    pausedRef.current = next.isPaused
    timingRef.current = !next.isPaused
    setPaused(next.isPaused)
    setPhase("test")
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  function stampTime(questions: ExamQuestion[], questionIndex: number) {
    const current = questions[questionIndex]
    if (!current || !timingRef.current) return questions
    const extra = Math.round((Date.now() - enteredAt.current) / 1000)
    enteredAt.current = Date.now()
    return questions.map((item, itemIndex) =>
      itemIndex === questionIndex
        ? { ...item, timeSpentSeconds: item.timeSpentSeconds + extra }
        : item,
    )
  }

  function updateQuestion(questionId: string, patch: Partial<ExamQuestion>) {
    setSession((current) => {
      if (!current) return current
      const questions = current.questions.map((item) =>
        item.id === questionId ? { ...item, ...patch } : item,
      )
      questionsRef.current = questions
      return { ...current, questions }
    })
  }

  async function persist(includeTime = true) {
    const questions = stampTime(questionsRef.current, indexRef.current)
    questionsRef.current = questions
    setSession((current) => (current ? { ...current, questions } : current))
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeRemainingSec: includeTime ? timeRef.current : undefined,
        isPaused: pausedRef.current,
        resumeIndex: indexRef.current,
        questions: questions.map((item) => ({
          id: item.id,
          selectedOption: item.selectedOption,
          isFlaggedForReview: item.isFlaggedForReview,
          eliminatedOptions: item.eliminatedOptions,
          timeSpentSeconds: item.timeSpentSeconds,
        })),
      }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error ?? "The session could not be saved.")
    }
  }

  async function submitModule() {
    if (busy) return
    setBusy(true)
    try {
      await persist()
      const response = await fetch(`/api/sessions/${sessionId}/submit`, { method: "POST" })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "The module could not be submitted.")
      if (body.advanced) {
        setPhase("transition")
        window.setTimeout(() => {
          void load()
        }, 2200)
      } else {
        router.push(`/results/${sessionId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The module could not be submitted.")
      setPhase("test")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (phase !== "test" || paused) return
    const timer = window.setInterval(() => {
      if (timeRef.current <= 0) return
      timeRef.current = Math.max(0, timeRef.current - 1)
      setTimeLeft(timeRef.current)
    }, 1000)
    const save = window.setInterval(() => {
      void persist()
    }, 15000)
    return () => {
      window.clearInterval(timer)
      window.clearInterval(save)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, session?.currentModule, sessionId])

  async function pauseClock() {
    if (pausedRef.current) {
      await persist()
      return
    }
    await persist()
    timingRef.current = false
    pausedRef.current = true
    setPaused(true)
    await persist()
  }

  async function resumeClock() {
    timingRef.current = true
    enteredAt.current = Date.now()
    pausedRef.current = false
    setPaused(false)
    await persist()
  }

  async function closeForLater() {
    setBusy(true)
    try {
      await pauseClock()
      router.push("/")
    } finally {
      setBusy(false)
    }
  }

  const unanswered = useMemo(
    () => session?.questions.filter((item) => !item.selectedOption).length ?? 0,
    [session],
  )

  async function leave() {
    await closeForLater()
  }

  if (phase === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-3xl">Opening the module</p>
          <p className="mt-2 text-sm text-muted-foreground">Setting the clock and the first passage.</p>
        </div>
      </div>
    )
  }

  if (phase === "error" || !session || !question) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="font-serif text-3xl">The room is closed</p>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "This session is unavailable."}</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            Back to the studio
          </Button>
        </div>
      </div>
    )
  }

  const highlights = ui.highlights[question.id] ?? []
  const moduleBudget = session.totalTimeMinutes * 60
  const urgent = timeLeft > 0 && timeLeft <= (moduleBudget > 300 ? 300 : 45)

  function choose(optionId: string) {
    if (ui.strikethroughMode) {
      const eliminated = question!.eliminatedOptions.includes(optionId)
        ? question!.eliminatedOptions.filter((id) => id !== optionId)
        : [...question!.eliminatedOptions, optionId]
      updateQuestion(question!.id, {
        eliminatedOptions: eliminated,
        selectedOption: question!.selectedOption === optionId ? null : question!.selectedOption,
      })
      return
    }
    updateQuestion(question!.id, {
      selectedOption: optionId,
      eliminatedOptions: question!.eliminatedOptions.filter((id) => id !== optionId),
    })
  }

  const passageBlock = (
    <ScrollArea className="h-full">
      <div
        className="font-serif px-5 py-6 text-[1.05rem] leading-8 whitespace-pre-wrap sm:px-8"
        onMouseUp={() => {
          if (!ui.highlighterOn) return
          const selection = window.getSelection()?.toString() ?? ""
          ui.addHighlight(question.id, selection)
        }}
      >
        {renderPassage(question.passage, highlights)}
      </div>
    </ScrollArea>
  )

  const questionBlock = (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Question {index + 1} of {session.questions.length}
          </p>
          <Button
            data-testid="flag"
            variant={question.isFlaggedForReview ? "default" : "outline"}
            size="sm"
            onClick={() =>
              updateQuestion(question.id, { isFlaggedForReview: !question.isFlaggedForReview })
            }
          >
            <Bookmark />
            {question.isFlaggedForReview ? "Flagged" : "Flag"}
          </Button>
        </div>
        <p className="text-base leading-7">{question.prompt}</p>
        <div className="grid gap-2">
          {question.options.map((option) => {
            const struck = question.eliminatedOptions.includes(option.id)
            const selected = question.selectedOption === option.id
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`choice-${option.id}`}
                onClick={() => choose(option.id)}
                className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                } ${struck ? "line-through opacity-60" : ""}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm font-semibold ${
                    selected ? "border-primary-foreground" : "border-current"
                  }`}
                >
                  {option.id}
                </span>
                <span className="pt-0.5 leading-6">{option.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AnimatePresence>
        {phase === "transition" && (
          <motion.div
            key="module-transition"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background px-6 text-center"
          >
            <div>
              <p className="text-sm tracking-[0.2em] text-primary uppercase">Reading and Writing</p>
              <h2 className="mt-3 font-serif text-6xl">Module 2</h2>
              <p className="mt-3 text-muted-foreground">27 questions · 32:00</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Reading and Writing</p>
          <p className="text-xs text-muted-foreground">
            Module {session.currentModule} of {session.moduleCount}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={ui.showTimer ? "outline" : "secondary"}
                  size="sm"
                  onClick={ui.toggleTimer}
                >
                  <Clock />
                  {ui.showTimer ? formatClock(timeLeft) : "Timer hidden"}
                </Button>
              }
            />
            <TooltipContent>Hide or show the module clock. The clock never ends the test.</TooltipContent>
          </Tooltip>
          {paused ? (
            <Button data-testid="resume" size="sm" onClick={() => void resumeClock()}>
              Continue
            </Button>
          ) : (
            <Button data-testid="pause" size="sm" variant="outline" onClick={() => void pauseClock()}>
              Pause
            </Button>
          )}
          <Button
            data-testid="strike-mode"
            variant={ui.strikethroughMode ? "default" : "ghost"}
            size="sm"
            onClick={() => ui.setStrikethroughMode(!ui.strikethroughMode)}
          >
            <Strikethrough />
            <span className="hidden sm:inline">Strike</span>
          </Button>
          <Button
            data-testid="highlighter"
            variant={ui.highlighterOn ? "default" : "ghost"}
            size="sm"
            onClick={ui.toggleHighlighter}
          >
            <Highlighter />
            <span className="hidden sm:inline">Highlight</span>
          </Button>
          <Button data-testid="close-session" variant="ghost" size="sm" onClick={() => setLeaveOpen(true)}>
            <X />
            <span className="hidden sm:inline">Close</span>
          </Button>
        </div>
      </header>

      {paused && (
        <p data-testid="paused-banner" className="bg-[#f3e2a8] px-4 py-1 text-center text-sm">
          Paused at {formatClock(timeLeft)}. The clock stays here until you continue.
        </p>
      )}
      {!paused && timeLeft === 0 && ui.showTimer && (
        <p data-testid="time-up" className="bg-[#f3e2a8] px-4 py-1 text-center text-sm">
          The clock is at 0:00. It will not end the test. Finish when you are ready.
        </p>
      )}
      {urgent && ui.showTimer && !paused && (
        <p className="bg-[#f3e2a8] px-4 py-1 text-center text-sm">
          {moduleBudget > 300 ? "Less than five minutes remain in this module." : "Less than a minute remains in this drill."}
        </p>
      )}
      {error && <p className="bg-destructive/10 px-4 py-2 text-center text-sm">{error}</p>}

      {phase === "review" ? (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
          <div>
            <h2 className="font-serif text-4xl">Check your work</h2>
            <p className="mt-2 text-muted-foreground">
              {unanswered === 0
                ? "Every question in this module has an answer."
                : `${unanswered} question${unanswered === 1 ? "" : "s"} still unanswered. You can return to them before you submit.`}
            </p>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
            {session.questions.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIndex(itemIndex)
                  setPhase("test")
                }}
                className={`relative h-10 rounded-md border text-sm ${
                  item.selectedOption ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {itemIndex + 1}
                {item.isFlaggedForReview && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#f3e2a8]" />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPhase("test")}>
              Return to questions
            </Button>
            <Button data-testid="submit-module" disabled={busy} onClick={() => void submitModule()}>
              {busy ? "Submitting…" : session.currentModule < session.moduleCount ? "Submit module" : "Submit test"}
            </Button>
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 md:grid-cols-2">
          <div className="hidden min-h-0 border-r border-border md:block">{passageBlock}</div>
          <div className="hidden min-h-0 md:block">{questionBlock}</div>
          <div className="min-h-0 md:hidden">
            <Tabs defaultValue="passage" className="h-full">
              <TabsList className="mx-3 mt-3">
                <TabsTrigger value="passage">Passage</TabsTrigger>
                <TabsTrigger value="question">Question</TabsTrigger>
              </TabsList>
              <TabsContent value="passage" className="h-[calc(100dvh-9.5rem)]">
                {passageBlock}
              </TabsContent>
              <TabsContent value="question" className="h-[calc(100dvh-9.5rem)]">
                {questionBlock}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}

      <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 sm:px-5">
        <Button variant="outline" size="sm" disabled={index === 0 || phase !== "test"} onClick={() => setIndex((value) => value - 1)}>
          Back
        </Button>
        <div className="hidden items-center gap-1 md:flex">
          {session.questions.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndex(itemIndex)
                setPhase("test")
              }}
              className={`size-7 rounded text-xs ${
                itemIndex === index && phase === "test"
                  ? "bg-primary text-primary-foreground"
                  : item.selectedOption
                    ? "bg-secondary"
                    : "border border-border"
              }`}
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button className="md:hidden" variant="outline" size="sm" onClick={() => setNavOpen(true)}>
            Navigator
          </Button>
          {phase === "test" && index < session.questions.length - 1 && (
            <Button size="sm" onClick={() => setIndex((value) => value + 1)}>
              Next
            </Button>
          )}
          <Button data-testid="review" size="sm" variant="outline" onClick={() => setPhase("review")}>
            Review
          </Button>
        </div>
      </footer>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="bottom" className="max-h-[70dvh]">
          <SheetHeader>
            <SheetTitle>Question navigator</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-6 gap-2 px-4 pb-6">
            {session.questions.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIndex(itemIndex)
                  setPhase("test")
                  setNavOpen(false)
                }}
                className="h-10 rounded-md border text-sm"
              >
                {itemIndex + 1}
                {item.isFlaggedForReview ? " •" : ""}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this test?</DialogTitle>
            <DialogDescription>
              The clock freezes where it is. Your answers stay saved, and you can continue later
              from the studio.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Keep working
            </Button>
            <Button data-testid="confirm-close" disabled={busy} onClick={() => void leave()}>
              Close for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ui.highlighterOn && highlights.length > 0 && phase === "test" && (
        <div className="pointer-events-none fixed bottom-16 left-3">
          <Badge variant="secondary" className="pointer-events-auto">
            {highlights.length} highlight{highlights.length === 1 ? "" : "s"}
            <button type="button" className="ml-2 underline" onClick={() => ui.clearHighlights(question.id)}>
              Clear
            </button>
          </Badge>
        </div>
      )}
    </div>
  )
}
