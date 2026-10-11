import type { BankQuestion } from "@/lib/question-bank"
import type { ChoiceId } from "@/lib/labels"

const SOURCE = "HighSchoolLearner Original Bank"

function item(
  domain: BankQuestion["domain"],
  subSkill: BankQuestion["subSkill"],
  difficulty: BankQuestion["difficulty"],
  passage: string,
  prompt: string,
  options: [string, string, string, string],
  correct: ChoiceId,
  rationale: string,
): BankQuestion {
  const ids: ChoiceId[] = ["A", "B", "C", "D"]
  return {
    sourceName: SOURCE,
    domain,
    subSkill,
    difficulty,
    passage,
    prompt,
    options: options.map((text, index) => ({ id: ids[index], text })),
    correctOption: correct,
    staticRationale: rationale,
  }
}

/** Extra original items from the studio source. They are not in the initial seed. */
export const supplementalSource: BankQuestion[] = [
  item(
    "CRAFT_AND_STRUCTURE",
    "WORDS_IN_CONTEXT",
    "EASY",
    "After the storm, the Bentonville library opened its doors an hour early so students could dry their notes and finish homework before the first bell. A librarian called the early opening a small mercy.",
    "As used in the text, what does the word \"mercy\" most nearly mean?",
    ["A kindness", "A punishment", "A deadline", "A fee"],
    "A",
    "The early opening helps students, so mercy means a kindness. The sentence does not describe punishment, a deadline, or a fee.",
  ),
  item(
    "INFORMATION_AND_IDEAS",
    "CENTRAL_IDEAS_AND_DETAILS",
    "MEDIUM",
    "The school garden club kept two plots. One received compost from the cafeteria every Friday. The other received none. By October the composted plot had thicker kale leaves and fewer bare patches. The club recorded the difference in a shared notebook.",
    "Which choice best states the main idea of the text about the garden club's two kale plots?",
    [
      "Compost was associated with fuller kale growth in the club's comparison.",
      "Cafeteria food should replace every fertilizer sold in stores.",
      "Kale cannot grow in Bentonville without a greenhouse.",
      "The notebook was more important than the plants.",
    ],
    "A",
    "The text compares two plots and reports fuller growth where compost was added. It does not claim a universal fertilizer rule, a greenhouse requirement, or that the notebook mattered more than the plants.",
  ),
  item(
    "INFORMATION_AND_IDEAS",
    "INFERENCES",
    "MEDIUM",
    "Jonah reread the lab instructions, set the beaker on the center of the bench, and asked his partner to watch the thermometer while he adjusted the flame. He did not start the timer until both of them nodded.",
    "Which choice is best supported by the text about Jonah and the lab timer?",
    [
      "Jonah wanted the measurement to start only when both partners were ready.",
      "Jonah had already finished the experiment before reading the instructions.",
      "The partner refused to look at the thermometer.",
      "The flame was too dangerous to use in the lab.",
    ],
    "A",
    "He waits for a nod from both people before starting the timer, which supports a shared start. The other choices contradict the sequence in the text.",
  ),
  item(
    "STANDARD_ENGLISH_CONVENTIONS",
    "BOUNDARIES_AND_PUNCTUATION",
    "EASY",
    "The morning announcements listed three events ____ a poetry reading, a college visit, and a band rehearsal.",
    "Which choice completes the text so that it conforms to the conventions of Standard English? The sentence lists the morning announcements.",
    [":", ",", ";", "—"],
    "A",
    "A colon can introduce a list that follows a complete clause. A comma does not introduce that list, and a semicolon or dash is the wrong mark here.",
  ),
  item(
    "EXPRESSION_OF_IDEAS",
    "TRANSITIONS",
    "MEDIUM",
    "The debate team practiced rebuttals for an hour. ____ they switched to opening speeches so newer members could try the first minute.",
    "Which choice completes the text with the most logical transition? The sentence follows the debate team's rebuttal practice.",
    ["Afterward,", "For example,", "In contrast,", "That is,"],
    "A",
    "The second activity happens after the first, so Afterward fits. For example would signal an illustration, In contrast a difference of kind, and That is a restatement.",
  ),
  item(
    "EXPRESSION_OF_IDEAS",
    "RHETORICAL_SYNTHESIS",
    "HARD",
    "A student is writing a note about a campus trail count. The notes say: weekday mornings averaged 40 walkers, Saturday mornings averaged 90, and the counter sat beside the library path.",
    "Which choice most effectively uses relevant information from the trail-count notes to emphasize that weekends were busier?",
    [
      "Saturday mornings drew about 90 walkers on the library path, more than twice the weekday-morning average of 40.",
      "A counter beside the library path recorded walkers, and the library has many windows.",
      "Weekday mornings averaged 40 walkers, which shows the path is rarely used.",
      "The trail count was stored in a notebook that the student carried to class.",
    ],
    "A",
    "Choice A uses both averages and states the weekend increase. The other choices drop the comparison or add details that are not in the notes.",
  ),
]
