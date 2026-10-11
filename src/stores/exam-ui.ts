"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type ExamUiState = {
  showTimer: boolean
  strikethroughMode: boolean
  highlighterOn: boolean
  highlights: Record<string, string[]>
  toggleTimer: () => void
  setStrikethroughMode: (on: boolean) => void
  toggleHighlighter: () => void
  addHighlight: (questionId: string, text: string) => void
  clearHighlights: (questionId: string) => void
}

export const useExamUi = create<ExamUiState>()(
  persist(
    (set) => ({
      showTimer: true,
      strikethroughMode: false,
      highlighterOn: false,
      highlights: {},
      toggleTimer: () => set((state) => ({ showTimer: !state.showTimer })),
      setStrikethroughMode: (on) => set({ strikethroughMode: on }),
      toggleHighlighter: () => set((state) => ({ highlighterOn: !state.highlighterOn })),
      addHighlight: (questionId, text) =>
        set((state) => {
          const clean = text.replace(/\s+/g, " ").trim()
          if (clean.length < 2 || clean.length > 180) return state
          const current = state.highlights[questionId] ?? []
          if (current.includes(clean)) return state
          return {
            highlights: {
              ...state.highlights,
              [questionId]: [...current, clean].slice(-8),
            },
          }
        }),
      clearHighlights: (questionId) =>
        set((state) => ({
          highlights: { ...state.highlights, [questionId]: [] },
        })),
    }),
    { name: "sat-english-exam-ui" },
  ),
)
