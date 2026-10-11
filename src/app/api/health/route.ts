import { connection } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  await connection()
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ ok: true, service: "sat-english-prep" })
  } catch {
    return Response.json({ ok: false, service: "sat-english-prep" }, { status: 503 })
  }
}
