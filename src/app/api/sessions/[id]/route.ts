import { connection } from "next/server"
import { getSession, patchSession } from "@/lib/sessions"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection()
  try {
    const { id } = await context.params
    const review = new URL(request.url).searchParams.get("review") === "1"
    const session = await getSession(id, review)
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 })
    return Response.json(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The session could not be opened."
    const status = message.includes("Results are available") ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection()
  try {
    const { id } = await context.params
    const body = await request.json()
    const session = await patchSession(id, body)
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 })
    return Response.json(session)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The answer could not be saved."
    return Response.json({ error: message }, { status: 400 })
  }
}
