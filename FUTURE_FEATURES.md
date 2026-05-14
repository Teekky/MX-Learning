# Future features — parked for later phases

Running backlog of things the user has asked for but wants us to defer
until the current roadmap is complete. Do NOT start any of these early.

---

## English Rules module (requested 2026-04)

A dedicated practice module that teaches **English grammar & usage rules**,
not vocabulary.

### Why
The current app is strong on vocabulary (SRS, fill-in-the-blank,
words-in-context, speaking, interview sim) but has nothing that
systematically teaches *rules* — tenses, articles, prepositions,
conditionals, reported speech, phrasal verbs, etc. A C1 target like
Teekky also needs rule fluency, not just word coverage.

### Pedagogical shape per rule lesson
Three stops in sequence:

1. **Rule (FR)** — plain-French explanation of the rule. Must use
   *very simple* French so any learner understands, not grammarian
   jargon. One short paragraph + a rule-of-thumb card.
2. **Mise en situation (EN)** — 2–4 example sentences in English that
   showcase the rule in realistic context. Audio playback (reuse TTS).
   Show a tiny FR gloss under each for beginners; hide it for higher
   levels.
3. **Exercise (EN)** — quick comprehension check: fill-in-the-blank,
   multiple choice, or "pick the correct form." Immediate feedback.
   Count toward XP like other modules.

### Level adaptation (critical)
Rules surfaced MUST match the user's CEFR level:

- **A1**: to be, personal pronouns, simple articles (a/an/the), plural
  -s, basic present simple, basic numbers, days/months.
- **A2**: present continuous, past simple (regular + common irregular),
  can/can't, possessives, basic prepositions of time/place, comparatives.
- **B1**: present perfect vs past simple, future forms (will/going to/
  present continuous), zero/first conditional, modal verbs for advice,
  reported speech basics, quantifiers.
- **B2**: present perfect continuous, past perfect, second/third
  conditional, passive voice, relative clauses, gerund vs infinitive,
  linking words, advanced modals.
- **C1/C2**: mixed conditionals, inversion, cleft sentences, advanced
  phrasal verbs, collocations, subjunctive in that-clauses, nuanced
  tense shifts, idiomatic register.

The FR explanations also scale: dense technical terms allowed at B2+
but avoided at A1/A2.

### Implementation notes (non-binding, for the future implementer)
- Seed a `RULES` table similar to `seedWords.ts`: `{ id, level, topic,
  titleFr, ruleFr, examples: [{en, fr}], exercises: [...] }`.
- Add a `rules-lesson` ExerciseType in `src/types`.
- Expose it as a PracticePage tile.
- Like vocabulary, idempotent seed with metadata-drift sync so future
  edits propagate to existing users without wiping progress.
- No Mistral call required for the rule text itself — seed it. Mistral
  could *optionally* generate extra practice sentences on demand
  (same pattern as `wordsInContext`).

### Do not start before
Finishing the current practice/content roadmap. Parked intentionally.
