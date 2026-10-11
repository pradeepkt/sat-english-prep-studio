import { connection } from "next/server"
import { submitModule } from "@/lib/sessions"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection()
  try {
    const { id } = await context.params
    const result = await submitModule(id)
    if (!result) return Response.json({ error: "Session not found." }, { status: 404 })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The module could not be submitted."
    return Response.json({ error: message }, { status: 400 })
  }
}
