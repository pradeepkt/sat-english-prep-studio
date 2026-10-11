import { connection } from "next/server"
import { getStudio } from "@/lib/sessions"

export async function GET() {
  await connection()
  try {
    return Response.json(await getStudio())
  } catch (error) {
    console.error(error)
    return Response.json({ error: "The studio could not load." }, { status: 500 })
  }
}
