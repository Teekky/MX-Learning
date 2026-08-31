/**
 * Keep password managers and the Android autofill framework out of the
 * learning fields.
 *
 * Every field in this app is an *answer*, never an identity: a word, a
 * conjugation, a sentence you are writing in English. But Chrome and Samsung
 * Internet hand each focused input to the Android autofill service, which
 * guesses from shape alone — and a lone one-line text box next to a button
 * looks exactly like a login. The result on a Galaxy is the Samsung Pass
 * strip (password / payment / address) sitting on top of the keyboard,
 * stealing a row of screen and offering to fill your address into a
 * vocabulary drill.
 *
 * `autocomplete="off"` is the lever the browser actually forwards to the
 * platform (it maps to `importantForAutofill=no`); the `data-*` attributes
 * are the documented opt-outs for 1Password, LastPass, Dashlane and
 * Bitwarden. `autocorrect`/`autocapitalize`/`spellcheck` are here too: a
 * spelling drill that silently fixes your spelling is not a drill.
 *
 * Spread it last, so a field can still override a single attribute:
 *
 *     <input {...noAutofill} inputMode="numeric" />
 *
 * The final word belongs to the device: if Samsung Pass is set as the system
 * autofill service it can still show its strip. Settings → General
 * management → Autofill service → None turns it off for every app.
 */

export const noAutofill = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'none',
  spellCheck: false,
  /* Vendor opt-outs — each manager reads its own attribute. */
  'data-form-type': 'other',
  'data-lpignore': 'true',
  'data-1p-ignore': '',
  'data-bwignore': 'true',
} as const

/**
 * Same, for prose you write in English: sentence case and the spell checker
 * are welcome in a free-writing composer, autofill still is not.
 */
export const noAutofillProse = {
  autoComplete: 'off',
  'data-form-type': 'other',
  'data-lpignore': 'true',
  'data-1p-ignore': '',
  'data-bwignore': 'true',
} as const
