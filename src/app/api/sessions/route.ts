import { connection } from "next/server"
import type { Difficulty, Domain } from "@/lib/labels"
import { clearAllSessions, createPracticeSession } from "@/lib/sessions"

export async function POST(request: Request) {
  await connection()
  try {
    const body = (await request.json()) as {
      mode?: "full" | "adaptive" | "drill"
      domain?: Domain | "ALL"
      difficulty?: Difficulty | "MIXED"
      count?: number
    }
    if (!body.mode || !["full", "adaptive", "drill"].includes(body.mode)) {
      return Response.json({ error: "Choose a full-length test, adaptive focus, or a drill." }, { status: 400 })
    }
    const session = await createPracticeSession({
      mode: body.mode,
      domain: body.domain,
      difficulty: body.difficulty,
      count: body.count,
    })
    return Response.json({ id: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "The session could not be started."
    return Response.json({ error: message }, { status: 400 })
  }
}

export async function DELETE() {
  await connection()
  try {
    const result = await clearAllSessions()
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sessions could not be cleared."
    return Response.json({ error: message }, { status: 500 })
  }
}
