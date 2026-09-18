import type { LectioStep } from "./types";

/** Shared lectio divina prompts. A work may replace any step, especially the last. */
export const lectioSteps: LectioStep[] = [
  {
    id: "lectio",
    la: "Lectio",
    en: "Reading",
    prompt: "Read the Latin slowly, even twice. Let a word or phrase stay with you.",
  },
  {
    id: "meditatio",
    la: "Meditatio",
    en: "Meditation",
    prompt: "Turn the phrase inward. Where does this step touch your own heart?",
  },
  {
    id: "oratio",
    la: "Oratio",
    en: "Prayer",
    prompt: "Speak to God from what the reading has uncovered.",
  },
  {
    id: "contemplatio",
    la: "Contemplatio",
    en: "Contemplation",
    prompt: "Rest. Do not force words. Remain before the Truth.",
  },
];
