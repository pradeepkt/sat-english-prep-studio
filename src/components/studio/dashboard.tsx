"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Flag, Timer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { DIFFICULTIES, DIFFICULTY_LABELS, DOMAINS, DOMAIN_LABELS } from "@/lib/labels"

type Studio = {
  questionCount: number
  domains: Array<{
    domain: keyof typeof DOMAIN_LABELS
    totalAttempted: number
    totalCorrect: number
    accuracyRate: number
  }>
  sessions: Array<{
    id: string
    title: string
    status: string
    scoreRaw: number | null
    scoreScaled: number | null
    totalQuestions: number
    createdAt: string
  }>
}

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Scored",
  ABANDONED: "Saved and closed",
  NOT_STARTED: "Not started",
}

export function Dashboard() {
  const router = useRouter()
  const [studio, setStudio] = useState<Studio | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [drillOpen, setDrillOpen] = useState(false)
  const [domain, setDomain] = useState<string>("ALL")
  const [difficulty, setDifficulty] = useState<string>("MIXED")
  const [count, setCount] = useState(5)

  async function load() {
    setStatus("loading")
    setMessage(null)
    try {
      const response = await fetch("/api/studio")
      if (!response.ok) throw new Error("load")
      setStudio(await response.json())
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function start(mode: "full" | "adaptive" | "drill") {
    setPending(mode)
    setMessage(null)
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "drill" ? { mode, domain, difficulty, count } : { mode },
        ),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "The set could not be started.")
      setDrillOpen(false)
      router.push(`/exam/${payload.id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The set could not be started.")
      setPending(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-4 border-b border-[#e4dac8] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-[0.16em] text-[#8a5a22] uppercase">
            Bentonville · Digital SAT
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[#1c1915] sm:text-5xl">
            SAT English Prep Studio
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#4a433a]">
            HighSchoolLearner practice for the Reading and Writing section: two modules,
            27 questions and 32 minutes each, with a Bluebook-style room and a score review
            that explains the choice you actually made.
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3">
          {studio ? `${studio.questionCount} original items` : "Question bank"}
        </Badge>
      </header>

      {status === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-40 animate-pulse bg-[#f7f1e6]" />
          <Card className="h-40 animate-pulse bg-[#f7f1e6]" />
        </div>
      ) : null}

      {status === "error" ? (
        <Card>
          <CardHeader>
            <CardTitle>The studio did not load</CardTitle>
            <CardDescription>
              Practice history could not be read. Check the database connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void load()}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      {status === "ready" && studio ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Start a set</CardTitle>
                <CardDescription>
                  Full-length follows the official domain mix. Adaptive focus shifts questions
                  toward domains where past accuracy is under 70 percent.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 flex-1" disabled={pending !== null} onClick={() => void start("full")}>
                  <Timer />
                  {pending === "full" ? "Building module 1…" : "Full-length · 54 questions"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1"
                  disabled={pending !== null}
                  onClick={() => void start("adaptive")}
                >
                  {pending === "adaptive" ? "Reading your history…" : "Adaptive focus"}
                </Button>
                <Button variant="secondary" className="h-11 flex-1" onClick={() => setDrillOpen(true)}>
                  <BookOpen />
                  Targeted drill
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How a module feels</CardTitle>
                <CardDescription>Same tools you will want on test day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm leading-6 text-[#4a433a]">
                <p>One short passage, one question, choices A through D.</p>
                <p>Strike a choice, highlight a line, or flag the item and come back.</p>
                <p>Module 2 gets harder when module 1 accuracy is at least 67 percent.</p>
              </CardContent>
            </Card>
          </section>

          {message ? (
            <p className="rounded-lg border border-[#e7c7c1] bg-[#fff6f4] px-4 py-3 text-sm text-[#8a2f24]">
              {message}
            </p>
          ) : null}

          <section>
            <h2 className="font-serif text-2xl">Domain record</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {studio.domains.map((row) => (
                <Card key={row.domain} size="sm">
                  <CardHeader>
                    <CardTitle>{DOMAIN_LABELS[row.domain]}</CardTitle>
                    <CardDescription>
                      {row.totalAttempted === 0
                        ? "No scored attempts yet"
                        : `${row.totalCorrect} of ${row.totalAttempted} correct`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={Math.round(row.accuracyRate * 100)} />
                    <p className="mt-2 text-sm text-[#4a433a]">
                      {row.totalAttempted === 0 ? "—" : `${Math.round(row.accuracyRate * 100)}% accuracy`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Recent sessions</h2>
            {studio.sessions.length === 0 ? (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>No sessions yet</CardTitle>
                  <CardDescription>
                    A full-length test is 64 minutes. A five-question drill is enough to learn the
                    room before you sit for a whole module.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <ul className="mt-4 divide-y divide-[#e4dac8] rounded-xl bg-card ring-1 ring-foreground/10">
                {studio.sessions.map((session) => (
                  <li key={session.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-[#4a433a]">
                        {STATUS_LABEL[session.status] ?? session.status}
                        {session.status === "COMPLETED" && session.scoreRaw !== null
                          ? ` · ${session.scoreRaw}/${session.totalQuestions}`
                          : ""}
                        {session.scoreScaled ? ` · projected ${session.scoreScaled}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(
                          session.status === "COMPLETED" ? `/results/${session.id}` : `/exam/${session.id}`,
                        )
                      }
                    >
                      {session.status === "COMPLETED" ? "Review" : "Open"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <Dialog open={drillOpen} onOpenChange={setDrillOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Targeted drill</DialogTitle>
            <DialogDescription>
              Pick a domain, a difficulty, and a short set. Timing is about 71 seconds per question.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              Domain
              <select
                className="h-10 rounded-lg border border-[#e4dac8] bg-white px-3"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              >
                <option value="ALL">All domains</option>
                {DOMAINS.map((item) => (
                  <option key={item} value={item}>
                    {DOMAIN_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Difficulty
              <select
                className="h-10 rounded-lg border border-[#e4dac8] bg-white px-3"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="MIXED">Mixed</option>
                {DIFFICULTIES.map((item) => (
                  <option key={item} value={item}>
                    {DIFFICULTY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Questions
              <select
                className="h-10 rounded-lg border border-[#e4dac8] bg-white px-3"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrillOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending === "drill"} onClick={() => void start("drill")}>
              <Flag />
              {pending === "drill" ? "Starting…" : "Start drill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
