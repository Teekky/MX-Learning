/**
 * The review card — the one screen this app is judged on.
 *
 * Two faces on one surface. The recto (word, phonetics, level, register) is
 * always visible; the verso (definition, example, translation) unfolds
 * underneath it on reveal. Keeping the headword on screen while the answer
 * appears is deliberate: the moment of learning is the *comparison*, and
 * a 3D flip hides exactly the half you want to compare against.
 *
 * Gestures: drag horizontally to grade. Left is Again, right is Good — the
 * two calls you make ninety percent of the time. Overlays fade in as you
 * drag so the commitment is visible before you release.
 *
 * Everything animated here is `transform` or `opacity`, so the whole
 * interaction runs on the compositor and holds 120 Hz on the S22 Ultra.
 */

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { Badge, LevelBadge, RegisterBadge, VariantBadge } from '@/components/ui'
import { speak } from '@/audio/tts'
import { SWIPE_LEFT, SWIPE_RIGHT, type Grade } from './grades'
import type { SRSCard, Word } from '@/types'

/** Horizontal travel (px) past which a release commits the grade. */
const COMMIT_DISTANCE = 96
/** …or this much flick velocity, for people who swipe fast and short. */
const COMMIT_VELOCITY = 480

export interface ReviewCardProps {
  word: Word
  card: SRSCard
  revealed: boolean
  onReveal: () => void
  onGrade: (grade: Grade) => void
  /** 1-based position in the queue, for the aria label. */
  index: number
  total: number
}

export function ReviewCard({
  word,
  card,
  revealed,
  onReveal,
  onGrade,
  index,
  total,
}: ReviewCardProps) {
  const x = useMotionValue(0)

  /* Tilt into the swipe — a few degrees is enough to feel physical. */
  const rotate = useTransform(x, [-240, 0, 240], [-7, 0, 7])
  const againOpacity = useTransform(x, [-COMMIT_DISTANCE, -24, 0], [1, 0, 0])
  const goodOpacity = useTransform(x, [0, 24, COMMIT_DISTANCE], [0, 0, 1])

  /* Reset the drag offset whenever a new card takes this slot. */
  useEffect(() => {
    x.set(0)
  }, [card.id, x])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (!revealed) {
      x.set(0)
      return
    }
    const { offset, velocity } = info
    const committed =
      Math.abs(offset.x) > COMMIT_DISTANCE || Math.abs(velocity.x) > COMMIT_VELOCITY
    if (!committed) {
      x.set(0)
      return
    }
    onGrade(offset.x < 0 ? SWIPE_LEFT : SWIPE_RIGHT)
  }

  const example = word.examples?.[0]
  const isExpression = word.partOfSpeech === 'idiom' || word.partOfSpeech === 'phrase'

  return (
    <motion.div
      /* Only draggable once the answer is out — dragging a hidden card
         would let you grade something you never actually recalled. */
      drag={revealed ? 'x' : false}
      dragElastic={0.14}
      dragConstraints={{ left: 0, right: 0 }}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
      className="gpu relative w-full max-w-md touch-pan-y"
      aria-roledescription="flashcard"
      aria-label={`Card ${index} of ${total}`}
    >
      {/* --- Swipe intent overlays ------------------------------------- */}
      <motion.div
        style={{ opacity: againOpacity }}
        className={`pointer-events-none absolute left-4 top-6 z-10 rotate-[-8deg] rounded-lg px-3 py-1 font-display text-lg font-semibold shadow-sm ${SWIPE_LEFT.overlayClassName}`}
        aria-hidden
      >
        {SWIPE_LEFT.label}
      </motion.div>
      <motion.div
        style={{ opacity: goodOpacity }}
        className={`pointer-events-none absolute right-4 top-6 z-10 rotate-[8deg] rounded-lg px-3 py-1 font-display text-lg font-semibold shadow-sm ${SWIPE_RIGHT.overlayClassName}`}
        aria-hidden
      >
        {SWIPE_RIGHT.label}
      </motion.div>

      {/* --- The surface -----------------------------------------------
          A plain div, not a <button>: it contains its own controls (the
          pronunciation button), and interactive content cannot be nested
          inside a button. Tapping it is a pointer convenience — keyboard
          and screen-reader users get the equivalent "Reveal" control in
          the action bar below, which is always present. */}
      <div
        onClick={revealed ? undefined : onReveal}
        className={[
          'no-select flex w-full flex-col items-center rounded-2xl border-hair border-ink',
          'bg-bg-elevated px-6 py-10 text-center shadow-md',
          revealed ? 'cursor-default' : 'cursor-pointer',
        ].join(' ')}
      >
        {/* ---- Recto ---- */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <LevelBadge level={word.level} />
          <Badge tone="neutral">{word.partOfSpeech}</Badge>
          {word.register && <RegisterBadge register={word.register} />}
          {word.variant && <VariantBadge variant={word.variant} />}
        </div>

        <h1
          className={[
            'mt-6 font-display font-semibold leading-tight text-text',
            /* Multi-word expressions need to step down a size or they wrap
               into four lines on a phone. */
            isExpression || word.lemma.length > 16 ? 'text-2xl' : 'text-4xl',
          ].join(' ')}
        >
          {word.lemma}
        </h1>

        {word.ipa && (
          <p className="mt-2 font-mono text-sm text-text-subtle">{word.ipa}</p>
        )}

        <button
          type="button"
          onClick={(e) => {
            /* Don't let the tap bubble up and reveal the answer — hearing
               the word is part of recall, not the answer itself. */
            e.stopPropagation()
            void speak(word.lemma)
          }}
          aria-label={`Hear ${word.lemma} pronounced`}
          className="press mt-4 inline-flex h-tap w-tap items-center justify-center rounded-full border-hair border-border text-text-muted hover:bg-bg-subtle hover:text-text"
        >
          <Volume2 size={20} />
        </button>

        {/* ---- The fold ---- */}
        {!revealed ? (
          <motion.p
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-8 text-xs font-semibold uppercase tracking-wider text-text-subtle"
          >
            Tap to reveal
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 w-full"
          >
            {/* The rule draws itself across as the verso lands. A div, not
                an <hr>: <hr> carries a UA border on all four sides that we
                would have to unset first. */}
            <motion.div
              role="separator"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 h-0 origin-center border-t-hair border-dashed border-border"
            />

            {/* ---- Verso ---- */}
            {word.definitionEn && (
              <p className="text-balance text-lg leading-snug text-text">
                {word.definitionEn}
              </p>
            )}

            {word.literal && (
              <p className="mt-3 text-sm text-text-subtle">
                Literally: <span className="italic">{word.literal}</span>
              </p>
            )}

            {example && (
              <figure className="mt-6 rounded-lg border-hair border-border-subtle bg-bg-subtle px-4 py-3 text-left">
                <blockquote className="text-sm italic leading-relaxed text-text">
                  “{example.en}”
                </blockquote>
                {example.fr && (
                  <figcaption className="mt-1.5 text-xs text-text-subtle">
                    {example.fr}
                  </figcaption>
                )}
              </figure>
            )}

            {word.fr && (
              <p className="mt-4 text-sm text-text-muted">
                <span className="font-mono text-2xs uppercase tracking-wider text-text-subtle">
                  fr&nbsp;
                </span>
                {word.fr}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
