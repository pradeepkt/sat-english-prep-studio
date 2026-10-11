const CURVE: Array<[number, number]> = [
  [0, 200],
  [5, 280],
  [10, 350],
  [15, 410],
  [20, 460],
  [25, 510],
  [30, 560],
  [35, 610],
  [40, 660],
  [43, 690],
  [46, 730],
  [48, 750],
  [50, 770],
  [52, 790],
  [54, 800],
]

/** Projected Reading & Writing score. This is an estimate, not a College Board equated score. */
export function projectScaledScore(rawCorrect: number, totalQuestions: number) {
  if (totalQuestions !== 54) return null
  const raw = Math.max(0, Math.min(54, rawCorrect))
  for (let i = 0; i < CURVE.length - 1; i += 1) {
    const [x0, y0] = CURVE[i]
    const [x1, y1] = CURVE[i + 1]
    if (raw >= x0 && raw <= x1) {
      const t = x1 === x0 ? 0 : (raw - x0) / (x1 - x0)
      const projected = Math.round((y0 + t * (y1 - y0)) / 10) * 10
      return Math.max(200, Math.min(800, projected))
    }
  }
  return 800
}
