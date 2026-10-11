import { connection } from "next/server"
import { rescanQuestionSources } from "@/lib/rescan-sources"

export async function POST() {
  await connection()
  try {
    const result = await rescanQuestionSources()
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sources could not be rescanned."
    return Response.json({ error: message }, { status: 500 })
  }
}
