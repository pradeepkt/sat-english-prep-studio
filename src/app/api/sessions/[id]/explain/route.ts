import { connection } from "next/server"
import { explainMistake } from "@/lib/sessions"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection()
  try {
    const { id } = await context.params
    const body = (await request.json()) as { testQuestionId?: string }
    if (!body.testQuestionId) {
      return Response.json({ error: "Choose a question to explain." }, { status: 400 })
    }
    const result = await explainMistake(id, body.testQuestionId)
    if (!result) return Response.json({ error: "Question not found." }, { status: 404 })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The explanation could not be written."
    return Response.json({ error: message }, { status: 400 })
  }
}
