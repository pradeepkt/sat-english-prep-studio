"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Clock, Flag, MapPin, PenLine, RefreshCw, Target, Trash2 } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import type { StudioPayload } from "@/lib/exam-types"
import { DIFFICULTY_LABELS, DIFFICULTIES, DOMAIN_LABELS, DOMAINS, type Difficulty, type Domain } from "@/lib/labels"

const STATUS_LABEL = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ABANDONED: "Abandoned",
  COMPLETED: "Scored",
} as const

export function StudioHome() {
  const router = useRouter()
  const [data, setData] = useState<StudioPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [drillOpen, setDrillOpen] = useState(false)
  const [domain, setDomain] = useState<Domain | "ALL">("ALL")
  const [difficulty, setDifficulty] = useState<Difficulty | "MIXED">("MIXED")
  const [count, setCount] = useState(6)
  const [rescanning, setRescanning] = useState(false)
  const [rescanMessage, setRescanMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function load(options?: { quiet?: boolean }) {
    if (!options?.quiet) setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/studio")
      if (!response.ok) throw new Error("The studio could not load.")
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "The studio could not load.")
    } finally {
      if (!options?.quiet) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function rescan() {
    setRescanning(true)
    setRescanMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/sources/rescan", { method: "POST" })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "The sources could not be rescanned.")
      const created = Number(body.created ?? 0)
      setRescanMessage(
        created === 1
          ? "Added 1 new question. Existing questions were kept."
          : `Added ${created} new questions. Existing questions were kept.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "The sources could not be rescanned.")
    } finally {
      setRescanning(false)
    }
  }

  async function start(mode: "full" | "adaptive" | "drill") {
    setStarting(mode)
    setError(null)
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "drill" ? { mode, domain, difficulty, count } : { mode },
        ),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "The session could not start.")
      setDrillOpen(false)
      router.push(`/exam/${body.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "The session could not start.")
      setStarting(null)
    }
  }

  async function removeSession(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? "The session could not be deleted.")
      // Refetch so older sessions can fill the recent list (studio returns take: 8).
      await load({ quiet: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "The session could not be deleted.")
    } finally {
      setDeletingId(null)
    }
  }

  async function clearSessions() {
    setClearing(true)
    setError(null)
    try {
      const response = await fetch("/api/sessions", { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? "Sessions could not be cleared.")
      setClearOpen(false)
      await load({ quiet: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sessions could not be cleared.")
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Question sources</p>
          <p className="text-sm text-muted-foreground">
            Rescan the studio sources and add any questions that are not in the bank yet.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button data-testid="rescan" variant="outline" disabled={rescanning} onClick={() => void rescan()}>
            <RefreshCw />
            {rescanning ? "Rescanning sources…" : "Rescan sources"}
          </Button>
          {rescanMessage && (
            <p data-testid="rescan-result" className="text-sm text-muted-foreground">
              {rescanMessage}
            </p>
          )}
        </div>
      </div>
      <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium tracking-wide text-primary uppercase">
            <MapPin className="size-4" />
            Bentonville, Arkansas
          </p>
          <h1 className="font-serif text-4xl leading-tight text-balance sm:text-5xl">
            HighSchoolLearner
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            SAT English Prep Studio. A quiet room for Digital SAT Reading and Writing: two modules,
            27 questions each, 32 minutes on the clock.
          </p>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <p>{data ? `${data.questionCount} original questions in the studio bank` : "Loading the bank"}</p>
          <p>Projected scores are not official College Board scores.</p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Full-length Reading and Writing</CardTitle>
            <CardDescription>
              54 questions, 64 minutes, official domain mix. Module 2 draws a harder set if Module 1
              is strong. Otherwise it stays balanced.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 px-4"
              disabled={Boolean(starting)}
              onClick={() => void start("full")}
            >
              <BookOpen />
              {starting === "full" ? "Opening the room…" : "Start full-length"}
            </Button>
            <Button
              variant="outline"
              className="h-11 px-4"
              disabled={Boolean(starting)}
              onClick={() => void start("adaptive")}
            >
              <Target />
              {starting === "adaptive" ? "Building the focus test…" : "Start adaptive focus"}
            </Button>
            <Button
              variant="secondary"
              className="h-11 px-4"
              disabled={Boolean(starting)}
              onClick={() => setDrillOpen(true)}
            >
              <PenLine />
              Build a drill
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How the room works</CardTitle>
            <CardDescription>Same habits as test day, without the noise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>One short passage, one question, choices A through D.</p>
            <p>Strike a choice, highlight a line, or flag the item and come back from the review screen.</p>
            <p>Pause freezes the clock. Close the test and continue later from the same answers and time. The clock never ends the session.</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Proficiency by domain</h2>
            <p className="text-sm text-muted-foreground">
              Accuracy appears after a scored session. Abandoned tests are not counted.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {DOMAINS.map((domainKey) => (
              <div key={domainKey} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data?.domains.map((row) => (
              <Card key={row.domain} size="sm">
                <CardHeader>
                  <CardTitle>{DOMAIN_LABELS[row.domain]}</CardTitle>
                  <CardDescription>
                    {row.totalAttempted === 0
                      ? "No scored attempts yet."
                      : `${row.totalCorrect} of ${row.totalAttempted} correct · ${Math.round(row.avgTimeSpentSeconds)}s average`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={Math.round(row.accuracyRate * 100)}>
                    <span className="text-xs text-muted-foreground">
                      {row.totalAttempted === 0 ? "—" : `${Math.round(row.accuracyRate * 100)}%`}
                    </span>
                  </Progress>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Recent sessions</h2>
            <p className="text-sm text-muted-foreground">
              Remove a session anytime. Clearing the list does not change the question bank or
              proficiency.
            </p>
          </div>
          {Boolean(data?.sessions.length) && (
            <Button
              data-testid="clear-sessions"
              variant="outline"
              size="sm"
              disabled={clearing || Boolean(deletingId)}
              onClick={() => setClearOpen(true)}
            >
              <Trash2 />
              Clear all
            </Button>
          )}
        </div>
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : !data?.sessions.length ? (
          <Card>
            <CardContent className="py-8 text-sm leading-6 text-muted-foreground">
              No sessions yet. A full-length test is 64 minutes. A short drill is enough to learn the
              room, the timer, and the review screen.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {data.sessions.map((session, index) => (
              <div key={session.id}>
                {index > 0 && <Separator />}
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.createdAt).toLocaleString()} · {session.totalQuestions} questions
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={session.status === "COMPLETED" ? "default" : "outline"}>
                      {session.isPaused ? "Paused" : STATUS_LABEL[session.status]}
                    </Badge>
                    {session.scoreScaled != null && (
                      <Badge variant="secondary">Projected {session.scoreScaled}</Badge>
                    )}
                    {session.status === "COMPLETED" && session.scoreRaw != null && (
                      <span className="text-sm text-muted-foreground">
                        {session.scoreRaw}/{session.totalQuestions} raw
                      </span>
                    )}
                    {session.status === "IN_PROGRESS" && (
                      <Button data-testid="continue-session" nativeButton={false} render={<Link href={`/exam/${session.id}`} />} variant="outline" size="sm">
                        <Clock /> {session.isPaused ? "Continue" : "Resume"}
                      </Button>
                    )}
                    {session.status === "COMPLETED" && (
                      <Button nativeButton={false} render={<Link href={`/results/${session.id}`} />} variant="outline" size="sm">
                        <Flag /> Results
                      </Button>
                    )}
                    <Button
                      data-testid={`delete-session-${session.id}`}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${session.title}`}
                      disabled={deletingId === session.id || clearing}
                      onClick={() => void removeSession(session.id)}
                    >
                      <Trash2 />
                      <span className="sr-only">
                        {deletingId === session.id ? "Deleting…" : "Delete"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={clearOpen} onOpenChange={(open) => !clearing && setClearOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear recent sessions?</DialogTitle>
            <DialogDescription>
              This permanently deletes every practice session and its answers. The question bank and
              proficiency scores stay as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={clearing} onClick={() => setClearOpen(false)}>
              Keep sessions
            </Button>
            <Button
              data-testid="confirm-clear-sessions"
              variant="destructive"
              disabled={clearing}
              onClick={() => void clearSessions()}
            >
              {clearing ? "Clearing…" : "Clear all sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={drillOpen} onOpenChange={setDrillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Targeted drill</DialogTitle>
            <DialogDescription>
              Pick a domain, a difficulty, and a length. The clock is about 71 seconds per question,
              the same pace as a module.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              Domain
              <select
                className="h-10 rounded-lg border border-border bg-card px-3"
                value={domain}
                onChange={(event) => setDomain(event.target.value as Domain | "ALL")}
              >
                <option value="ALL">All four domains</option>
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
                className="h-10 rounded-lg border border-border bg-card px-3"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty | "MIXED")}
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
                className="h-10 rounded-lg border border-border bg-card px-3"
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              >
                {[3, 6, 10, 15].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button className="h-10" disabled={starting === "drill"} onClick={() => void start("drill")}>
              {starting === "drill" ? "Starting…" : "Start drill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
