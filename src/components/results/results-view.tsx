"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { ExamQuestion, ExamSession } from "@/lib/exam-types"
import { DOMAIN_LABELS, DOMAINS, SUBSKILL_LABELS, type Domain } from "@/lib/labels"

export function ResultsView() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId
  const [session, setSession] = useState<ExamSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [explaining, setExplaining] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}?review=1`)
      const body = await response.json()
      if (!response.ok) {
        setError(body.error ?? "Results are not available.")
        setSession(null)
      } else {
        setSession(body)
        setError(null)
      }
      setLoading(false)
    }
    void load()
  }, [sessionId])

  async function explain(question: ExamQuestion) {
    setExplaining(question.id)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testQuestionId: question.id }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "The explanation failed.")
      setSession((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((item) =>
                item.id === question.id
                  ? {
                      ...item,
                      dynamicAiAnalysis: body.dynamicAiAnalysis,
                      cognitiveMistakeType: body.cognitiveMistakeType,
                    }
                  : item,
              ),
            }
          : current,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "The explanation failed.")
    } finally {
      setExplaining(null)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Scoring the session…</div>
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-serif text-4xl">No results yet</h1>
        <p className="mt-3 text-muted-foreground">{error ?? "Submit a session before opening results."}</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          Back to the studio
        </Button>
      </div>
    )
  }

  const byDomain = DOMAINS.map((domain) => {
    const rows = session.questions.filter((question) => question.domain === domain)
    const correct = rows.filter((question) => question.isCorrect).length
    return { domain, total: rows.length, correct }
  }).filter((row) => row.total > 0)

  const fullLength = session.totalQuestions >= 54 && !session.isAdaptiveFocus

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm tracking-wide text-primary uppercase">Bentonville studio</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{session.title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Raw score counts every credited answer. A projected scaled score appears only for a
          full-length Reading and Writing test, and it is not an official College Board score.
        </p>
      </header>

      {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Raw score</CardDescription>
            <CardTitle className="font-serif text-4xl">
              {session.scoreRaw ?? 0}
              <span className="text-lg text-muted-foreground"> / {session.totalQuestions}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardDescription>Projected scaled score</CardDescription>
            <CardTitle className="font-serif text-4xl">
              {fullLength && session.scoreScaled != null ? session.scoreScaled : "—"}
            </CardTitle>
            <CardDescription>
              {fullLength
                ? "Projection only, on a 200–800 Reading and Writing scale. Not an official College Board score."
                : "Scaled scores are projected only for full-length Reading and Writing tests."}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {byDomain.map((row) => (
          <Card key={row.domain} size="sm">
            <CardHeader>
              <CardTitle>{DOMAIN_LABELS[row.domain as Domain]}</CardTitle>
              <CardDescription>
                {row.correct} of {row.total} correct
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={Math.round((row.correct / row.total) * 100)} />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-3xl">Question review</h2>
        {session.questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  {index + 1}. {question.isCorrect ? "Correct" : "Missed"}
                </CardTitle>
                <Badge variant="outline">{SUBSKILL_LABELS[question.subSkill]}</Badge>
                {question.isFlaggedForReview && <Badge variant="secondary">Flagged</Badge>}
              </div>
              <CardDescription>
                Your answer: {question.selectedOption ?? "blank"} · Credited answer: {question.correctOption}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-serif leading-7 whitespace-pre-wrap text-muted-foreground">
                {question.passage}
              </p>
              <p>{question.prompt}</p>
              <Separator />
              <p className="text-sm leading-6">{question.staticRationale}</p>
              {question.dynamicAiAnalysis ? (
                <div className="rounded-lg bg-muted px-3 py-3 text-sm leading-6">
                  <p className="mb-1 font-medium">{question.cognitiveMistakeType}</p>
                  {question.dynamicAiAnalysis}
                </div>
              ) : (
                <Button
                  data-testid={index === session.questions.findIndex((item) => !item.isCorrect) ? "explain" : undefined}
                  variant="outline"
                  disabled={explaining === question.id}
                  onClick={() => void explain(question)}
                >
                  {explaining === question.id
                    ? "Writing the note…"
                    : question.isCorrect
                      ? "Why this is right"
                      : "Explain my mistake"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
        Return to the studio
      </Button>
    </div>
  )
}
