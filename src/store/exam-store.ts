import { create } from "zustand"
import { persist } from "zustand/middleware"

type Range = { start: number; end: number }

type ExamUiState = {
  eliminateMode: boolean
  highlightMode: boolean
  timerHidden: boolean
  highlights: Record<string, Range[]>
  setEliminateMode: (value: boolean) => void
  setHighlightMode: (value: boolean) => void
  toggleTimer: () => void
  addHighlight: (questionId: string, start: number, end: number) => void
  clearHighlights: (questionId: string) => void
}

export const useExamUi = create<ExamUiState>()(
  persist(
    (set) => ({
      eliminateMode: false,
      highlightMode: false,
      timerHidden: false,
      highlights: {},
      setEliminateMode: (value) =>
        set((state) => ({
          eliminateMode: value,
          highlightMode: value ? false : state.highlightMode,
        })),
      setHighlightMode: (value) =>
        set((state) => ({
          highlightMode: value,
          eliminateMode: value ? false : state.eliminateMode,
        })),
      toggleTimer: () => set((state) => ({ timerHidden: !state.timerHidden })),
      addHighlight: (questionId, start, end) =>
        set((state) => {
          const next = [...(state.highlights[questionId] ?? []), { start, end }]
            .filter((range) => range.end > range.start)
            .sort((a, b) => a.start - b.start)
          return { highlights: { ...state.highlights, [questionId]: next } }
        }),
      clearHighlights: (questionId) =>
        set((state) => ({ highlights: { ...state.highlights, [questionId]: [] } })),
    }),
    { name: "sat-english-exam-ui" },
  ),
)
