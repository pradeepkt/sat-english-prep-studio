"use client"

import { useExamUi } from "@/store/exam-store"

function splitStimulus(passage: string) {
  const match = passage.match(/([\s\S]*?)\[table\]\s*([\s\S]*?)\s*\[\/table\]\s*([\s\S]*)/)
  if (!match) return { prose: passage, rows: null as string[][] | null }
  const rows = match[2]
    .trim()
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))
  return { prose: `${match[1]}${match[3]}`.trim(), rows }
}

function renderHighlighted(text: string, ranges: Array<{ start: number; end: number }>) {
  if (!ranges.length) return text
  const pieces: Array<{ text: string; marked: boolean }> = []
  let cursor = 0
  for (const range of ranges) {
    const start = Math.max(0, Math.min(text.length, range.start))
    const end = Math.max(start, Math.min(text.length, range.end))
    if (start > cursor) pieces.push({ text: text.slice(cursor, start), marked: false })
    if (end > start) pieces.push({ text: text.slice(start, end), marked: true })
    cursor = end
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), marked: false })
  return pieces.map((piece, index) =>
    piece.marked ? (
      <mark key={index} className="bg-[#f3e2a4] text-inherit">
        {piece.text}
      </mark>
    ) : (
      <span key={index}>{piece.text}</span>
    ),
  )
}

function offsetIn(root: HTMLElement, node: Node, nodeOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let count = 0
  let current = walker.nextNode()
  while (current) {
    if (current === node) return count + nodeOffset
    count += current.textContent?.length ?? 0
    current = walker.nextNode()
  }
  return count
}

export function PassageView({
  questionId,
  passage,
}: {
  questionId: string
  passage: string
}) {
  const highlightMode = useExamUi((state) => state.highlightMode)
  const highlights = useExamUi((state) => state.highlights[questionId] ?? [])
  const addHighlight = useExamUi((state) => state.addHighlight)
  const { prose, rows } = splitStimulus(passage)

  return (
    <div className="space-y-5">
      <div
        className="font-serif text-[1.05rem] leading-8 whitespace-pre-wrap text-[#1c1915]"
        onMouseUp={(event) => {
          if (!highlightMode) return
          const root = event.currentTarget
          const selection = window.getSelection()
          if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) return
          if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return
          const start = offsetIn(root, selection.anchorNode, selection.anchorOffset)
          const end = offsetIn(root, selection.focusNode, selection.focusOffset)
          addHighlight(questionId, Math.min(start, end), Math.max(start, end))
          selection.removeAllRanges()
        }}
      >
        {renderHighlighted(prose, highlights)}
      </div>
      {rows ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {rows[0]?.map((cell) => (
                  <th key={cell} className="border-b border-[#d9d0c1] px-3 py-2 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell) => (
                    <td key={cell} className="border-b border-[#eee6d8] px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
