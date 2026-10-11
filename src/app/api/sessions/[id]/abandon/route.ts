import { connection } from "next/server"
import { abandonSession } from "@/lib/sessions"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection()
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const result = await abandonSession(id, body)
    if (!result) return Response.json({ error: "Session not found." }, { status: 404 })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The session could not be closed."
    return Response.json({ error: message }, { status: 400 })
  }
}
