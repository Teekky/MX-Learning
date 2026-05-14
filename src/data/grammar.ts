/**
 * Grammar topic bank — the content backbone of the Grammar module.
 *
 * Each topic bundles: a level, a clean rule explanation, a few worked
 * examples, and 10 drills the user runs through to lock the pattern in.
 * Drills reuse the same shape as the onboarding test (MCQ / fill-blank /
 * spot-error) so we never have to teach a new exercise UI.
 *
 * Bilingual content — every rule, blurb, drill explanation, and example
 * note has an optional French translation. The UI shows EN as primary
 * and FR in accent colour right under it (no toggle).
 *
 * Coverage philosophy: weighted toward A2–B2 (where most learners need
 * the most help) while keeping C1–C2 topics for the long tail.
 */

import type { Level } from '@/types'

export type GrammarDrill =
  | {
      type: 'mcq'
      prompt: string
      promptFr?: string
      options: string[]
      answer: number
      explanation: string
      explanationFr?: string
    }
  | {
      type: 'fill'
      prompt: string
      promptFr?: string
      answer: string
      acceptedAnswers?: string[]
      explanation: string
      explanationFr?: string
    }
  | {
      type: 'spot-error'
      prompt: string
      promptFr?: string
      options: string[]
      answer: number
      explanation: string
      explanationFr?: string
    }

export interface GrammarExample {
  en: string
  fr?: string
  note?: string
  noteFr?: string
}

export interface GrammarTopic {
  id: string
  name: string
  nameFr?: string
  level: Level
  blurb: string
  blurbFr?: string
  rule: string
  ruleFr?: string
  examples: GrammarExample[]
  drills: GrammarDrill[]
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  /* ============================== A2 ============================== */
  {
    id: 'articles',
    name: 'Articles: a, an, the, zero',
    level: 'A2',
    blurb:
      'When does English want "a", "the", or no article at all? The 4 cases that catch French speakers.',
    blurbFr:
      "Quand l'anglais veut \"a\", \"the\", ou rien du tout ? Les 4 cas piégeux pour les francophones.",
    rule: `Use "a/an" when introducing a singular countable noun for the first time, or when the noun is one of many.

Use "the" when the noun is specific — either already mentioned, or unique in context (the sun, the manager).

Use NO article (zero article) for plural and uncountable nouns when speaking generally: "I love coffee", "Designers think visually".

French speakers often add a "the" where English wants nothing: "the life is short" → "life is short".`,
    ruleFr: `Utilise "a/an" quand tu introduis un nom dénombrable singulier pour la première fois, ou quand le nom est l'un parmi plusieurs.

Utilise "the" quand le nom est spécifique — soit déjà mentionné, soit unique dans le contexte (the sun, the manager).

N'utilise PAS d'article (zero article) pour les noms pluriels et indénombrables quand tu parles en général : "I love coffee", "Designers think visually".

Les francophones ajoutent souvent "the" là où l'anglais ne veut rien : "the life is short" → "life is short".`,
    examples: [
      { en: 'I work as a designer.', fr: 'Je travaille comme designer.', note: 'Profession after "as a" → indefinite article.', noteFr: 'Profession après "as a" → article indéfini.' },
      { en: 'The CEO emailed me yesterday.', fr: 'La CEO m\'a écrit hier.', note: 'Specific person known to both speakers → "the".', noteFr: 'Personne précise connue des deux interlocuteurs → "the".' },
      { en: 'Designers love clarity.', fr: 'Les designers aiment la clarté.', note: 'General statement about a category → zero article.', noteFr: 'Affirmation générale sur une catégorie → pas d\'article.' },
      { en: 'Life is short.', fr: 'La vie est courte.', note: 'Abstract noun used generally → no article.', noteFr: 'Nom abstrait au sens général → pas d\'article.' },
    ],
    drills: [
      { type: 'mcq', prompt: '"___ design system saves a lot of time."', promptFr: '"___ design system fait gagner beaucoup de temps."', options: ['A', 'An', 'The', '— (no article)'], answer: 0, explanation: 'First mention, singular countable. "A design system" — any one of the category.', explanationFr: 'Première mention, dénombrable singulier. "A design system" — un parmi d\'autres.' },
      { type: 'fill', prompt: 'I really enjoy ___ jazz.', promptFr: "J'aime vraiment ___ jazz.", answer: '', acceptedAnswers: ['nothing', 'no article', '-', '—'], explanation: 'Talking about the genre in general. No article needed: "I enjoy jazz".', explanationFr: 'On parle du genre en général. Pas d\'article : "I enjoy jazz".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['The honesty is rare in business.', 'A honesty is rare in business.', 'Honesty is rare in business.', 'An honesty is rare in business.'], answer: 2, explanation: 'Abstract uncountable noun used in a general sense — zero article.', explanationFr: 'Nom abstrait indénombrable au sens général — pas d\'article.' },
      { type: 'spot-error', prompt: 'Which sentence has the article wrong?', promptFr: 'Quelle phrase a le mauvais article ?', options: ['She is a senior designer at Figma.', 'I prefer the coffee with milk.', 'We met the founder yesterday.', 'He plays guitar on weekends.'], answer: 1, explanation: '"I prefer coffee with milk" — speaking generally about coffee, no article.', explanationFr: '"I prefer coffee with milk" — on parle du café en général, pas d\'article.' },
      { type: 'fill', prompt: '___ Eiffel Tower is one of the most-visited monuments in the world.', promptFr: '___ Tour Eiffel est l\'un des monuments les plus visités au monde.', answer: 'the', acceptedAnswers: ['The'], explanation: 'Famous monuments take "the": the Eiffel Tower, the Louvre, the White House.', explanationFr: 'Les monuments célèbres prennent "the" : the Eiffel Tower, the Louvre, the White House.' },
      { type: 'mcq', prompt: 'I had ___ apple for breakfast.', promptFr: "J'ai mangé ___ pomme au petit-déj.", options: ['a', 'an', 'the', '— (no article)'], answer: 1, explanation: 'Singular countable starting with a vowel sound → "an".', explanationFr: 'Dénombrable singulier commençant par un son voyelle → "an".' },
      { type: 'fill', prompt: 'I love going to ___ cinema on weekends.', promptFr: "J'adore aller ___ cinéma le week-end.", answer: 'the', acceptedAnswers: ['The'], explanation: 'Specific recurring places (cinema, gym, beach) typically take "the".', explanationFr: 'Les lieux spécifiques récurrents (cinéma, salle, plage) prennent normalement "the".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['She speaks English fluently.', 'The English are reserved.', 'I am studying the English at university.', 'English is my second language.'], answer: 2, explanation: 'When "English" means the language in general, no article: "I am studying English".', explanationFr: 'Quand "English" désigne la langue en général, pas d\'article : "I am studying English".' },
      { type: 'mcq', prompt: 'Pick the natural opening sentence of a story.', promptFr: 'Choisis la phrase d\'ouverture naturelle d\'un récit.', options: ['Once upon a time, the boy lived in a small village.', 'Once upon a time, a boy lived in a small village.', 'Once upon a time, boy lived in small village.', 'Once upon a time, the boy lived in the small village.'], answer: 1, explanation: 'First mention of an unknown character → "a boy". The village is also new info → "a small village".', explanationFr: 'Première mention d\'un personnage inconnu → "a boy". Le village aussi → "a small village".' },
      { type: 'fill', prompt: 'There is ___ man at the door asking for you.', promptFr: 'Il y a ___ homme à la porte qui te demande.', answer: 'a', acceptedAnswers: ['A'], explanation: 'Introducing someone for the first time → "a man".', explanationFr: 'On introduit quelqu\'un pour la première fois → "a man".' },
    ],
  },

  {
    id: 'comparatives-superlatives',
    name: 'Comparatives & superlatives',
    nameFr: 'Comparatifs et superlatifs',
    level: 'A2',
    blurb:
      'Taller, more interesting, the best — the rules for comparing things, with the irregulars natives never trip on.',
    blurbFr:
      'Taller, more interesting, the best — les règles pour comparer, avec les irréguliers que les natifs ne ratent jamais.',
    rule: `**Short adjectives (1 syllable)** add **-er** for comparative and **-est** for superlative: tall → taller → the tallest. Double the consonant if it ends in consonant-vowel-consonant: big → bigger → the biggest.

**Long adjectives (3+ syllables)** use **more / the most** instead: interesting → more interesting → the most interesting.

**Two-syllable adjectives ending in -y** drop the -y and add -ier / -iest: happy → happier → the happiest.

**Irregulars to memorise**: good → better → the best · bad → worse → the worst · far → farther/further → the farthest/furthest.

After a comparative, use **than**: "She is taller than me."`,
    ruleFr: `**Les adjectifs courts (1 syllabe)** prennent **-er** pour le comparatif et **-est** pour le superlatif : tall → taller → the tallest. On double la consonne si la finale est consonne-voyelle-consonne : big → bigger → the biggest.

**Les adjectifs longs (3+ syllabes)** utilisent **more / the most** à la place : interesting → more interesting → the most interesting.

**Les adjectifs de 2 syllabes en -y** : on enlève le -y et on ajoute -ier / -iest : happy → happier → the happiest.

**Irréguliers à mémoriser** : good → better → the best · bad → worse → the worst · far → farther/further → the farthest/furthest.

Après un comparatif, on utilise **than** : "She is taller than me."`,
    examples: [
      { en: 'My new laptop is faster than the old one.', fr: 'Mon nouveau laptop est plus rapide que l\'ancien.', note: 'Short adjective + "than".', noteFr: 'Adjectif court + "than".' },
      { en: 'This is the most useful feature we shipped this year.', fr: 'C\'est la fonctionnalité la plus utile sortie cette année.', note: 'Long adjective → "the most".', noteFr: 'Adjectif long → "the most".' },
      { en: 'The earlier draft was better than this one.', fr: 'Le brouillon précédent était meilleur que celui-ci.', note: '"good" is irregular: better → the best.', noteFr: '"good" est irrégulier : better → the best.' },
    ],
    drills: [
      { type: 'fill', prompt: 'My sister is ___ (tall) than me.', promptFr: 'Ma sœur est ___ (tall) que moi.', answer: 'taller', explanation: 'Short adjective → comparative with -er.', explanationFr: 'Adjectif court → comparatif en -er.' },
      { type: 'mcq', prompt: 'This is ___ movie I have ever seen.', promptFr: 'C\'est ___ film que j\'aie jamais vu.', options: ['the most boring', 'the boringest', 'most boring', 'more boring'], answer: 0, explanation: 'Long adjective + superlative → "the most boring".', explanationFr: 'Adjectif long + superlatif → "the most boring".' },
      { type: 'fill', prompt: 'Today is ___ (happy) day of my life.', promptFr: "Aujourd'hui est ___ (happy) jour de ma vie.", answer: 'the happiest', explanation: '2-syllable -y adjective + superlative → drop y, add -iest.', explanationFr: 'Adj. -y de 2 syllabes + superlatif → on enlève le y et on ajoute -iest.' },
      { type: 'mcq', prompt: 'She runs ___ than me.', promptFr: 'Elle court ___ que moi.', options: ['fast', 'faster', 'more fast', 'the fastest'], answer: 1, explanation: 'Short word + comparative → "faster".', explanationFr: 'Mot court + comparatif → "faster".' },
      { type: 'fill', prompt: 'This year was ___ (good) than last year.', promptFr: "Cette année était ___ (good) que l'an dernier.", answer: 'better', explanation: '"good" is irregular → "better".', explanationFr: '"good" est irrégulier → "better".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['He is the most kind person I know.', 'My phone is bigger than yours.', 'This bag is heavier than expected.', 'They live farther away now.'], answer: 0, explanation: '"Kind" is short → "the kindest", not "the most kind".', explanationFr: '"Kind" est court → "the kindest", pas "the most kind".' },
      { type: 'fill', prompt: 'Today the traffic is ___ (bad) than yesterday.', promptFr: "Aujourd'hui la circulation est ___ (bad) qu'hier.", answer: 'worse', explanation: '"bad" is irregular → "worse".', explanationFr: '"bad" est irrégulier → "worse".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['He is more tall than his brother.', 'He is taller than his brother.', 'He is taller that his brother.', 'He is the most tall than his brother.'], answer: 1, explanation: 'Short adj + "than" → "taller than".', explanationFr: 'Adj. court + "than" → "taller than".' },
      { type: 'fill', prompt: 'This is ___ (interesting) book I have read this year.', promptFr: "C'est ___ (interesting) livre que j'aie lu cette année.", answer: 'the most interesting', explanation: 'Long adj + superlative → "the most interesting".', explanationFr: 'Adj. long + superlatif → "the most interesting".' },
      { type: 'mcq', prompt: 'My new commute is ___ short ___ before.', promptFr: 'Mon nouveau trajet est ___ court ___ avant.', options: ['as / as', 'so / as', 'as / than', 'more / than'], answer: 0, explanation: '"As + adjective + as" expresses equality.', explanationFr: '"As + adjectif + as" exprime l\'égalité.' },
    ],
  },

  {
    id: 'quantifiers',
    name: 'Quantifiers: some, any, much, many, a lot',
    nameFr: 'Quantifieurs : some, any, much, many, a lot',
    level: 'A2',
    blurb:
      'How much, how many — and the difference between countable and uncountable nouns that French ignores.',
    blurbFr:
      "Combien (de) — et la différence entre noms dénombrables/indénombrables que le français ignore.",
    rule: `**Countable** nouns can be counted (one apple, two apples). **Uncountable** nouns can't (water, advice, money, information). This split drives most quantifier choices.

**some / any**: "some" in positive sentences and polite offers. "Any" in negatives and most questions. *I have some time. / Do you have any time? / I don't have any money.*

**much / many / a lot of**: "much" with uncountable, "many" with countable, "a lot of" with both. In affirmative sentences, prefer "a lot of" — "much" sounds formal/old-fashioned outside negatives and questions. *I don't have much time. / How many people came? / We have a lot of work.*

**a few / a little**: "a few" with countable ("a few days"), "a little" with uncountable ("a little time").`,
    ruleFr: `Les noms **dénombrables** se comptent (one apple, two apples). Les **indénombrables** ne se comptent pas (water, advice, money, information). Cette distinction pilote presque tous les choix de quantifieurs.

**some / any** : "some" dans les phrases affirmatives et les offres polies. "Any" dans les négations et la plupart des questions. *I have some time. / Do you have any time? / I don't have any money.*

**much / many / a lot of** : "much" avec indénombrable, "many" avec dénombrable, "a lot of" avec les deux. À l'affirmatif, préfère "a lot of" — "much" sonne formel/désuet hors négations et questions. *I don't have much time. / How many people came? / We have a lot of work.*

**a few / a little** : "a few" avec dénombrable ("a few days"), "a little" avec indénombrable ("a little time").`,
    examples: [
      { en: 'I have a few minutes before the meeting.', fr: "J'ai quelques minutes avant la réunion.", note: '"Minutes" countable → "a few".', noteFr: '"Minutes" dénombrable → "a few".' },
      { en: 'There isn\'t much information online.', fr: "Il n'y a pas beaucoup d'infos en ligne.", note: '"Information" uncountable + negative → "much".', noteFr: '"Information" indénombrable + négatif → "much".' },
      { en: 'Do you have any feedback for me?', fr: 'As-tu des retours à me faire ?', note: 'Question + uncountable → "any".', noteFr: 'Question + indénombrable → "any".' },
    ],
    drills: [
      { type: 'fill', prompt: 'I don\'t have ___ time today.', promptFr: "Je n'ai pas ___ temps aujourd'hui.", answer: 'much', acceptedAnswers: ['any', 'a lot of'], explanation: '"Time" uncountable + negative → "much" (or "any").', explanationFr: '"Time" indénombrable + négatif → "much" (ou "any").' },
      { type: 'mcq', prompt: 'How ___ people came to the demo?', promptFr: 'Combien de personnes sont venues à la démo ?', options: ['much', 'many', 'a lot of', 'a few'], answer: 1, explanation: '"People" countable + question → "many".', explanationFr: '"People" dénombrable + question → "many".' },
      { type: 'fill', prompt: 'There are ___ chairs in the room — only 4.', promptFr: 'Il y a ___ chaises dans la pièce — seulement 4.', answer: 'a few', acceptedAnswers: ['only a few'], explanation: 'Countable, small but positive number → "a few".', explanationFr: 'Dénombrable, petit nombre positif → "a few".' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ['I drink many water every day.', 'I drink a lot of water every day.', 'I drink any water every day.', 'I drink much water every day.'], answer: 1, explanation: '"Water" uncountable + affirmative → "a lot of" is the most natural.', explanationFr: '"Water" indénombrable + affirmatif → "a lot of" est le plus naturel.' },
      { type: 'fill', prompt: 'Would you like ___ coffee?', promptFr: 'Tu veux ___ café ?', answer: 'some', explanation: 'Polite offer → "some" even though it\'s a question.', explanationFr: 'Offre polie → "some" même dans une question.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I have a little ideas for the project.', 'I have a few ideas for the project.', 'I have some ideas for the project.', 'I have a lot of ideas for the project.'], answer: 0, explanation: '"Ideas" countable → "a few", not "a little".', explanationFr: '"Ideas" dénombrable → "a few", pas "a little".' },
      { type: 'fill', prompt: 'There isn\'t ___ milk left in the fridge.', promptFr: "Il ne reste pas ___ lait dans le frigo.", answer: 'any', acceptedAnswers: ['much'], explanation: 'Uncountable + negative → "any" (or "much").', explanationFr: 'Indénombrable + négatif → "any" (ou "much").' },
      { type: 'mcq', prompt: 'I need ___ help with this report.', promptFr: "J'ai besoin de ___ aide pour ce rapport.", options: ['a little', 'a few', 'many', 'these'], answer: 0, explanation: '"Help" uncountable, small amount → "a little".', explanationFr: '"Help" indénombrable, petite quantité → "a little".' },
      { type: 'fill', prompt: 'How ___ does this cost?', promptFr: 'Combien ça coûte ?', answer: 'much', explanation: 'Cost is uncountable → "How much does it cost?"', explanationFr: 'Le coût est indénombrable → "How much does it cost?"' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['Have you got some questions?', 'Have you got any questions?', 'Have you got many questions?', 'Have you got a little questions?'], answer: 1, explanation: 'Standard "Any questions?" question form.', explanationFr: 'Forme standard "Any questions?".' },
    ],
  },

  /* ============================== B1 ============================== */
  {
    id: 'modals-obligation',
    name: 'Modals of obligation: must, have to, should',
    nameFr: 'Modaux d\'obligation : must, have to, should',
    level: 'B1',
    blurb:
      'Three modals that English speakers don\'t use interchangeably — and the polite/strict distinction French collapses.',
    blurbFr:
      "Trois modaux que les anglophones n'utilisent pas de façon interchangeable — la nuance poli/strict que le français efface.",
    rule: `**must** — strong personal obligation or rule. *I must finish this today. / Visitors must wear a badge.*

**have to** — external obligation, often imposed by circumstances or rules. Less personal than "must". *I have to leave early — my train is at 6.*

**should / ought to** — advice or expectation, weaker than must/have to. *You should review the spec before the call.*

**mustn't** vs **don't have to**: very different! "Mustn't" = it's forbidden. "Don't have to" = it's not required (you can if you want). *You mustn't smoke here. / You don't have to come if you're tired.*

In the past, all three become "had to" (had-to is the only past form for obligation). For "should" past = "should have + V-ed".`,
    ruleFr: `**must** — obligation personnelle forte ou règle. *I must finish this today. / Visitors must wear a badge.*

**have to** — obligation externe, souvent imposée par les circonstances ou les règles. Moins personnel que "must". *I have to leave early — my train is at 6.*

**should / ought to** — conseil ou attente, moins fort que must/have to. *You should review the spec before the call.*

**mustn't** vs **don't have to** : très différents ! "Mustn't" = c'est interdit. "Don't have to" = ce n'est pas obligatoire (libre à toi). *You mustn't smoke here. / You don't have to come if you're tired.*

Au passé, tous les trois deviennent "had to" (la seule forme passée pour l'obligation). Pour "should" passé = "should have + V-ed".`,
    examples: [
      { en: 'I have to be at the airport by 6.', fr: 'Je dois être à l\'aéroport à 6h.', note: 'External obligation (flight schedule).', noteFr: 'Obligation externe (horaire de vol).' },
      { en: 'You must read this book — it\'s incredible.', fr: 'Tu dois lire ce livre — il est incroyable.', note: 'Strong personal recommendation.', noteFr: 'Recommandation personnelle forte.' },
      { en: 'You should let your manager know.', fr: 'Tu devrais en informer ton manager.', note: 'Advice, not obligation.', noteFr: 'Conseil, pas obligation.' },
      { en: 'You mustn\'t share this with anyone.', fr: 'Tu ne dois SURTOUT PAS partager ça.', note: '"Mustn\'t" = forbidden, very strong.', noteFr: '"Mustn\'t" = interdit, très fort.' },
    ],
    drills: [
      { type: 'fill', prompt: 'I ___ (have to) leave at 5 — my flight is at 8.', promptFr: 'Je ___ (have to) partir à 17h — mon vol est à 20h.', answer: 'have to', explanation: 'External obligation (flight schedule).', explanationFr: 'Obligation externe (horaire de vol).' },
      { type: 'mcq', prompt: 'You ___ try this restaurant — it\'s amazing.', promptFr: 'Tu ___ essayer ce resto — c\'est incroyable.', options: ['have to', 'must', 'should', 'all three work'], answer: 3, explanation: 'All three work for a strong recommendation; "must" is the most enthusiastic.', explanationFr: 'Les trois marchent pour une recommandation forte ; "must" est le plus enthousiaste.' },
      { type: 'spot-error', prompt: 'Which sentence has the wrong meaning?', promptFr: 'Quelle phrase a le mauvais sens ?', options: ['You don\'t have to come if you\'re busy. (= it\'s optional)', 'You mustn\'t come. (= it\'s forbidden)', 'You don\'t have to come. (= it\'s forbidden)', 'You should come. (= it\'s a good idea)'], answer: 2, explanation: '"Don\'t have to" means optional, NOT forbidden. "Mustn\'t" means forbidden.', explanationFr: '"Don\'t have to" signifie facultatif, PAS interdit. "Mustn\'t" signifie interdit.' },
      { type: 'fill', prompt: 'You ___ (should) probably get more sleep.', promptFr: "Tu ___ (should) peut-être dormir plus.", answer: 'should', explanation: 'Advice → "should".', explanationFr: 'Conseil → "should".' },
      { type: 'mcq', prompt: 'Last week I ___ work on Saturday.', promptFr: 'La semaine dernière j\'___ travailler samedi.', options: ['must', 'had to', 'should', 'have to'], answer: 1, explanation: 'Past obligation → "had to" (only past form).', explanationFr: 'Obligation passée → "had to" (seule forme passée).' },
      { type: 'fill', prompt: 'You ___ (must / negative) tell anyone — it\'s confidential.', promptFr: "Tu ___ (must / négatif) en parler à qui que ce soit — c'est confidentiel.", answer: "mustn't", acceptedAnswers: ['must not'], explanation: '"Mustn\'t" = strict prohibition.', explanationFr: '"Mustn\'t" = interdiction stricte.' },
      { type: 'mcq', prompt: 'Which sentence expresses advice (not obligation)?', promptFr: 'Quelle phrase exprime un conseil (pas une obligation) ?', options: ['You must wear a helmet.', 'You should wear a helmet.', 'You have to wear a helmet.', 'You mustn\'t wear a helmet.'], answer: 1, explanation: '"Should" is for advice; the others are obligation/prohibition.', explanationFr: '"Should" est pour le conseil ; les autres sont obligation/interdiction.' },
      { type: 'fill', prompt: 'You ___ (have to / negative) reply right now — take your time.', promptFr: "Tu ___ (have to / négatif) répondre tout de suite — prends ton temps.", answer: "don't have to", explanation: '"Don\'t have to" = it\'s not required, no rush.', explanationFr: '"Don\'t have to" = ce n\'est pas obligatoire, pas de précipitation.' },
      { type: 'spot-error', prompt: 'Which sentence sounds wrong?', promptFr: 'Quelle phrase sonne fausse ?', options: ['I should called her yesterday.', 'I should have called her yesterday.', 'I had to call her yesterday.', 'I must call her tomorrow.'], answer: 0, explanation: 'Past with "should" → "should HAVE called", not "should called".', explanationFr: 'Passé avec "should" → "should HAVE called", pas "should called".' },
      { type: 'mcq', prompt: 'In a museum: "Visitors ___ touch the artworks."', promptFr: 'Dans un musée : "Les visiteurs ___ toucher les œuvres."', options: ['should not', 'must not', 'do not have to', 'might not'], answer: 1, explanation: 'Strict rule → "must not".', explanationFr: 'Règle stricte → "must not".' },
    ],
  },

  {
    id: 'relative-clauses',
    name: 'Relative clauses: who, which, that, whose',
    nameFr: 'Propositions relatives : who, which, that, whose',
    level: 'B1',
    blurb:
      'How to attach a description to a noun cleanly. The tiny choice of pronoun that signals you know what you\'re doing.',
    blurbFr:
      "Comment accrocher une description à un nom proprement. Le petit choix de pronom qui signale que tu maîtrises.",
    rule: `**who** — for people. *The colleague who joined last month is from Berlin.*

**which** — for things and animals. *The proposal which we sent yesterday came back signed.*

**that** — works for both people AND things in defining clauses (which is most cases). *The book that I borrowed / The friend that I called.*

**whose** — for possession (= "of which / of whom"). *A designer whose work I admire / A house whose garden is huge.*

**Defining vs non-defining clauses**: defining clauses identify which one (no commas, "that" allowed). Non-defining clauses add extra info (commas, "that" NOT allowed, only "who/which").
- *The man who lives next door is a doctor.* (defining)
- *My father, who is a doctor, retired last year.* (non-defining — commas)`,
    ruleFr: `**who** — pour les personnes. *The colleague who joined last month is from Berlin.*

**which** — pour les choses et les animaux. *The proposal which we sent yesterday came back signed.*

**that** — fonctionne pour les personnes ET les choses dans les propositions déterminatives (la plupart des cas). *The book that I borrowed / The friend that I called.*

**whose** — pour la possession (= "of which / of whom"). *A designer whose work I admire / A house whose garden is huge.*

**Déterminatives vs non-déterminatives** : les déterminatives identifient laquelle (pas de virgules, "that" autorisé). Les non-déterminatives ajoutent une info supplémentaire (virgules, "that" INTERDIT, seulement "who/which").
- *The man who lives next door is a doctor.* (déterminative)
- *My father, who is a doctor, retired last year.* (non-déterminative — virgules)`,
    examples: [
      { en: 'The colleague who reviewed my deck gave great notes.', fr: 'Le collègue qui a revu mon deck a fait de super retours.', note: 'Defining + person → "who".', noteFr: 'Déterminative + personne → "who".' },
      { en: 'The framework which we use is open source.', fr: 'Le framework qu\'on utilise est open source.', note: 'Defining + thing → "which" or "that".', noteFr: 'Déterminative + chose → "which" ou "that".' },
      { en: 'My boss, who used to work at Apple, knows everyone.', fr: 'Mon boss, qui bossait avant chez Apple, connaît tout le monde.', note: 'Non-defining → commas + "who" (NOT "that").', noteFr: 'Non-déterminative → virgules + "who" (PAS "that").' },
      { en: 'The designer whose work I follow just launched a book.', fr: 'La designer dont je suis le travail vient de sortir un livre.', note: '"Whose" = possession.', noteFr: '"Whose" = possession.' },
    ],
    drills: [
      { type: 'fill', prompt: 'The candidate ___ I interviewed yesterday was excellent.', promptFr: 'La candidate ___ j\'ai vue hier était excellente.', answer: 'who', acceptedAnswers: ['that', 'whom'], explanation: 'Defining + person → "who" / "that" / "whom".', explanationFr: 'Déterminative + personne → "who" / "that" / "whom".' },
      { type: 'fill', prompt: 'The library ___ we use for animations is amazing.', promptFr: 'La librairie ___ on utilise pour les animations est top.', answer: 'which', acceptedAnswers: ['that'], explanation: 'Defining + thing → "which" or "that".', explanationFr: 'Déterminative + chose → "which" ou "that".' },
      { type: 'mcq', prompt: 'My sister, ___ lives in Lisbon, just got promoted.', promptFr: 'Ma sœur, ___ vit à Lisbonne, vient d\'être promue.', options: ['that', 'who', 'which', 'whose'], answer: 1, explanation: 'Non-defining (commas) + person → only "who" works (NOT "that").', explanationFr: 'Non-déterminative (virgules) + personne → seul "who" marche (PAS "that").' },
      { type: 'fill', prompt: 'The designer ___ portfolio I love most is Tobias Frere-Jones.', promptFr: 'Le designer ___ portfolio j\'adore le plus est Tobias Frere-Jones.', answer: 'whose', explanation: '"Whose" = possessive ("of which" for people).', explanationFr: '"Whose" = possessif ("of which" pour les personnes).' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['The book that I read was great.', 'The book what I read was great.', 'The book which I read was great.', 'Both 1 and 3 are correct.'], answer: 3, explanation: '"That" and "which" both work in defining clauses with things. "What" is wrong here.', explanationFr: '"That" et "which" marchent tous deux en déterminative avec les choses. "What" est faux ici.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['My laptop, that I bought last year, still works fine.', 'The book I borrowed was overdue.', 'The dog whose owner I met is friendly.', 'The candidate who applied is from Spain.'], answer: 0, explanation: 'Non-defining (commas) cannot use "that". Use "which": "My laptop, which I bought last year…".', explanationFr: 'Non-déterminative (virgules) ne peut pas prendre "that". Utilise "which" : "My laptop, which I bought last year…".' },
      { type: 'fill', prompt: 'The friend ___ I called last night is moving to Tokyo.', promptFr: "L'amie ___ j'ai appelée hier soir part à Tokyo.", answer: 'who', acceptedAnswers: ['that', 'whom'], explanation: 'Defining + person → "who" or "that".', explanationFr: 'Déterminative + personne → "who" ou "that".' },
      { type: 'mcq', prompt: 'In casual English, when can you DROP the relative pronoun?', promptFr: 'En anglais courant, quand peux-tu OMETTRE le pronom relatif ?', options: ['Never — it\'s always required.', 'When the pronoun is the OBJECT in the relative clause.', 'When the pronoun is the SUBJECT in the relative clause.', 'Only with "whose".'], answer: 1, explanation: 'You can drop "who/which/that" when it\'s the object: "The book [that] I read" → "The book I read".', explanationFr: 'On peut omettre "who/which/that" quand c\'est l\'objet : "The book [that] I read" → "The book I read".' },
      { type: 'fill', prompt: 'The team ___ ships fastest gets the bonus.', promptFr: 'L\'équipe ___ livre le plus vite obtient le bonus.', answer: 'that', acceptedAnswers: ['which'], explanation: 'Defining + collective noun → "that" or "which".', explanationFr: 'Déterminative + nom collectif → "that" ou "which".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['That\'s the man who his car was stolen.', 'That\'s the man whose car was stolen.', 'That\'s the man which car was stolen.', 'That\'s the man that his car was stolen.'], answer: 1, explanation: 'Possession with people → "whose".', explanationFr: 'Possession avec personnes → "whose".' },
    ],
  },

  /* ============================== B2 ============================== */
  {
    id: 'conditionals',
    name: 'Conditionals: zero, first, second, third, mixed',
    nameFr: 'Conditionnelles : zero, first, second, third, mixed',
    level: 'B2',
    blurb:
      'The 5 "if" patterns natives switch between without thinking, with the mixed conditional that French has no clean equivalent for.',
    blurbFr:
      "Les 5 schémas \"if\" que les natifs alternent sans y penser, avec le conditionnel mixte qui n'a pas d'équivalent net en français.",
    rule: `**Zero** — universal truths. "If + present, present": *If you heat water to 100°C, it boils.*

**First** — realistic future condition. "If + present, will + base": *If it rains, we'll stay in.*

**Second** — hypothetical present/future, unlikely. "If + past, would + base": *If I were you, I'd accept.* Note "were" for all subjects in careful English.

**Third** — past hypothetical (didn't happen). "If + past perfect, would have + V-ed": *If you had told me earlier, I would have helped.*

**Mixed** — past condition with present consequence. "If + past perfect, would + base": *If she had taken the job, she'd be in San Francisco now.*`,
    ruleFr: `**Zero** — vérités universelles. "If + présent, présent" : *If you heat water to 100°C, it boils.*

**First** — condition réaliste au futur. "If + présent, will + base" : *If it rains, we'll stay in.*

**Second** — hypothèse présent/futur peu probable. "If + prétérit, would + base" : *If I were you, I'd accept.* "Were" pour tous les sujets en anglais soigné.

**Third** — hypothèse passée (qui ne s'est pas produite). "If + past perfect, would have + V-ed" : *If you had told me earlier, I would have helped.*

**Mixed** — condition passée avec conséquence présente. "If + past perfect, would + base" : *If she had taken the job, she'd be in San Francisco now.*`,
    examples: [
      { en: 'If you push the deadline, the team panics.', fr: 'Si tu repousses la deadline, l\'équipe panique.', note: 'Zero conditional — observed pattern.', noteFr: 'Zero conditional — pattern observé.' },
      { en: "If we ship by Friday, I'll buy lunch.", fr: 'Si on livre vendredi, je paie le déj.', note: 'First — realistic future.', noteFr: 'First — futur réaliste.' },
      { en: 'If I were the CEO, I would scrap that meeting.', fr: 'Si j\'étais le CEO, je supprimerais cette réunion.', note: 'Second — hypothetical, "were" not "was".', noteFr: 'Second — hypothèse, "were" et non "was".' },
      { en: 'If we had scoped properly, we would not have missed Q3.', fr: "Si on avait bien cadré, on n'aurait pas raté le Q3.", note: 'Third — past regret.', noteFr: 'Third — regret passé.' },
      { en: 'If I had taken that job, I would be in New York now.', fr: "Si j'avais pris ce job, je serais à New York maintenant.", note: 'Mixed — past decision, present consequence.', noteFr: 'Mixed — décision passée, conséquence présente.' },
    ],
    drills: [
      { type: 'mcq', prompt: "If it ___ tomorrow, we'll stay in.", promptFr: "S'il ___ demain, on reste à la maison.", options: ['will rain', 'rains', 'rained', 'would rain'], answer: 1, explanation: 'First conditional: "if + present", "will + base" in the main clause.', explanationFr: 'First conditional : "if + présent", "will + base" dans la principale.' },
      { type: 'fill', prompt: 'If I ___ you, I would take the offer.', promptFr: "Si j'___ toi, je prendrais l'offre.", answer: 'were', acceptedAnswers: ['was'], explanation: 'Second conditional uses "were" for all subjects in careful English.', explanationFr: 'Le second conditional utilise "were" pour tous les sujets en anglais soigné.' },
      { type: 'mcq', prompt: 'Pick the third-conditional sentence.', promptFr: 'Choisis la phrase au third conditional.', options: ["If we had launched in March, we'd hit Q2 targets.", "If we launch in March, we'll hit Q2 targets.", "If we launched in March, we'd hit Q2 targets.", "If we'd launch in March, we hit Q2 targets."], answer: 0, explanation: '"If + past perfect (had launched), would have + V-ed". Past hypothetical that didn\'t happen.', explanationFr: '"If + past perfect (had launched), would have + V-ed". Hypothèse passée non réalisée.' },
      { type: 'fill', prompt: 'If she had accepted the job, she ___ in Berlin now.', promptFr: 'Si elle avait accepté le job, elle ___ à Berlin maintenant.', answer: 'would be', acceptedAnswers: ["'d be", 'd be'], explanation: 'Mixed conditional: past condition (had accepted) with present consequence (would be).', explanationFr: 'Mixed conditional : condition passée (had accepted) avec conséquence présente (would be).' },
      { type: 'spot-error', prompt: 'Which conditional is wrong?', promptFr: 'Quelle conditionnelle est fausse ?', options: ['If I had known earlier, I would have prepared.', 'If you would heat water to 100°C, it boils.', 'If we ship on time, the CEO will be relieved.', 'If I were rich, I would still work.'], answer: 1, explanation: 'Zero conditional uses present in both clauses: "If you HEAT water, it boils". No "would".', explanationFr: 'Zero conditional : présent dans les deux propositions : "If you HEAT water, it boils". Pas de "would".' },
      { type: 'fill', prompt: 'If we ___ (have) more time, we could polish the launch.', promptFr: 'Si nous ___ (have) plus de temps, on pourrait peaufiner le lancement.', answer: 'had', explanation: 'Second conditional → "had".', explanationFr: 'Second conditional → "had".' },
      { type: 'fill', prompt: 'If I ___ (see) you, I would have stopped to chat.', promptFr: "Si je t'___ (see), je me serais arrêté discuter.", answer: 'had seen', explanation: 'Third conditional → "had seen".', explanationFr: 'Third conditional → "had seen".' },
      { type: 'mcq', prompt: '"If you press this button, the screen lights up." This is which conditional?', promptFr: '"If you press this button, the screen lights up." C\'est quelle conditionnelle ?', options: ['Zero', 'First', 'Second', 'Third'], answer: 0, explanation: 'Cause-and-effect general truth → zero conditional.', explanationFr: 'Vérité générale cause-effet → zero conditional.' },
      { type: 'fill', prompt: 'Unless you ___ (apply) by Friday, you miss the round.', promptFr: 'Sauf si tu ___ (apply) avant vendredi, tu rates ce round.', answer: 'apply', explanation: '"Unless" = "if not" → present in conditional clause.', explanationFr: '"Unless" = "si... pas" → présent dans la subordonnée.' },
      { type: 'mcq', prompt: 'Pick the most natural sentence for "I regret not calling".', promptFr: 'Choisis la phrase la plus naturelle pour "je regrette de ne pas avoir appelé".', options: ['I wish I called her.', 'If only I had called her.', 'I would call her.', 'If I would have called her.'], answer: 1, explanation: '"If only + past perfect" expresses past regret most cleanly.', explanationFr: '"If only + past perfect" exprime le regret passé le plus clairement.' },
    ],
  },

  {
    id: 'reported-speech',
    name: 'Reported speech (indirect speech)',
    nameFr: 'Discours rapporté (style indirect)',
    level: 'B2',
    blurb:
      'Backshifted tenses, "say" vs "tell", and how to report questions cleanly.',
    blurbFr:
      "Recul des temps, \"say\" vs \"tell\", et comment rapporter une question proprement.",
    rule: `When you report what someone said, the verb "moves back" in time:
present → past, past → past perfect, will → would, can → could, must → had to.

"Say" doesn't take an indirect object: *She said she was tired.* (no "me")
"Tell" requires an indirect object: *She told me she was tired.* (with "me")

For reported questions, use statement order — no question mark, no "do/does":
*Where do you live?* → *He asked where I lived.*`,
    ruleFr: `Quand tu rapportes ce que quelqu'un a dit, le verbe "recule" dans le temps :
présent → prétérit, prétérit → past perfect, will → would, can → could, must → had to.

"Say" ne prend PAS de complément indirect : *She said she was tired.* (pas "me")
"Tell" exige un complément indirect : *She told me she was tired.* (avec "me")

Pour les questions rapportées, ordre affirmatif — pas de point d'interrogation, pas de "do/does" :
*Where do you live?* → *He asked where I lived.*`,
    examples: [
      { en: 'She told me she was leaving early.', fr: "Elle m'a dit qu'elle partait tôt.", note: '"told me" — tell takes an indirect object.', noteFr: '"told me" — tell prend un complément indirect.' },
      { en: 'He said the prototype was ready.', fr: 'Il a dit que le prototype était prêt.', note: '"said" — no indirect object after say.', noteFr: '"said" — pas de complément indirect après say.' },
      { en: 'She asked if I had finished the deck.', fr: "Elle m'a demandé si j'avais fini le deck.", note: 'Yes/no question becomes "asked if + past perfect".', noteFr: 'Question oui/non devient "asked if + past perfect".' },
      { en: 'He asked where I worked.', fr: "Il m'a demandé où je travaillais.", note: 'Wh-question keeps the wh-word, statement order, backshifted verb.', noteFr: 'Question en wh- garde le wh-, ordre affirmatif, verbe reculé.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Pick the correct reported-speech sentence.', promptFr: 'Choisis la phrase correcte au discours rapporté.', options: ['She said me she was tired.', 'She told that she was tired.', 'She told me she was tired.', 'She said me that she is tired.'], answer: 2, explanation: '"Tell" takes an indirect object ("me"); "say" does not.', explanationFr: '"Tell" prend un complément indirect ("me") ; "say" non.' },
      { type: 'fill', prompt: 'He asked where I ___ that morning.', promptFr: "Il m'a demandé où j'___ ce matin-là.", answer: 'had been', acceptedAnswers: ['was', 'had gone'], explanation: 'Reported wh-question, statement order, past perfect for completed past actions.', explanationFr: 'Question en wh- rapportée, ordre affirmatif, past perfect pour actions terminées.' },
      { type: 'spot-error', prompt: 'Which sentence reports speech incorrectly?', promptFr: 'Quelle phrase rapporte mal le discours ?', options: ['She told me that she would join later.', 'He said he had finished the report.', 'They asked me where do I live.', 'I said I could help on Friday.'], answer: 2, explanation: 'Reported questions use statement order: "where I live", not "where do I live".', explanationFr: 'Les questions rapportées prennent l\'ordre affirmatif : "where I live", pas "where do I live".' },
      { type: 'mcq', prompt: 'Direct: "I will check tomorrow." Reported (yesterday):', promptFr: 'Direct : "I will check tomorrow." Rapporté (hier) :', options: ['She said she will check tomorrow.', 'She said she would check the next day.', 'She told she will check tomorrow.', 'She told that she would check tomorrow.'], answer: 1, explanation: '"will" → "would" (backshift), "tomorrow" → "the next day" (time shift).', explanationFr: '"will" → "would" (recul), "tomorrow" → "the next day" (décalage temporel).' },
      { type: 'fill', prompt: 'My manager ___ me that the deadline had moved.', promptFr: 'Mon manager m\'___ que la deadline avait bougé.', answer: 'told', explanation: '"Tell" + indirect object. "Said" wouldn\'t take "me" directly.', explanationFr: '"Tell" + complément indirect. "Said" ne prend pas "me" directement.' },
      { type: 'fill', prompt: 'She said she ___ (be) tired.', promptFr: 'Elle a dit qu\'elle ___ (be) fatiguée.', answer: 'was', explanation: 'Present "is" backshifts to past "was".', explanationFr: 'Le présent "is" recule au prétérit "was".' },
      { type: 'mcq', prompt: 'Direct: "Can you help me?" Reported:', promptFr: 'Direct : "Can you help me?" Rapporté :', options: ['He asked can I help him.', 'He asked if I could help him.', 'He asked do I help him.', 'He said me to help him.'], answer: 1, explanation: 'Yes/no question → "asked if" + statement order + backshift "can" → "could".', explanationFr: 'Question oui/non → "asked if" + ordre affirmatif + recul "can" → "could".' },
      { type: 'fill', prompt: 'They said they ___ (just / arrive).', promptFr: "Ils ont dit qu'ils ___ (just / arrive).", answer: 'had just arrived', explanation: 'Present perfect "have just arrived" → past perfect "had just arrived".', explanationFr: 'Present perfect "have just arrived" → past perfect "had just arrived".' },
      { type: 'spot-error', prompt: 'Which reported sentence is wrong?', promptFr: 'Quelle phrase rapportée est fausse ?', options: ['He said me he was leaving.', 'He told me he was leaving.', 'He said he was leaving.', 'He asked me when I was leaving.'], answer: 0, explanation: 'Should be "told me" or "said" (without "me").', explanationFr: 'Il faudrait "told me" ou "said" (sans "me").' },
      { type: 'fill', prompt: 'She asked if I ___ (will) come to the party.', promptFr: "Elle a demandé si je ___ (will) venir à la fête.", answer: 'would', explanation: '"Will" backshifts to "would" in reported speech.', explanationFr: '"Will" recule à "would" au discours rapporté.' },
    ],
  },

  {
    id: 'used-to',
    name: 'Used to / be used to / get used to',
    nameFr: 'Used to / be used to / get used to',
    level: 'B2',
    blurb:
      'Three look-alike structures with completely different meanings — and the trap French speakers fall into every time.',
    blurbFr:
      'Trois structures qui se ressemblent mais ont des sens complètement différents — le piège classique des francophones.',
    rule: `**used to + base verb** — past habit or state that no longer exists. *I used to smoke. / She used to live in Paris.*

**be used to + noun / -ing** — be ACCUSTOMED to something now. *I'm used to the noise. / He's used to working late.*

**get used to + noun / -ing** — BECOME accustomed to (process). *It took me a month to get used to the new keyboard.*

The killer trap: "used to" is past, "be/get used to" can be any tense. And "be used to + verb" requires the GERUND, not the infinitive: *I'm used to working late* — NOT *I'm used to work late*.`,
    ruleFr: `**used to + verbe à la base** — habitude ou état passé qui n'existe plus. *I used to smoke. / She used to live in Paris.*

**be used to + nom / -ing** — être HABITUÉ à quelque chose maintenant. *I'm used to the noise. / He's used to working late.*

**get used to + nom / -ing** — DEVENIR habitué (processus). *It took me a month to get used to the new keyboard.*

Le piège mortel : "used to" est passé, "be/get used to" peut être à n'importe quel temps. Et "be used to + verbe" exige le GÉRONDIF, pas l'infinitif : *I'm used to working late* — PAS *I'm used to work late*.`,
    examples: [
      { en: 'I used to bike to work, but I take the train now.', fr: "J'allais au travail à vélo, mais je prends le train maintenant.", note: 'Past habit that stopped → "used to + base".', noteFr: 'Habitude passée arrêtée → "used to + base".' },
      { en: "I'm used to working from home.", fr: 'Je suis habituée à bosser de chez moi.', note: 'Currently accustomed → "be used to + -ing".', noteFr: 'Habitué actuellement → "be used to + -ing".' },
      { en: 'It took me a while to get used to American spelling.', fr: "Ça m'a pris un moment pour m'habituer à l'orthographe américaine.", note: 'Process of becoming used to → "get used to".', noteFr: 'Processus d\'habituation → "get used to".' },
    ],
    drills: [
      { type: 'fill', prompt: 'I ___ (use to) play the piano when I was a kid.', promptFr: "Je ___ (use to) jouer du piano quand j'étais enfant.", answer: 'used to', explanation: 'Past habit → "used to + base verb".', explanationFr: 'Habitude passée → "used to + verbe à la base".' },
      { type: 'mcq', prompt: 'Now that I work in tech, I ___ Slack notifications all day.', promptFr: "Maintenant que je bosse dans la tech, je ___ aux notifications Slack toute la journée.", options: ['used to', "'m used to", "'m used", 'use to'], answer: 1, explanation: 'Currently accustomed → "be used to".', explanationFr: 'Habitué actuellement → "be used to".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["I'm used to wake up early.", "I'm used to waking up early.", "I used to wake up early when I was younger.", "I'm getting used to the new schedule."], answer: 0, explanation: '"Be used to" + GERUND, not infinitive: "used to waking up", not "used to wake up".', explanationFr: '"Be used to" + GÉRONDIF, pas infinitif : "used to waking up", pas "used to wake up".' },
      { type: 'fill', prompt: "It took her months to ___ (get use to) the new role.", promptFr: "Il lui a fallu des mois pour ___ (get use to) son nouveau poste.", answer: 'get used to', explanation: 'Process → "get used to".', explanationFr: 'Processus → "get used to".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I used to drinking coffee in the morning.', "I'm used to drink coffee in the morning.", "I'm used to drinking coffee in the morning.", "I'm using to drink coffee in the morning."], answer: 2, explanation: '"Be used to + -ing" is the natural form.', explanationFr: '"Be used to + -ing" est la forme naturelle.' },
      { type: 'fill', prompt: 'Did you ___ (use to) live in this neighborhood?', promptFr: "Tu ___ (use to) vivre dans ce quartier ?", answer: 'use to', explanation: 'In questions: "did + use to" (no -d after did).', explanationFr: 'Dans les questions : "did + use to" (pas de -d après did).' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I didn\'t used to like olives.', "I didn't use to like olives.", "I'm not used to driving on the right.", "She used to be much shyer."], answer: 0, explanation: 'After "didn\'t", the verb stays in the BASE form: "didn\'t use to" (no -d).', explanationFr: 'Après "didn\'t", le verbe reste à la BASE : "didn\'t use to" (pas de -d).' },
      { type: 'fill', prompt: 'After two months in Tokyo, I ___ (be / use to) the metro system.', promptFr: 'Après deux mois à Tokyo, je ___ (be / use to) au métro.', answer: 'am used to', acceptedAnswers: ["'m used to"], explanation: 'Now accustomed → "be used to".', explanationFr: 'Habitué maintenant → "be used to".' },
      { type: 'mcq', prompt: 'Which sentence describes a past habit that has stopped?', promptFr: 'Quelle phrase décrit une habitude passée arrêtée ?', options: ["I'm used to working late.", 'I used to work late, but I clock out at 6 now.', 'I\'m getting used to working late.', 'I always work late.'], answer: 1, explanation: '"Used to + base" + contrast with present → past habit that stopped.', explanationFr: '"Used to + base" + contraste avec le présent → habitude passée arrêtée.' },
      { type: 'fill', prompt: 'He\'ll ___ (get use to) the new tooling — give him a week.', promptFr: 'Il va ___ (get use to) au nouvel outillage — laisse-lui une semaine.', answer: 'get used to', explanation: 'Future process → "get used to".', explanationFr: 'Processus futur → "get used to".' },
    ],
  },

  /* ============================== C1 / C2 ============================== */
  {
    id: 'subjunctive',
    name: 'Subjunctive after suggest, demand, insist',
    nameFr: 'Subjonctif après suggest, demand, insist',
    level: 'C1',
    blurb:
      'The bare-verb pattern that signals careful, professional English — and why "I suggest he is more careful" sounds off.',
    blurbFr:
      "Le pattern verbe-à-la-base qui signale un anglais soigné, professionnel — et pourquoi \"I suggest he is more careful\" sonne faux.",
    rule: `After verbs of suggestion, recommendation, or demand (suggest, recommend, propose, demand, insist, request, require, urge), careful English uses the BARE verb (subjunctive) in the that-clause — no -s on third person, no "to be" inflection.

Pattern: *"I suggest that he be more careful."* (not "is", not "should be")
Pattern: *"They demanded that she resign immediately."* (not "resigns")

This sounds formal but is alive in written and professional English. Spoken English may relax to "should + base" — *"I suggest that he should be more careful"* — which is also acceptable.`,
    ruleFr: `Après les verbes de suggestion, recommandation ou demande (suggest, recommend, propose, demand, insist, request, require, urge), un anglais soigné utilise le verbe à la BASE (subjonctif) dans la subordonnée en that — pas de -s à la 3ᵉ personne, pas d'accord pour "to be".

Pattern : *"I suggest that he be more careful."* (pas "is", pas "should be")
Pattern : *"They demanded that she resign immediately."* (pas "resigns")

Cela sonne formel mais reste vivant à l'écrit et en milieu professionnel. À l'oral, on peut adoucir avec "should + base" — *"I suggest that he should be more careful"* — qui est aussi acceptable.`,
    examples: [
      { en: 'The board recommends that the CEO step down.', fr: 'Le conseil recommande que le CEO démissionne.', note: 'Bare verb "step", not "steps".', noteFr: 'Verbe à la base "step", pas "steps".' },
      { en: 'I insist that he be present at the review.', fr: 'J\'insiste pour qu\'il soit présent à la review.', note: 'Bare "be", not "is" / "be present" not "should be present".', noteFr: '"be" à la base, pas "is" / "be present", pas "should be present".' },
      { en: 'She demanded that the report be rewritten.', fr: "Elle a exigé que le rapport soit réécrit.", note: 'Bare passive "be rewritten".', noteFr: 'Passif à la base "be rewritten".' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Pick the sentence that uses the subjunctive correctly.', promptFr: 'Choisis la phrase qui utilise le subjonctif correctement.', options: ['I suggest that he is more careful next time.', 'I suggest that he be more careful next time.', 'I suggest that he was more careful next time.', 'I suggest that he would be more careful next time.'], answer: 1, explanation: 'After "suggest that", careful English uses the bare subjunctive: "he be".', explanationFr: 'Après "suggest that", anglais soigné = subjonctif à la base : "he be".' },
      { type: 'fill', prompt: 'The committee demanded that the policy ___ revised.', promptFr: 'Le comité a exigé que la politique ___ révisée.', answer: 'be', explanation: 'Bare passive subjunctive after "demand that".', explanationFr: 'Subjonctif passif à la base après "demand that".' },
      { type: 'mcq', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['She insisted that he stay for lunch.', 'They recommend that the deadline be moved.', 'I propose that he goes with us.', 'The doctor advised that she take a week off.'], answer: 2, explanation: 'Should be "I propose that he go with us" — bare verb after propose.', explanationFr: 'Il faudrait "I propose that he go with us" — verbe à la base après propose.' },
      { type: 'fill', prompt: 'It is essential that every team member ___ to the meeting.', promptFr: 'Il est essentiel que chaque membre ___ à la réunion.', answer: 'come', acceptedAnswers: ['attend', 'show'], explanation: 'Subjunctive after "essential that" — bare form, no -s on third person.', explanationFr: 'Subjonctif après "essential that" — base, pas de -s.' },
      { type: 'spot-error', prompt: 'Which sentence breaks the subjunctive rule?', promptFr: 'Quelle phrase casse la règle du subjonctif ?', options: ['I insist that he be on time.', 'They demanded that the project be delayed.', 'I suggest that she goes to the doctor.', 'It is crucial that he attend the meeting.'], answer: 2, explanation: '"I suggest that she GO to the doctor." — bare verb, not "goes".', explanationFr: '"I suggest that she GO to the doctor." — base, pas "goes".' },
      { type: 'fill', prompt: 'The judge ordered that the witness ___ (speak) freely.', promptFr: 'Le juge a ordonné que le témoin ___ (speak) librement.', answer: 'speak', explanation: 'After "order that" → bare verb.', explanationFr: 'Après "order that" → verbe à la base.' },
      { type: 'mcq', prompt: '"It is recommended that everyone ___ a backup."', promptFr: '"It is recommended that everyone ___ a backup."', options: ['has', 'have', 'should have', 'is having'], answer: 1, explanation: 'After "It is recommended that" → bare subjunctive "have".', explanationFr: 'Après "It is recommended that" → subjonctif à la base "have".' },
      { type: 'fill', prompt: 'The CEO requested that the report ___ (be) submitted by Friday.', promptFr: 'Le CEO a demandé que le rapport ___ (be) rendu vendredi.', answer: 'be', explanation: 'Bare passive after "request that".', explanationFr: 'Passif à la base après "request that".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong in formal English?', promptFr: "Quelle phrase est fausse en anglais formel ?", options: ['I urge that the law be changed.', 'I urge that the law is changed.', 'It\'s vital that he speak up.', 'They proposed that we hire her.'], answer: 1, explanation: 'After "urge that" → bare "be", not "is".', explanationFr: 'Après "urge that" → base "be", pas "is".' },
      { type: 'mcq', prompt: 'Which is the most natural informal alternative to "I suggest he be careful"?', promptFr: "Quelle est l'alternative informelle la plus naturelle à \"I suggest he be careful\" ?", options: ['I suggest he is careful.', 'I suggest he should be careful.', 'I suggest him careful.', 'I suggest that careful.'], answer: 1, explanation: '"Should + base" is the natural informal alternative.', explanationFr: '"Should + base" est l\'alternative informelle naturelle.' },
    ],
  },

  {
    id: 'inversions',
    name: 'Inversions: Not only / Hardly / Rarely',
    nameFr: 'Inversions : Not only / Hardly / Rarely',
    level: 'C1',
    blurb:
      'Front a negative or restrictive adverb and the subject jumps behind the auxiliary — a literary marker that shows up in serious writing and speeches.',
    blurbFr:
      "Place un adverbe négatif/restrictif en tête et le sujet passe après l'auxiliaire — marque littéraire qui apparaît dans l'écrit soigné et les discours.",
    rule: `When you start a clause with certain negative or restrictive adverbs, English inverts the subject and the auxiliary verb (like in a question). The meaning is the same as the unfronted version, but the rhythm punches harder.

Triggers: not only, hardly, scarcely, never, rarely, seldom, no sooner, little, only then, only after, under no circumstances, on no account.

Pattern: *Adverb + auxiliary + subject + verb*. If there's no obvious auxiliary, use a form of "do".`,
    ruleFr: `Quand tu commences une proposition par certains adverbes négatifs ou restrictifs, l'anglais inverse sujet et auxiliaire (comme dans une question). Le sens reste identique, mais le rythme frappe plus fort.

Déclencheurs : not only, hardly, scarcely, never, rarely, seldom, no sooner, little, only then, only after, under no circumstances, on no account.

Pattern : *Adverbe + auxiliaire + sujet + verbe*. S'il n'y a pas d'auxiliaire évident, on utilise une forme de "do".`,
    examples: [
      { en: 'Not only did she meet the deadline, but she also exceeded the brief.', fr: 'Non seulement elle a tenu la deadline, mais elle a aussi dépassé le brief.', note: 'Auxiliary "did" jumps before the subject.', noteFr: '"did" passe avant le sujet.' },
      { en: 'Hardly had I sat down when the alarm rang.', fr: "À peine étais-je assis que l'alarme a sonné.", note: 'Past perfect with subject inverted.', noteFr: 'Past perfect avec sujet inversé.' },
      { en: 'Under no circumstances should this email be forwarded.', fr: 'En aucun cas cet email ne doit être transféré.', note: 'Modal "should" inverts.', noteFr: 'Le modal "should" inverse.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Pick the correct inversion: "Not only ___ the deadline, but she also exceeded the brief."', promptFr: "Choisis la bonne inversion : \"Not only ___ the deadline, but she also exceeded the brief.\"", options: ['she met', 'met she', 'did she meet', 'she did meet'], answer: 2, explanation: 'After fronted "Not only", subject and auxiliary invert.', explanationFr: 'Après "Not only" en tête, sujet et auxiliaire inversent.' },
      { type: 'mcq', prompt: '"Rarely ___ such a clean prototype."', promptFr: '"Rarely ___ such a clean prototype."', options: ['I have seen', 'I see', 'have I seen', 'do I have seen'], answer: 2, explanation: 'Fronted "rarely" forces inversion: "have I seen".', explanationFr: '"Rarely" en tête force l\'inversion : "have I seen".' },
      { type: 'fill', prompt: 'No sooner ___ I closed my laptop than the next ping arrived.', promptFr: 'No sooner ___ I closed my laptop than the next ping arrived.', answer: 'had', explanation: 'Fixed pattern "No sooner had + subject + V-ed than…".', explanationFr: 'Pattern figé "No sooner had + sujet + V-ed than…".' },
      { type: 'spot-error', prompt: 'Which inversion is wrong?', promptFr: 'Quelle inversion est fausse ?', options: ['Never had I seen such a clean code review.', 'Only after the launch did we celebrate.', 'Hardly I had spoken when she interrupted.', 'Under no circumstances should you skip the QA step.'], answer: 2, explanation: 'Should be "Hardly HAD I spoken" — auxiliary before the subject.', explanationFr: 'Il faudrait "Hardly HAD I spoken" — auxiliaire avant le sujet.' },
      { type: 'mcq', prompt: 'Rewrite "I had only just opened the door when the cat ran out." with inversion.', promptFr: 'Réécris "I had only just opened the door when the cat ran out." avec inversion.', options: ['Only just had I opened the door when the cat ran out.', 'I only just had opened the door when the cat ran out.', 'Had I only just opened the door, the cat ran out.', 'No sooner I had opened the door than the cat ran out.'], answer: 0, explanation: '"Only just" can front and trigger inversion.', explanationFr: '"Only just" peut être placé en tête et déclencher l\'inversion.' },
      { type: 'fill', prompt: 'Little ___ (he / know) that the meeting had been moved.', promptFr: 'Little ___ (he / know) que la réunion avait été déplacée.', answer: 'did he know', explanation: '"Little" fronted forces auxiliary inversion: "did he know".', explanationFr: '"Little" en tête force l\'inversion : "did he know".' },
      { type: 'mcq', prompt: 'Which inversion is well-formed?', promptFr: 'Quelle inversion est bien formée ?', options: ['Seldom we have such clear feedback.', 'Seldom do we have such clear feedback.', 'Seldom have we such clear feedback.', 'Seldom we do have such clear feedback.'], answer: 1, explanation: 'No obvious auxiliary → use "do" + subject + base verb.', explanationFr: 'Pas d\'auxiliaire évident → utilise "do" + sujet + verbe à la base.' },
      { type: 'fill', prompt: 'Not until I checked the logs ___ I realise the bug.', promptFr: 'Not until I checked the logs ___ I realise the bug.', answer: 'did', explanation: 'After "Not until + clause", inversion is required: "did I realise".', explanationFr: 'Après "Not until + proposition", inversion obligatoire : "did I realise".' },
      { type: 'spot-error', prompt: 'Which sentence has a wrong inversion?', promptFr: 'Quelle phrase a une mauvaise inversion ?', options: ['Never have I felt so prepared.', 'On no account should you reply.', 'Rarely it happens twice in a row.', 'Only then did I understand.'], answer: 2, explanation: 'Should be "Rarely DOES it happen twice in a row" — inversion required.', explanationFr: 'Il faut "Rarely DOES it happen twice in a row" — inversion obligatoire.' },
      { type: 'mcq', prompt: 'Pick the natural inverted opening for a speech.', promptFr: "Choisis l'ouverture inversée naturelle pour un discours.", options: ['Never have I been more proud than tonight.', 'Never I have been more proud than tonight.', 'Never been more proud have I tonight.', 'Never am I more proud than tonight.'], answer: 0, explanation: '"Never" + present perfect → "have I been".', explanationFr: '"Never" + present perfect → "have I been".' },
    ],
  },

  {
    id: 'modals-past',
    name: 'Modals of past speculation',
    nameFr: 'Modaux de spéculation au passé',
    level: 'C1',
    blurb:
      "Must have / might have / could have / can't have — the certainty scale for talking about a past you didn't witness.",
    blurbFr:
      "Must have / might have / could have / can't have — l'échelle de certitude pour parler d'un passé que tu n'as pas vécu.",
    rule: `When speculating about something that happened in the past, English uses modal + have + V-ed. The choice of modal sets the certainty:

- **must have** — strong inference (almost certain). *He must have left already — his coat is gone.*
- **might / may / could have** — uncertain possibility. *She might have forgotten the meeting.*
- **can't / couldn't have** — strong negative inference. *He can't have been there — he was in Paris.*
- **should / ought to have** — expectation that wasn't met (regret/criticism). *You should have called me.*
- **needn't have** — past action that turned out to be unnecessary. *You needn't have brought wine — I had plenty.*`,
    ruleFr: `Quand tu spécules sur quelque chose au passé, l'anglais utilise modal + have + V-ed. Le choix du modal règle le degré de certitude :

- **must have** — déduction forte (quasi certain). *He must have left already — his coat is gone.*
- **might / may / could have** — possibilité incertaine. *She might have forgotten the meeting.*
- **can't / couldn't have** — déduction négative forte. *He can't have been there — he was in Paris.*
- **should / ought to have** — attente non comblée (regret/critique). *You should have called me.*
- **needn't have** — action passée qui s'est avérée inutile. *You needn't have brought wine — I had plenty.*`,
    examples: [
      { en: 'She must have rebooted the server — the dashboard is back.', fr: 'Elle a dû redémarrer le serveur — le dashboard est de retour.', note: 'Strong inference based on visible evidence.', noteFr: 'Déduction forte sur indice visible.' },
      { en: "He can't have known about the change — he was on PTO.", fr: 'Il ne peut pas avoir su pour le changement — il était en congé.', note: 'Strong negative certainty.', noteFr: 'Certitude négative forte.' },
      { en: 'You should have flagged this before merging.', fr: "Tu aurais dû signaler ça avant de merger.", note: 'Past expectation not met — gentle criticism.', noteFr: 'Attente passée non comblée — critique douce.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'The lights are off. He ___ already left.', promptFr: 'Les lumières sont éteintes. Il ___ déjà parti.', options: ['must have', 'should have', "can't have", 'needn\'t have'], answer: 0, explanation: 'Visible evidence → strong positive inference: "must have left".', explanationFr: 'Indice visible → déduction positive forte : "must have left".' },
      { type: 'mcq', prompt: 'She was in Tokyo last week, so she ___ been at the offsite.', promptFr: 'Elle était à Tokyo la semaine dernière, donc elle ___ été à l\'offsite.', options: ["can't have", 'must have', 'might have', 'should have'], answer: 0, explanation: 'Strong negative inference based on a fact: "can\'t have been".', explanationFr: 'Déduction négative forte sur un fait : "can\'t have been".' },
      { type: 'fill', prompt: 'You ___ have called me before deploying — this is exactly what I warned about.', promptFr: "Tu ___ avoir appelé avant de déployer — c'est exactement ce que j'avais signalé.", answer: 'should', acceptedAnswers: ['ought to'], explanation: '"Should have / ought to have" expresses past expectation that wasn\'t met.', explanationFr: '"Should have / ought to have" exprime une attente passée non comblée.' },
      { type: 'spot-error', prompt: 'Which modal use is wrong?', promptFr: 'Quel usage de modal est faux ?', options: ['He must have known — he wrote the spec.', 'She can have forgotten the meeting.', "You needn't have rushed — we still have an hour.", 'They might have taken a different route.'], answer: 1, explanation: '"She can have forgotten" doesn\'t express past possibility — use "might have / may have / could have forgotten".', explanationFr: '"She can have forgotten" n\'exprime pas la possibilité passée — utilise "might have / may have / could have forgotten".' },
      { type: 'mcq', prompt: '"You needn\'t have brought lunch" implies:', promptFr: '"You needn\'t have brought lunch" implique :', options: ["You shouldn't have brought it.", "You brought it but it wasn't necessary.", "You didn't bring it.", 'You will not bring it.'], answer: 1, explanation: '"Needn\'t have + V-ed" = the action happened, but it turned out to be unnecessary.', explanationFr: '"Needn\'t have + V-ed" = l\'action a eu lieu, mais s\'est avérée inutile.' },
      { type: 'fill', prompt: 'He didn\'t answer. He ___ (must / be) in a meeting.', promptFr: "Il n'a pas répondu. Il ___ (must / be) en réunion.", answer: 'must have been', explanation: 'Strong inference about a past state.', explanationFr: 'Déduction forte sur un état passé.' },
      { type: 'mcq', prompt: '"I can\'t find my keys. I ___ left them at the office."', promptFr: '"Je ne trouve plus mes clés. Je ___ les avoir laissées au bureau."', options: ['must have', 'should have', "couldn't have", 'needn\'t have'], answer: 0, explanation: 'Best guess based on memory → "must have left".', explanationFr: 'Meilleure hypothèse → "must have left".' },
      { type: 'fill', prompt: 'They ___ (might / take) an Uber — there was no parking.', promptFr: 'Ils ___ (might / take) un Uber — il n\'y avait pas de place.', answer: 'might have taken', acceptedAnswers: ['may have taken', 'could have taken'], explanation: 'Uncertain possibility → "might/may/could have taken".', explanationFr: 'Possibilité incertaine → "might/may/could have taken".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['She might have missed the train.', "He can't have done it alone.", 'I should called you yesterday.', 'They must have been tired.'], answer: 2, explanation: 'Past with should: "should HAVE called", not "should called".', explanationFr: 'Passé avec should : "should HAVE called", pas "should called".' },
      { type: 'mcq', prompt: 'Pick the most natural sentence.', promptFr: 'Choisis la phrase la plus naturelle.', options: ['I needn\'t have worry.', "I needn't have worried.", 'I needn\'t worried.', 'I don\'t need have worried.'], answer: 1, explanation: '"Needn\'t have + V-ed (past participle)".', explanationFr: '"Needn\'t have + V-ed (participe passé)".' },
    ],
  },

  {
    id: 'cleft-sentences',
    name: 'Cleft sentences for emphasis',
    nameFr: "Phrases clivées pour l'emphase",
    level: 'C2',
    blurb:
      'It-clefts and what-clefts: split your sentence to spotlight the part that matters.',
    blurbFr:
      'Clivées en "It..." et clivées en "What..." : éclate ta phrase pour mettre en avant ce qui compte.',
    rule: `Cleft sentences let you front-load the emphasis without changing meaning. Two main shapes:

**It-cleft**: *It is/was X that/who…* — emphasizes a single noun phrase.
*Sarah called the client.* → *It was Sarah who called the client.* (not Mike)
*The PM made the call.* → *It was the PM that made the call.* (not the designer)

**What-cleft (pseudo-cleft)**: *What I/you… is/was Y* — emphasizes the action or the thing acted on.
*I really need a vacation.* → *What I really need is a vacation.*
*I love how she handles pressure.* → *What I love is how she handles pressure.*

Native English uses these constantly to handle nuance and contrast — they're not literary, they're conversational.`,
    ruleFr: `Les phrases clivées permettent de mettre en avant l'élément important sans changer le sens. Deux formes principales :

**It-cleft** : *It is/was X that/who…* — met en avant un groupe nominal.
*Sarah called the client.* → *It was Sarah who called the client.* (pas Mike)
*The PM made the call.* → *It was the PM that made the call.* (pas le designer)

**What-cleft (pseudo-clivée)** : *What I/you… is/was Y* — met en avant l'action ou l'objet.
*I really need a vacation.* → *What I really need is a vacation.*
*I love how she handles pressure.* → *What I love is how she handles pressure.*

L'anglais natif utilise ces structures constamment pour gérer la nuance et le contraste — ce n'est pas littéraire, c'est conversationnel.`,
    examples: [
      { en: 'It was the timing, not the price, that killed the deal.', fr: "C'est le timing, pas le prix, qui a tué le deal.", note: 'It-cleft, contrasts timing vs price.', noteFr: 'It-cleft, oppose timing vs prix.' },
      { en: 'What surprised me was how calmly she handled it.', fr: "Ce qui m'a surpris, c'est le calme avec lequel elle l'a géré.", note: 'What-cleft fronts the surprise.', noteFr: 'What-cleft met en avant la surprise.' },
      { en: 'It was on Tuesday that we got the green light.', fr: "C'est mardi qu'on a eu le feu vert.", note: 'It-cleft on a time expression.', noteFr: 'It-cleft sur une expression temporelle.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Most natural cleft for "I really need feedback, not just praise":', promptFr: 'Clivée la plus naturelle pour "I really need feedback, not just praise" :', options: ['It is feedback what I really need, not just praise.', 'What I really need is feedback, not just praise.', 'It is what I really need feedback, not just praise.', 'Feedback that I really need is, not just praise.'], answer: 1, explanation: '"What + clause + is + Y" — what-cleft fronts the thing the speaker actually wants.', explanationFr: '"What + proposition + is + Y" — la pseudo-clivée met en avant ce que recherche le locuteur.' },
      { type: 'mcq', prompt: 'Pick the well-formed it-cleft.', promptFr: 'Choisis la it-cleft bien formée.', options: ['It was him that broke the build.', 'It was he who broke the build.', 'It was who broke the build him.', 'That was him broke the build.'], answer: 1, explanation: 'Subject pronoun "he" + "who" for people. "It was him that…" is informal but accepted in spoken English.', explanationFr: 'Pronom sujet "he" + "who" pour les personnes. "It was him that…" est informel mais accepté à l\'oral.' },
      { type: 'fill', prompt: '___ matters most is consistency, not cleverness.', promptFr: '___ compte le plus, c\'est la régularité, pas la brillance.', answer: 'What', acceptedAnswers: ['what'], explanation: 'Pseudo-cleft starting with "What…" fronts the abstract idea.', explanationFr: 'Pseudo-clivée commençant par "What…" met en avant l\'idée abstraite.' },
      { type: 'spot-error', prompt: 'Which cleft sounds off?', promptFr: 'Quelle clivée sonne fausse ?', options: ['What you need is more sleep.', 'It was on Friday that we shipped.', 'It is consistency what matters most.', 'What I admire is her patience.'], answer: 2, explanation: '"It is consistency THAT matters most." Use "that" or "which" — not "what" — in an it-cleft.', explanationFr: '"It is consistency THAT matters most." Utilise "that" ou "which" — pas "what" — dans une it-cleft.' },
      { type: 'mcq', prompt: 'Best emphasis for "Sarah, not the manager, approved it":', promptFr: 'Meilleure emphase pour "Sarah, pas le manager, a validé" :', options: ['Sarah was who approved it, not the manager.', 'It was Sarah who approved it, not the manager.', 'What approved it was Sarah, not the manager.', 'The one Sarah approved was it, not the manager.'], answer: 1, explanation: 'It-cleft with "who" for people — clean, idiomatic, contrastive.', explanationFr: 'It-cleft avec "who" pour les personnes — propre, idiomatique, contrastif.' },
      { type: 'fill', prompt: 'It was last Tuesday ___ the launch happened, not Wednesday.', promptFr: "C'est mardi dernier ___ le lancement a eu lieu, pas mercredi.", answer: 'that', acceptedAnswers: ['when'], explanation: 'It-cleft on time → "that" or "when".', explanationFr: 'It-cleft sur le temps → "that" ou "when".' },
      { type: 'mcq', prompt: 'Pick the natural what-cleft.', promptFr: 'Choisis la what-cleft naturelle.', options: ['What I want is more responsibility.', 'What is I want more responsibility.', "It's what I want is more responsibility.", "More responsibility is what I want."], answer: 0, explanation: '"What + clause + is + Y" is the canonical pattern.', explanationFr: '"What + proposition + is + Y" est le pattern canonique.' },
      { type: 'fill', prompt: '___ was the support from the team that made the difference.', promptFr: '___ c\'est le soutien de l\'équipe qui a fait la différence.', answer: 'It', acceptedAnswers: ['it'], explanation: '"It was X that…" → it-cleft.', explanationFr: '"It was X that…" → it-cleft.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['What I love about her is her honesty.', "It's the manager who approved the request.", 'What is she did surprised everyone.', 'It was at the conference that we met.'], answer: 2, explanation: 'Should be "What she did surprised everyone" — no extra "is".', explanationFr: 'Il faudrait "What she did surprised everyone" — pas de "is" en trop.' },
      { type: 'mcq', prompt: 'Convert "I admire her patience most" to a what-cleft.', promptFr: 'Convertis "I admire her patience most" en what-cleft.', options: ['What I admire most is her patience.', 'It is her patience that I admire most.', 'What is I admire most her patience.', 'Both 1 and 2 work as clefts (1 is what-cleft, 2 is it-cleft).'], answer: 3, explanation: 'Both clefts work; (1) is the what-cleft, (2) is the it-cleft.', explanationFr: 'Les deux clivées marchent ; (1) est la what-cleft, (2) est la it-cleft.' },
    ],
  },

  {
    id: 'reduced-relatives',
    name: 'Reduced relative clauses',
    nameFr: 'Propositions relatives réduites',
    level: 'C1',
    blurb:
      'Drop "who is / which was" to tighten your prose without losing meaning. The C1/C2 mark of native fluency.',
    blurbFr:
      "Supprime \"who is / which was\" pour resserrer ta prose sans perdre le sens. La marque C1/C2 de la fluidité native.",
    rule: `When a relative clause uses a form of "be" + adjective / participle / preposition phrase, you can usually drop "who/which + be" to get a cleaner sentence.

*The candidates who are interviewing today…* → *The candidates interviewing today…*
*The proposal which was sent yesterday…* → *The proposal sent yesterday…*
*The team which is in charge of QA…* → *The team in charge of QA…*

You CANNOT reduce when the verb isn't a form of "be" alone — you'd lose the verb's meaning.

*The team that runs the daily standup…* — keep "that runs", you can't drop it.

Native English uses reduced relatives constantly. Adding the "who is / which was" sounds slightly stiff in many cases.`,
    ruleFr: `Quand une proposition relative utilise une forme de "be" + adjectif / participe / groupe prépositionnel, tu peux généralement supprimer "who/which + be" pour resserrer la phrase.

*The candidates who are interviewing today…* → *The candidates interviewing today…*
*The proposal which was sent yesterday…* → *The proposal sent yesterday…*
*The team which is in charge of QA…* → *The team in charge of QA…*

Tu ne PEUX PAS réduire quand le verbe n'est pas une forme de "be" seul — tu perdrais le sens du verbe.

*The team that runs the daily standup…* — garde "that runs", on ne peut pas le supprimer.

L'anglais natif utilise les relatives réduites en permanence. Mettre "who is / which was" sonne légèrement guindé dans bien des cas.`,
    examples: [
      { en: 'The designer hired last quarter is already shipping.', fr: "Le designer embauché le trimestre dernier livre déjà.", note: '"who was hired" → "hired".', noteFr: '"who was hired" → "hired".' },
      { en: 'The features being tested this week look promising.', fr: "Les fonctionnalités testées cette semaine sont prometteuses.", note: '"that are being tested" → "being tested".', noteFr: '"that are being tested" → "being tested".' },
      { en: 'Anyone interested in joining the offsite, raise your hand.', fr: "Toute personne intéressée par l'offsite, levez la main.", note: '"who is interested" → "interested".', noteFr: '"who is interested" → "interested".' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Reduce: "The report which was written by the intern was excellent."', promptFr: 'Réduis : "The report which was written by the intern was excellent."', options: ['The report writing by the intern was excellent.', 'The report written by the intern was excellent.', 'The report which writing by the intern was excellent.', 'The report writes by the intern was excellent.'], answer: 1, explanation: 'Drop "which was", keep the past participle: "written by the intern".', explanationFr: 'Supprime "which was", garde le participe passé : "written by the intern".' },
      { type: 'fill', prompt: 'Anyone ___ in the prototype can find the link in the Slack pin.', promptFr: 'Toute personne ___ par le prototype peut trouver le lien dans le Slack pin.', answer: 'interested', explanation: '"Anyone who is interested" reduces to "anyone interested". Past participle stays.', explanationFr: '"Anyone who is interested" se réduit à "anyone interested". Le participe passé reste.' },
      { type: 'spot-error', prompt: 'Which reduction is wrong?', promptFr: 'Quelle réduction est fausse ?', options: ['The team handling QA is on holiday.', 'The candidates interviewing today are remote.', 'The proposal we sending yesterday came back signed.', 'The library used by most engineers is open source.'], answer: 2, explanation: '"We sending" isn\'t reducible — original is "we sent" (active simple past). Keep: "The proposal we sent yesterday came back signed."', explanationFr: '"We sending" n\'est pas réductible — l\'original est "we sent" (prétérit actif). Garde : "The proposal we sent yesterday came back signed."' },
      { type: 'mcq', prompt: 'Which sentence is correctly NOT reducible?', promptFr: 'Quelle phrase est correctement NON réductible ?', options: ['The engineer who runs the standup is on vacation.', 'The deck which was sent on Monday looks great.', 'The slides which are being reviewed need updates.', 'The colleague who is in charge of releases just left.'], answer: 0, explanation: '"Who runs" is an active verb (no "be" + participle), so we cannot reduce it.', explanationFr: '"Who runs" est un verbe actif (pas de "be" + participe), donc non réductible.' },
      { type: 'fill', prompt: 'The fix ___ in the last sprint solved the bug.', promptFr: 'Le correctif ___ au dernier sprint a résolu le bug.', answer: 'shipped', acceptedAnswers: ['delivered', 'released'], explanation: '"that was shipped/delivered/released in the last sprint" reduces to a past participle alone.', explanationFr: '"that was shipped/delivered/released in the last sprint" se réduit à un participe passé seul.' },
      { type: 'mcq', prompt: 'Reduce: "The students who are sitting in the front row".', promptFr: 'Réduis : "The students who are sitting in the front row".', options: ['The students sitting in the front row.', 'The students sit in the front row.', 'The students which sitting in the front row.', 'The students sat in the front row.'], answer: 0, explanation: 'Drop "who are", keep the present participle: "sitting".', explanationFr: 'Supprime "who are", garde le participe présent : "sitting".' },
      { type: 'fill', prompt: 'Most of the answers ___ (give) by the panel were vague.', promptFr: 'La plupart des réponses ___ (give) par le panel étaient vagues.', answer: 'given', explanation: 'Reduced from "that were given" → just past participle "given".', explanationFr: 'Réduit de "that were given" → seul le participe passé "given".' },
      { type: 'spot-error', prompt: 'Which reduction breaks the meaning?', promptFr: 'Quelle réduction casse le sens ?', options: ['The book written by Camus is on the shelf.', 'The book Camus wrote is on the shelf.', 'The book write by Camus is on the shelf.', 'The book that Camus wrote is on the shelf.'], answer: 2, explanation: '"Write" (base form) is not a valid reduction — needs "written" (past participle).', explanationFr: '"Write" (base) n\'est pas une réduction valide — il faut "written" (participe passé).' },
      { type: 'mcq', prompt: 'Pick the natural reduction.', promptFr: 'Choisis la réduction naturelle.', options: ['The man standing by the window is my dad.', 'The man stand by the window is my dad.', 'The man who stands by the window is my dad.', 'Both 1 and 3 are correct, 1 is more natural.'], answer: 3, explanation: 'Both work but "standing" (reduced) sounds more natural in casual speech.', explanationFr: 'Les deux marchent mais "standing" (réduit) sonne plus naturel à l\'oral.' },
      { type: 'fill', prompt: 'The package ___ (deliver) this morning was the wrong one.', promptFr: 'Le colis ___ (deliver) ce matin n\'était pas le bon.', answer: 'delivered', explanation: 'Reduced from "that was delivered" → past participle alone.', explanationFr: 'Réduit de "that was delivered" → participe passé seul.' },
    ],
  },

  /* ============================== A2 — prepositions ============================== */
  {
    id: 'prepositions-time',
    name: 'Prepositions of time: at, in, on',
    nameFr: 'Prépositions de temps : at, in, on',
    level: 'A2',
    blurb:
      'Three tiny words that French collapses into one ("à"). The rules are simple once you see them.',
    blurbFr:
      'Trois petits mots que le français rassemble en un seul ("à"). Les règles deviennent simples une fois vues.',
    rule: `**at** — for clock times and short specific moments. *at 6pm, at noon, at midnight, at lunch, at the weekend (UK).*

**on** — for days and dates. *on Monday, on July 4th, on Christmas Day, on my birthday.*

**in** — for longer periods (months, years, seasons, parts of the day). *in May, in 2024, in summer, in the morning, in the 1990s.*

Easy way to remember: **at** = clock, **on** = day, **in** = bigger box.

Special: at night (not "in the night"), at the weekend (UK) / on the weekend (US).`,
    ruleFr: `**at** — pour les heures précises et les moments courts. *at 6pm, at noon, at midnight, at lunch, at the weekend (UK).*

**on** — pour les jours et les dates. *on Monday, on July 4th, on Christmas Day, on my birthday.*

**in** — pour les périodes plus longues (mois, années, saisons, parties de la journée). *in May, in 2024, in summer, in the morning, in the 1990s.*

Astuce mnémo : **at** = horloge, **on** = jour, **in** = plus grosse boîte.

Particulier : at night (pas "in the night"), at the weekend (UK) / on the weekend (US).`,
    examples: [
      { en: "Let's meet at 3pm tomorrow.", fr: 'Voyons-nous demain à 15h.', note: 'Clock time → "at".', noteFr: 'Heure précise → "at".' },
      { en: 'My birthday is on March 12th.', fr: 'Mon anniversaire est le 12 mars.', note: 'Specific date → "on".', noteFr: 'Date précise → "on".' },
      { en: 'I started this job in January.', fr: "J'ai commencé ce job en janvier.", note: 'Month → "in".', noteFr: 'Mois → "in".' },
      { en: 'She works best in the morning.', fr: 'Elle bosse mieux le matin.', note: 'Part of the day → "in".', noteFr: 'Partie de la journée → "in".' },
    ],
    drills: [
      { type: 'fill', prompt: 'The conference is ___ September.', promptFr: 'La conférence est ___ septembre.', answer: 'in', explanation: 'Months → "in".', explanationFr: 'Les mois → "in".' },
      { type: 'fill', prompt: "Let's grab coffee ___ 10am.", promptFr: 'On prend un café ___ 10h.', answer: 'at', explanation: 'Clock time → "at".', explanationFr: 'Heure précise → "at".' },
      { type: 'fill', prompt: 'My flight leaves ___ Friday morning.', promptFr: 'Mon vol part ___ vendredi matin.', answer: 'on', explanation: 'Day → "on" (even with "morning" attached).', explanationFr: 'Jour → "on" (même avec "morning" accolé).' },
      { type: 'mcq', prompt: 'Pick the correct preposition: "I love sledging ___ winter."', promptFr: 'Choisis la bonne préposition : "I love sledging ___ winter."', options: ['at', 'on', 'in', 'by'], answer: 2, explanation: 'Seasons → "in".', explanationFr: 'Saisons → "in".' },
      { type: 'fill', prompt: 'I can\'t sleep ___ night.', promptFr: 'Je ne dors pas ___ nuit.', answer: 'at', explanation: '"At night" is fixed — never "in the night".', explanationFr: '"At night" est figé — jamais "in the night".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I was born in 1990.', 'See you in Monday.', 'The store closes at 9pm.', 'We met on July 14th.'], answer: 1, explanation: 'Days → "on Monday", not "in Monday".', explanationFr: 'Jours → "on Monday", pas "in Monday".' },
      { type: 'fill', prompt: 'I\'ll see you ___ the weekend.', promptFr: 'On se voit ___ week-end.', answer: 'at', acceptedAnswers: ['on'], explanation: 'UK English: "at the weekend". US English: "on the weekend". Both accepted.', explanationFr: 'Anglais UK : "at the weekend". US : "on the weekend". Les deux acceptés.' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ['She was born at March.', 'She was born in March.', 'She was born on March.', 'She was born by March.'], answer: 1, explanation: 'Months → "in".', explanationFr: 'Mois → "in".' },
      { type: 'fill', prompt: 'My grandfather grew up ___ the 1960s.', promptFr: 'Mon grand-père a grandi ___ années 60.', answer: 'in', explanation: 'Decades → "in".', explanationFr: 'Décennies → "in".' },
      { type: 'fill', prompt: 'Christmas is ___ December 25th.', promptFr: 'Noël tombe ___ 25 décembre.', answer: 'on', explanation: 'Specific date → "on".', explanationFr: 'Date précise → "on".' },
    ],
  },

  /* ============================== B1 — phrasal verbs ============================== */
  {
    id: 'phrasal-verbs-basics',
    name: 'Phrasal verbs: the essentials',
    nameFr: 'Phrasal verbs : les essentiels',
    level: 'B1',
    blurb:
      "Verb + particle combos that mean something different from the parts. The hallmark of natural English.",
    blurbFr:
      "Verbe + particule qui ensemble signifient autre chose que la somme des deux. Le marqueur d'un anglais naturel.",
    rule: `A **phrasal verb** is a verb plus a small word (particle) like up, down, on, off, out, in, away. The combination often has a meaning you can't guess from the parts.

Examples that catch French speakers:
- *get up* (= leave bed) ≠ *get* + *up*
- *find out* (= discover)
- *give up* (= surrender)
- *look forward to* (= anticipate happily)
- *put off* (= postpone)
- *bring up* (= mention or raise a child)
- *figure out* (= understand)

**Separable vs inseparable**: many phrasal verbs let the object slide between the verb and particle. *Turn the light off* = *turn off the light*. With a pronoun, separation is REQUIRED: *turn it off*, NEVER *turn off it*.

Some phrasal verbs are inseparable: *look after* (= take care of), *get over* (= recover from), *run into* (= meet by chance) — the object always comes after the particle.`,
    ruleFr: `Un **phrasal verb** est un verbe + une petite particule (up, down, on, off, out, in, away). Le combo a souvent un sens qu'on ne peut pas deviner.

Exemples qui piègent les francophones :
- *get up* (= se lever du lit) ≠ *get* + *up*
- *find out* (= découvrir)
- *give up* (= abandonner)
- *look forward to* (= attendre avec impatience)
- *put off* (= reporter)
- *bring up* (= mentionner ou élever un enfant)
- *figure out* (= comprendre)

**Séparables vs inséparables** : beaucoup de phrasal verbs autorisent l'objet à se glisser entre le verbe et la particule. *Turn the light off* = *turn off the light*. Avec un pronom, la séparation est OBLIGATOIRE : *turn it off*, JAMAIS *turn off it*.

Certains sont inséparables : *look after* (= s'occuper de), *get over* (= se remettre de), *run into* (= croiser par hasard) — l'objet vient toujours après la particule.`,
    examples: [
      { en: 'I gave up trying to fix the bug at 2am.', fr: "J'ai abandonné l'idée de corriger le bug à 2h du mat.", note: '"give up" = surrender.', noteFr: '"give up" = abandonner.' },
      { en: 'Could you turn it off, please?', fr: 'Tu peux l\'éteindre s\'il te plaît ?', note: 'Pronoun → MUST separate: "turn it off".', noteFr: 'Pronom → séparation OBLIGATOIRE : "turn it off".' },
      { en: 'I ran into Sarah at the airport.', fr: 'J\'ai croisé Sarah à l\'aéroport.', note: '"run into" = meet by chance, inseparable.', noteFr: '"run into" = croiser par hasard, inséparable.' },
      { en: "Let's put off the meeting until Friday.", fr: 'Reportons la réunion à vendredi.', note: '"put off" = postpone.', noteFr: '"put off" = reporter.' },
    ],
    drills: [
      { type: 'fill', prompt: 'I can\'t ___ out the password — it\'s on the tip of my tongue.', promptFr: "Je n'arrive pas à ___ out le mot de passe — je l'ai sur le bout de la langue.", answer: 'figure', explanation: '"Figure out" = work out, understand.', explanationFr: '"Figure out" = comprendre, deviner.' },
      { type: 'mcq', prompt: 'Which sentence is correct?', promptFr: 'Quelle phrase est correcte ?', options: ['Please turn off it.', 'Please turn it off.', 'Please it turn off.', 'Please off it turn.'], answer: 1, explanation: 'Pronouns force separation: "turn it off", never "turn off it".', explanationFr: 'Les pronoms forcent la séparation : "turn it off", jamais "turn off it".' },
      { type: 'fill', prompt: 'She ___ up smoking last year.', promptFr: 'Elle ___ up de fumer l\'an dernier.', answer: 'gave', explanation: '"Gave up" = surrendered, stopped.', explanationFr: '"Gave up" = abandonné, arrêté.' },
      { type: 'fill', prompt: 'I usually ___ up at 7am on weekdays.', promptFr: 'Je me ___ up généralement à 7h en semaine.', answer: 'get', explanation: '"Get up" = leave bed.', explanationFr: '"Get up" = sortir du lit.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I look after my niece every Sunday.', 'I look my niece after every Sunday.', "I'm looking forward to seeing you.", "Let's bring up this point in the meeting."], answer: 1, explanation: '"Look after" is inseparable — object can\'t come between.', explanationFr: '"Look after" est inséparable — l\'objet ne peut pas s\'intercaler.' },
      { type: 'fill', prompt: 'We had to ___ off the launch because of the bug.', promptFr: 'On a dû ___ off le lancement à cause du bug.', answer: 'put', explanation: '"Put off" = postpone.', explanationFr: '"Put off" = reporter.' },
      { type: 'mcq', prompt: 'What does "find out" mean?', promptFr: 'Que signifie "find out" ?', options: ['to lose', 'to discover', 'to give up', 'to look outside'], answer: 1, explanation: '"Find out" = discover, learn.', explanationFr: '"Find out" = découvrir, apprendre.' },
      { type: 'fill', prompt: "I ___ into my old colleague at the airport last week.", promptFr: "J'___ into mon ex-collègue à l'aéroport la semaine dernière.", answer: 'ran', explanation: '"Ran into" = met by chance.', explanationFr: '"Ran into" = croisé par hasard.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I look forward seeing you.', 'I look forward to see you.', 'I look forward to seeing you.', 'I look forward at seeing you.'], answer: 2, explanation: '"Look forward TO + gerund" — fixed pattern.', explanationFr: '"Look forward TO + gérondif" — pattern figé.' },
      { type: 'fill', prompt: "Don't ___ up — keep practicing!", promptFr: 'N\'___ up pas — continue de t\'entraîner !', answer: 'give', explanation: '"Give up" = surrender. Imperative negative.', explanationFr: '"Give up" = abandonner. Impératif négatif.' },
    ],
  },

  /* ============================== B1 — question tags ============================== */
  {
    id: 'question-tags',
    name: 'Question tags',
    nameFr: 'Question tags',
    level: 'B1',
    blurb:
      'The little "isn\'t it?" / "didn\'t you?" tagged onto a statement. French has just "n\'est-ce pas?" — English has dozens.',
    blurbFr:
      'Le petit "isn\'t it ?" / "didn\'t you ?" collé à une affirmation. Le français a juste "n\'est-ce pas ?" — l\'anglais en a des dizaines.',
    rule: `A **question tag** is a mini-question added to the end of a statement to confirm it: *You're coming, aren't you? / She didn't call, did she?*

Rule of polarity: positive statement → negative tag, negative statement → positive tag.
- *You like coffee, don't you?* (+ then −)
- *You don't like coffee, do you?* (− then +)

The tag uses the same auxiliary as the statement. If there's no auxiliary, use "do/does/did".
- *You can swim, can't you?*
- *She has finished, hasn't she?*
- *They went home, didn't they?*

Special cases:
- *I am late, aren't I?* (not "amn't I")
- *Let's go, shall we?*
- *Open the door, will you / can you?* (after imperative)`,
    ruleFr: `Un **question tag** est une mini-question ajoutée à la fin d'une affirmation pour la confirmer : *You're coming, aren't you? / She didn't call, did she?*

Règle de polarité : affirmatif → tag négatif, négatif → tag affirmatif.
- *You like coffee, don't you?* (+ puis −)
- *You don't like coffee, do you?* (− puis +)

Le tag utilise le même auxiliaire que la phrase. S'il n'y en a pas, on utilise "do/does/did".
- *You can swim, can't you?*
- *She has finished, hasn't she?*
- *They went home, didn't they?*

Cas particuliers :
- *I am late, aren't I?* (pas "amn't I")
- *Let's go, shall we?*
- *Open the door, will you / can you?* (après un impératif)`,
    examples: [
      { en: "You're a designer, aren't you?", fr: 'Tu es designer, non ?', note: 'Positive statement → negative tag.', noteFr: 'Affirmatif → tag négatif.' },
      { en: "She doesn't speak Spanish, does she?", fr: 'Elle ne parle pas espagnol, si ?', note: 'Negative statement → positive tag.', noteFr: 'Négatif → tag affirmatif.' },
      { en: "We're late, aren't we?", fr: "On est en retard, n'est-ce pas ?", note: 'No "amn\'t" — use "aren\'t".', noteFr: 'Pas "amn\'t" — on utilise "aren\'t".' },
      { en: "Let's order pizza, shall we?", fr: 'Commandons une pizza, ok ?', note: '"Let\'s" + "shall we" is fixed.', noteFr: '"Let\'s" + "shall we" est figé.' },
    ],
    drills: [
      { type: 'fill', prompt: "You're coming to the offsite, ___?", promptFr: "Tu viens à l'offsite, ___ ?", answer: "aren't you", explanation: 'Positive statement with "are" → negative tag "aren\'t you".', explanationFr: 'Affirmation avec "are" → tag négatif "aren\'t you".' },
      { type: 'fill', prompt: "She doesn't like the new design, ___?", promptFr: "Elle n'aime pas le nouveau design, ___ ?", answer: 'does she', explanation: 'Negative statement → positive tag "does she".', explanationFr: 'Négation → tag affirmatif "does she".' },
      { type: 'mcq', prompt: 'Pick the correct tag: "He has finished the report, ___?"', promptFr: 'Choisis le bon tag : "He has finished the report, ___?"', options: ["didn't he", "isn't he", "hasn't he", "doesn't he"], answer: 2, explanation: 'Statement uses "has" → tag uses "hasn\'t".', explanationFr: 'La phrase utilise "has" → tag avec "hasn\'t".' },
      { type: 'fill', prompt: "I am late, ___?", promptFr: 'Je suis en retard, ___ ?', answer: "aren't I", explanation: 'Special case: with "I am", the tag is "aren\'t I" (not "amn\'t I").', explanationFr: 'Cas particulier : avec "I am", le tag est "aren\'t I" (pas "amn\'t I").' },
      { type: 'fill', prompt: "They went to the party, ___?", promptFr: 'Ils sont allés à la fête, ___ ?', answer: "didn't they", explanation: 'No auxiliary in past simple → "did/didn\'t" in tag.', explanationFr: 'Pas d\'auxiliaire au prétérit → "did/didn\'t" dans le tag.' },
      { type: 'spot-error', prompt: 'Which question tag is wrong?', promptFr: 'Quel question tag est faux ?', options: ["You can drive, can't you?", "She has left, hasn't she?", "They like jazz, don't they like?", "He won't be late, will he?"], answer: 2, explanation: 'Tag should be just "don\'t they" — not "don\'t they like".', explanationFr: 'Le tag est juste "don\'t they" — pas "don\'t they like".' },
      { type: 'fill', prompt: "Let's grab a drink, ___?", promptFr: 'Prenons un verre, ___ ?', answer: 'shall we', explanation: '"Let\'s" + "shall we" — fixed pattern.', explanationFr: '"Let\'s" + "shall we" — pattern figé.' },
      { type: 'mcq', prompt: 'Pick the correct tag for: "You won\'t tell anyone, ___?"', promptFr: 'Choisis le bon tag pour : "You won\'t tell anyone, ___?"', options: ["won't you", 'will you', 'do you', "don't you"], answer: 1, explanation: 'Negative "won\'t" → positive tag "will you".', explanationFr: 'Négatif "won\'t" → tag affirmatif "will you".' },
      { type: 'fill', prompt: "She'll be there, ___?", promptFr: 'Elle sera là, ___ ?', answer: "won't she", explanation: '"Will" + positive → negative tag "won\'t she".', explanationFr: '"Will" + affirmatif → tag négatif "won\'t she".' },
      { type: 'fill', prompt: "We've met before, ___?", promptFr: "On s'est déjà vus, ___ ?", answer: "haven't we", explanation: 'Statement uses "have" → tag "haven\'t we".', explanationFr: 'Phrase avec "have" → tag "haven\'t we".' },
    ],
  },

  /* ============================== B2 — passive voice ============================== */
  {
    id: 'passive-voice',
    name: 'Passive voice',
    nameFr: 'Voix passive',
    level: 'B2',
    blurb:
      'Shift the focus from who does the action to what receives it. The B2 marker that French uses much less often.',
    blurbFr:
      "Déplace le focus de l'agent vers le receveur de l'action. Marqueur B2 que le français utilise bien moins souvent.",
    rule: `Form: **subject + form of "be" + past participle**. The "by + agent" is optional and often dropped when irrelevant or unknown.

- Active: *The team shipped the feature.* → Passive: *The feature was shipped (by the team).*
- Active: *They will release the report on Monday.* → Passive: *The report will be released on Monday.*

Use the passive when:
- The agent is unknown or irrelevant: *My laptop was stolen.*
- The receiver is more important than the doer: *The bug was fixed.*
- You want to be impersonal/formal: *Visitors are kindly asked to wear a badge.*

The passive works in any tense — just change "be":
- present simple: *is/are V-ed*
- past simple: *was/were V-ed*
- present perfect: *has/have been V-ed*
- future: *will be V-ed*

French uses the passive much less than English — French often prefers "on" instead. *On a fini le rapport* is more natural than *Le rapport a été fini.*`,
    ruleFr: `Forme : **sujet + forme de "be" + participe passé**. Le "by + agent" est optionnel et souvent omis quand sans intérêt ou inconnu.

- Actif : *The team shipped the feature.* → Passif : *The feature was shipped (by the team).*
- Actif : *They will release the report on Monday.* → Passif : *The report will be released on Monday.*

On utilise le passif quand :
- L'agent est inconnu ou peu important : *My laptop was stolen.*
- Le receveur compte plus que l'agent : *The bug was fixed.*
- On veut un ton impersonnel/formel : *Visitors are kindly asked to wear a badge.*

Le passif fonctionne à tous les temps — on change juste "be" :
- présent simple : *is/are V-ed*
- prétérit : *was/were V-ed*
- present perfect : *has/have been V-ed*
- futur : *will be V-ed*

Le français utilise le passif bien moins souvent que l'anglais — le français préfère "on". *On a fini le rapport* est plus naturel que *Le rapport a été fini.*`,
    examples: [
      { en: 'The deck was reviewed by the CEO yesterday.', fr: 'Le deck a été revu par le CEO hier.', note: 'Past simple passive: "was + V-ed".', noteFr: 'Prétérit passif : "was + V-ed".' },
      { en: 'My passport has been stolen.', fr: 'Mon passeport a été volé.', note: 'Present perfect passive: "has been + V-ed". Agent unknown.', noteFr: 'Present perfect passif : "has been + V-ed". Agent inconnu.' },
      { en: 'New features will be released next quarter.', fr: 'De nouvelles fonctionnalités seront lancées le trimestre prochain.', note: 'Future passive: "will be + V-ed".', noteFr: 'Futur passif : "will be + V-ed".' },
    ],
    drills: [
      { type: 'fill', prompt: 'The bug ___ (fix) by the engineering team yesterday.', promptFr: 'Le bug ___ (fix) par l\'équipe engineering hier.', answer: 'was fixed', explanation: 'Past simple passive: "was + past participle".', explanationFr: 'Prétérit passif : "was + participe passé".' },
      { type: 'fill', prompt: 'The new policy ___ (announce) next week.', promptFr: 'La nouvelle politique ___ (announce) la semaine prochaine.', answer: 'will be announced', explanation: 'Future passive: "will be + past participle".', explanationFr: 'Futur passif : "will be + participe passé".' },
      { type: 'mcq', prompt: 'Convert to passive: "Someone took my coffee."', promptFr: 'Convertis au passif : "Someone took my coffee."', options: ['My coffee took.', 'My coffee was taken.', 'My coffee has taken.', 'Someone was taken my coffee.'], answer: 1, explanation: 'Past simple passive: "was + taken".', explanationFr: 'Prétérit passif : "was + taken".' },
      { type: 'fill', prompt: 'This building ___ (build) in 1920.', promptFr: 'Cet immeuble ___ (build) en 1920.', answer: 'was built', explanation: 'Past simple passive of "build" → "was built".', explanationFr: 'Prétérit passif de "build" → "was built".' },
      { type: 'spot-error', prompt: 'Which passive sentence is wrong?', promptFr: 'Quelle phrase passive est fausse ?', options: ['The report has been finished.', 'The film is being watched.', 'My phone is stolen yesterday.', 'Several languages are spoken here.'], answer: 2, explanation: 'Past event needs past tense: "My phone WAS stolen yesterday".', explanationFr: 'Événement passé → passé : "My phone WAS stolen yesterday".' },
      { type: 'fill', prompt: 'English ___ (speak) all over the world.', promptFr: "L'anglais ___ (speak) partout dans le monde.", answer: 'is spoken', explanation: 'Present simple passive: "is + spoken".', explanationFr: 'Présent simple passif : "is + spoken".' },
      { type: 'mcq', prompt: 'Most natural passive: "The deck has just been reviewed".', promptFr: 'Passif le plus naturel : "The deck has just been reviewed".', options: ['Active: "Someone has just reviewed the deck".', 'Active: "Someone just reviewed the deck".', 'Both 1 and 2 are valid actives, 1 matches the tense.', 'Active: "Someone is reviewing the deck".'], answer: 2, explanation: 'Present perfect passive ↔ present perfect active.', explanationFr: 'Present perfect passif ↔ present perfect actif.' },
      { type: 'fill', prompt: 'The package ___ (deliver) tomorrow.', promptFr: 'Le colis ___ (deliver) demain.', answer: 'will be delivered', explanation: 'Future passive: "will be + delivered".', explanationFr: 'Futur passif : "will be + delivered".' },
      { type: 'fill', prompt: 'Visitors ___ (require) to sign in at reception.', promptFr: "Les visiteurs ___ (require) de signer à l'accueil.", answer: 'are required', explanation: 'Present simple passive, plural subject.', explanationFr: 'Présent simple passif, sujet pluriel.' },
      { type: 'spot-error', prompt: 'Which sentence has the passive misformed?', promptFr: 'Dans quelle phrase le passif est mal formé ?', options: ['The book was wrote by Dickens.', 'The book was written by Dickens.', 'The bug has been fixed.', 'The launch will be delayed.'], answer: 0, explanation: 'Past participle of "write" is "written", not "wrote".', explanationFr: 'Participe passé de "write" est "written", pas "wrote".' },
    ],
  },

  /* ============================== B2 — gerund vs infinitive ============================== */
  {
    id: 'gerund-vs-infinitive',
    name: 'Gerund vs infinitive after verbs',
    nameFr: 'Gérondif vs infinitif après les verbes',
    level: 'B2',
    blurb:
      "Some verbs take +ing, others take to+verb, a few take both with different meanings. The list French speakers must memorise.",
    blurbFr:
      "Certains verbes prennent +ing, d'autres to+verbe, quelques-uns les deux avec des sens différents. La liste à mémoriser pour les francophones.",
    rule: `**Verbs followed by gerund (-ing)**: enjoy, finish, avoid, mind, suggest, recommend, deny, miss, practise, consider, imagine, keep.
*I enjoy working from home. / She suggested taking a break.*

**Verbs followed by infinitive (to + verb)**: want, need, decide, plan, hope, expect, promise, agree, refuse, manage, learn, offer.
*I want to learn Italian. / She decided to apply.*

**Verbs that take BOTH with the same meaning**: like, love, hate, prefer, start, begin, continue.
*I love singing = I love to sing.*

**Verbs that take BOTH with DIFFERENT meanings**:
- *remember to do* (= don't forget to) / *remember doing* (= recall doing)
- *stop to do* (= pause in order to) / *stop doing* (= quit the activity)
- *try to do* (= attempt) / *try doing* (= experiment with)
- *forget to do* (= neglect to) / *forget doing* (= no memory of doing)

After **prepositions** (about, of, for, in, on, at, before, after, instead of), ALWAYS gerund: *I'm thinking about quitting.*`,
    ruleFr: `**Verbes suivis du gérondif (-ing)** : enjoy, finish, avoid, mind, suggest, recommend, deny, miss, practise, consider, imagine, keep.
*I enjoy working from home. / She suggested taking a break.*

**Verbes suivis de l'infinitif (to + verbe)** : want, need, decide, plan, hope, expect, promise, agree, refuse, manage, learn, offer.
*I want to learn Italian. / She decided to apply.*

**Verbes qui prennent les DEUX, même sens** : like, love, hate, prefer, start, begin, continue.
*I love singing = I love to sing.*

**Verbes qui prennent les DEUX, sens DIFFÉRENT** :
- *remember to do* (= ne pas oublier de) / *remember doing* (= se souvenir de)
- *stop to do* (= s'arrêter pour) / *stop doing* (= arrêter de)
- *try to do* (= tenter) / *try doing* (= essayer comme expérience)
- *forget to do* (= oublier de) / *forget doing* (= ne pas se rappeler avoir fait)

Après une **préposition** (about, of, for, in, on, at, before, after, instead of), TOUJOURS le gérondif : *I'm thinking about quitting.*`,
    examples: [
      { en: 'I enjoy reading before bed.', fr: "J'aime lire avant de dormir.", note: '"Enjoy" → gerund.', noteFr: '"Enjoy" → gérondif.' },
      { en: 'She wants to learn Japanese.', fr: 'Elle veut apprendre le japonais.', note: '"Want" → infinitive.', noteFr: '"Want" → infinitif.' },
      { en: 'I stopped to take a call.', fr: "Je me suis arrêté pour prendre un appel.", note: '"Stop to do" = pause in order to do.', noteFr: '"Stop to do" = s\'arrêter pour faire.' },
      { en: 'I stopped taking calls after 6pm.', fr: "J'ai arrêté de prendre des appels après 18h.", note: '"Stop doing" = quit the activity.', noteFr: '"Stop doing" = arrêter de faire.' },
      { en: "I'm interested in joining the team.", fr: 'Ça m\'intéresse de rejoindre l\'équipe.', note: 'After preposition "in" → gerund.', noteFr: 'Après "in" → gérondif.' },
    ],
    drills: [
      { type: 'fill', prompt: 'I enjoy ___ (read) on weekends.', promptFr: "J'aime ___ (read) le week-end.", answer: 'reading', explanation: '"Enjoy" → gerund.', explanationFr: '"Enjoy" → gérondif.' },
      { type: 'fill', prompt: 'She decided ___ (apply) for the role.', promptFr: 'Elle a décidé ___ (apply) au poste.', answer: 'to apply', explanation: '"Decide" → infinitive.', explanationFr: '"Decide" → infinitif.' },
      { type: 'mcq', prompt: 'Which sentence is correct?', promptFr: 'Quelle phrase est correcte ?', options: ['I avoid to drink coffee after 4pm.', 'I avoid drinking coffee after 4pm.', 'I avoid drink coffee after 4pm.', 'I avoid drinks coffee after 4pm.'], answer: 1, explanation: '"Avoid" → gerund.', explanationFr: '"Avoid" → gérondif.' },
      { type: 'fill', prompt: 'Remember ___ (lock) the door before leaving.', promptFr: 'N\'oublie pas ___ (lock) la porte avant de partir.', answer: 'to lock', explanation: '"Remember to do" = don\'t forget to do.', explanationFr: '"Remember to do" = ne pas oublier de.' },
      { type: 'fill', prompt: 'I remember ___ (lock) the door this morning.', promptFr: 'Je me souviens ___ (lock) la porte ce matin.', answer: 'locking', explanation: '"Remember doing" = recall doing it.', explanationFr: '"Remember doing" = se souvenir d\'avoir fait.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I want learning Italian.', 'She suggested going for a walk.', "He's interested in joining us.", "I plan to leave by 6."], answer: 0, explanation: '"Want" → infinitive: "I want TO LEARN Italian".', explanationFr: '"Want" → infinitif : "I want TO LEARN Italian".' },
      { type: 'fill', prompt: 'She is thinking about ___ (change) jobs.', promptFr: 'Elle pense à ___ (change) de travail.', answer: 'changing', explanation: 'After preposition "about" → gerund.', explanationFr: 'Après "about" → gérondif.' },
      { type: 'fill', prompt: 'I stopped ___ (smoke) two years ago.', promptFr: "J'ai arrêté ___ (smoke) il y a deux ans.", answer: 'smoking', explanation: '"Stop doing" = quit the activity.', explanationFr: '"Stop doing" = arrêter de faire.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ["I'm looking forward to see you.", "I'm looking forward seeing you.", "I'm looking forward to seeing you.", "I'm look forward to see you."], answer: 2, explanation: '"Look forward TO + gerund". "To" is a preposition here.', explanationFr: '"Look forward TO + gérondif". "To" est une préposition ici.' },
      { type: 'fill', prompt: 'He managed ___ (finish) the report on time.', promptFr: 'Il a réussi ___ (finish) le rapport à temps.', answer: 'to finish', explanation: '"Manage" → infinitive.', explanationFr: '"Manage" → infinitif.' },
    ],
  },

  /* ============================== A2 — adverbs of frequency ============================== */
  {
    id: 'adverbs-frequency',
    name: 'Adverbs of frequency: always, often, sometimes…',
    nameFr: 'Adverbes de fréquence : always, often, sometimes…',
    level: 'A2',
    blurb:
      'Where exactly do "always", "never", "sometimes" go in a sentence? French speakers misplace them all the time.',
    blurbFr:
      'Où placer exactement "always", "never", "sometimes" ? Les francophones se trompent souvent.',
    rule: `**Frequency scale**: always (100%) > usually > often > sometimes > rarely / seldom > never (0%).

**Position rule** in a sentence:
- BEFORE the main verb: *I always check my email first.*
- AFTER the verb "be": *She is always on time.*
- AFTER the auxiliary, before the main verb: *I have never been to Tokyo. / He doesn't always reply.*

Adverbs like "every day", "twice a week", "sometimes" can also start or end a sentence:
- *Sometimes I work from home.*
- *I work from home sometimes.*

But "always", "never", "rarely", "often" usually stay in mid-position.`,
    ruleFr: `**Échelle de fréquence** : always (100%) > usually > often > sometimes > rarely / seldom > never (0%).

**Position dans la phrase** :
- AVANT le verbe principal : *I always check my email first.*
- APRÈS le verbe "be" : *She is always on time.*
- APRÈS l'auxiliaire, avant le verbe principal : *I have never been to Tokyo. / He doesn't always reply.*

Les adverbes comme "every day", "twice a week", "sometimes" peuvent commencer ou terminer la phrase :
- *Sometimes I work from home.*
- *I work from home sometimes.*

Mais "always", "never", "rarely", "often" restent en général en position centrale.`,
    examples: [
      { en: 'I always drink coffee in the morning.', fr: 'Je bois toujours du café le matin.', note: 'Before main verb.', noteFr: 'Avant le verbe principal.' },
      { en: 'She is never late to meetings.', fr: 'Elle n\'est jamais en retard aux réunions.', note: 'After "be".', noteFr: 'Après "be".' },
      { en: 'We have often discussed this.', fr: 'On en a souvent discuté.', note: 'After auxiliary, before main verb.', noteFr: "Après l'auxiliaire, avant le verbe.", },
      { en: 'Sometimes I take the long way home.', fr: 'Parfois je rentre par le long chemin.', note: '"Sometimes" can move to start.', noteFr: '"Sometimes" peut être en tête.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I always am tired on Mondays.', 'I am always tired on Mondays.', 'Always I am tired on Mondays.', 'I am tired always on Mondays.'], answer: 1, explanation: '"Always" goes AFTER "be" (am).', explanationFr: '"Always" va APRÈS "be" (am).' },
      { type: 'fill', prompt: 'Insert "never" correctly: "I ___ (never) eat meat ___ ."', promptFr: 'Insère "never" : "I ___ (never) eat meat ___ ."', answer: 'never', explanation: 'Before the main verb "eat" → "I never eat meat".', explanationFr: 'Avant le verbe principal "eat" → "I never eat meat".' },
      { type: 'mcq', prompt: 'Where does "usually" go? "I ___ have ___ lunch ___ at 12."', promptFr: 'Où placer "usually" ? "I ___ have ___ lunch ___ at 12."', options: ['1st blank', '2nd blank', '3rd blank', 'Anywhere works'], answer: 0, explanation: '"Usually" goes BEFORE "have" (the main verb).', explanationFr: '"Usually" va AVANT "have" (verbe principal).' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['She often works late.', 'They have already finished.', 'I sometimes go to the gym.', 'He goes always to the gym.'], answer: 3, explanation: '"Always" before main verb: "He always goes to the gym".', explanationFr: '"Always" avant le verbe principal : "He always goes to the gym".' },
      { type: 'fill', prompt: 'My team ___ (rarely) miss a deadline.', promptFr: 'Mon équipe ___ (rarely) une deadline.', answer: 'rarely miss', explanation: '"Rarely" goes before the main verb "miss".', explanationFr: '"Rarely" va avant le verbe principal "miss".' },
      { type: 'mcq', prompt: 'Which sentence has the right adverb position?', promptFr: 'Quelle phrase a la bonne position d\'adverbe ?', options: ['Always I take notes in meetings.', 'I take always notes in meetings.', 'I always take notes in meetings.', 'I take notes always in meetings.'], answer: 2, explanation: 'Mid-position before main verb is the natural slot.', explanationFr: 'Position centrale avant le verbe est la bonne.' },
      { type: 'fill', prompt: 'They ___ (have / never) been to Spain.', promptFr: "Ils ___ (have / never) été en Espagne.", answer: 'have never', explanation: '"Never" goes after the auxiliary "have".', explanationFr: '"Never" va après l\'auxiliaire "have".' },
      { type: 'mcq', prompt: 'Most natural: "I work from home ___."', promptFr: 'Le plus naturel : "I work from home ___."', options: ['always', 'sometimes', 'never', 'usually'], answer: 1, explanation: '"Sometimes" can naturally go at the end. "Always/never/usually" prefer mid-position.', explanationFr: '"Sometimes" peut aller à la fin. "Always/never/usually" préfèrent le milieu.' },
      { type: 'fill', prompt: 'She ___ (often) does not respond to LinkedIn messages.', promptFr: 'Elle ___ (often) ne répond pas aux messages LinkedIn.', answer: 'often', explanation: 'Insert before "does not": "She often does not respond".', explanationFr: 'Avant "does not" : "She often does not respond".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I often work from cafés.', 'My boss never is wrong.', 'We sometimes pair-program.', 'They are always on time.'], answer: 1, explanation: '"Never" goes after "be": "My boss is never wrong".', explanationFr: '"Never" va après "be" : "My boss is never wrong".' },
    ],
  },

  /* ============================== B1 — so / such / too / enough ============================== */
  {
    id: 'so-such-too-enough',
    name: 'So / such / too / enough',
    nameFr: 'So / such / too / enough',
    level: 'B1',
    blurb:
      'Four small intensifiers with strict patterns. The difference between "too cold to swim" and "cold enough to skate".',
    blurbFr:
      'Quatre petits intensificateurs aux schémas stricts. Distinction entre "too cold to swim" et "cold enough to skate".',
    rule: `**so + adjective/adverb**: emphasises a quality. *It's so cold today.*

**such + (a/an) + adjective + noun**: emphasises a noun phrase. *It's such a cold day.*

**too + adjective**: more than is acceptable, negative. *The coffee is too hot to drink.*

**adjective + enough**: enough of a quality (positive). *Is the soup hot enough?*

**enough + noun**: enough quantity. *Do we have enough chairs?*

The pattern after "too" / "enough" with a verb is: *too/enough + (for someone) + to do*: *too tired to argue / strong enough to lift it / quiet enough for me to focus.*`,
    ruleFr: `**so + adjectif/adverbe** : insiste sur une qualité. *It's so cold today.*

**such + (a/an) + adjectif + nom** : insiste sur un groupe nominal. *It's such a cold day.*

**too + adjectif** : plus que tolérable, négatif. *The coffee is too hot to drink.*

**adjectif + enough** : assez d'une qualité (positif). *Is the soup hot enough?*

**enough + nom** : quantité suffisante. *Do we have enough chairs?*

Le schéma après "too" / "enough" + verbe : *too/enough + (for someone) + to do* : *too tired to argue / strong enough to lift it / quiet enough for me to focus.*`,
    examples: [
      { en: 'It\'s so noisy in here.', fr: 'Il y a tellement de bruit ici.', note: '"so + adjective".', noteFr: '"so + adjectif".' },
      { en: "It's such a noisy office.", fr: "C'est un bureau tellement bruyant.", note: '"such + a + adjective + noun".', noteFr: '"such + a + adjectif + nom".' },
      { en: 'The room is too small for 10 people.', fr: 'La salle est trop petite pour 10 personnes.', note: '"too + adjective".', noteFr: '"too + adjectif".' },
      { en: 'Is the room big enough for 10 people?', fr: 'La salle est-elle assez grande pour 10 personnes ?', note: '"adjective + enough".', noteFr: '"adjectif + enough".' },
    ],
    drills: [
      { type: 'fill', prompt: "She's ___ (so / such) a thoughtful designer.", promptFr: "C'est ___ (so / such) une designer prévenante.", answer: 'such', explanation: '"Such + a + adjective + noun".', explanationFr: '"Such + a + adjectif + nom".' },
      { type: 'fill', prompt: 'The talk was ___ (so / such) inspiring.', promptFr: 'Le talk était ___ (so / such) inspirant.', answer: 'so', explanation: '"So + adjective" alone.', explanationFr: '"So + adjectif" seul.' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ['The deadline is too tight to meet.', 'The deadline is too tight for meet.', 'The deadline is enough tight to meet.', 'The deadline is so tight that meet.'], answer: 0, explanation: '"too + adjective + to + verb".', explanationFr: '"too + adjectif + to + verbe".' },
      { type: 'fill', prompt: 'Is your laptop fast ___ for video editing?', promptFr: 'Ton laptop est-il assez rapide ___ pour le montage vidéo ?', answer: 'enough', explanation: '"adjective + enough" — enough comes AFTER the adjective.', explanationFr: '"adjectif + enough" — enough APRÈS l\'adjectif.' },
      { type: 'mcq', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I have enough time to finish.', 'I have time enough to finish.', 'I don\'t have enough time.', 'There aren\'t enough chairs.'], answer: 1, explanation: 'With nouns, "enough" goes BEFORE: "enough time", not "time enough" (archaic).', explanationFr: 'Avec un nom, "enough" va AVANT : "enough time", pas "time enough" (archaïque).' },
      { type: 'fill', prompt: 'It was ___ (such / so) cold that the lake froze.', promptFr: "Il faisait ___ (such / so) froid que le lac a gelé.", answer: 'so', explanation: '"So + adjective" + that-clause.', explanationFr: '"So + adjectif" + that-clause.' },
      { type: 'fill', prompt: 'It was ___ (such / so) a cold day that the lake froze.', promptFr: "C'était ___ (such / so) une journée froide que le lac a gelé.", answer: 'such', explanation: '"Such + a + adjective + noun" + that-clause.', explanationFr: '"Such + a + adjectif + nom" + that-clause.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['He\'s tall enough to play basketball.', 'It\'s too late to call her now.', 'I have too much work today.', 'The room is enough quiet for me.'], answer: 3, explanation: '"Quiet enough", not "enough quiet". Adjective + enough.', explanationFr: '"Quiet enough", pas "enough quiet". Adjectif + enough.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['The pitch was so disappointing that we left.', 'The pitch was such disappointing that we left.', 'The pitch was too disappointing that we left.', 'The pitch was enough disappointing that we left.'], answer: 0, explanation: '"So + adjective + that…".', explanationFr: '"So + adjectif + that…".' },
      { type: 'fill', prompt: "Is there ___ space in the meeting room?", promptFr: 'Y a-t-il ___ de place en salle de réunion ?', answer: 'enough', explanation: '"Enough + noun" — quantity.', explanationFr: '"Enough + nom" — quantité.' },
    ],
  },

  /* ============================== B2 — wishes & regrets ============================== */
  {
    id: 'wishes-regrets',
    name: 'Wish / If only — wishes & regrets',
    nameFr: 'Wish / If only — souhaits et regrets',
    level: 'B2',
    blurb:
      'Three patterns to express what you wish were different — present, past, or about someone else\'s annoying habit.',
    blurbFr:
      'Trois patterns pour exprimer ce qu\'on souhaiterait différent — présent, passé, ou habitude agaçante d\'autrui.',
    rule: `**Wish about the present** — use the past tense after "wish" / "if only".
*I wish I had more time. / If only I were taller.*

**Wish about the past** (regret) — use past perfect.
*I wish I had studied harder. / If only she had told me sooner.*

**Wish about someone's annoying habit** — use "would + base verb" (about another person, not yourself).
*I wish you would stop interrupting. / If only the wifi would work.*

Note: with "I wish I would" → use "could" instead. *I wish I could swim* (not "I wish I would swim").

The "were" (not "was") is the careful choice with "I wish I were…" — same rule as the second conditional.`,
    ruleFr: `**Souhait au présent** — prétérit après "wish" / "if only".
*I wish I had more time. / If only I were taller.*

**Souhait sur le passé** (regret) — past perfect.
*I wish I had studied harder. / If only she had told me sooner.*

**Souhait sur l\'habitude agaçante d\'autrui** — "would + verbe à la base" (sur une autre personne, pas soi).
*I wish you would stop interrupting. / If only the wifi would work.*

Note : avec "I wish I would" → utiliser "could" à la place. *I wish I could swim* (pas "I wish I would swim").

"Were" (pas "was") est le choix soigné avec "I wish I were…" — même règle que le second conditional.`,
    examples: [
      { en: 'I wish I had more free time.', fr: "J'aimerais avoir plus de temps libre.", note: 'Present wish → past tense.', noteFr: 'Souhait au présent → prétérit.' },
      { en: "I wish I'd applied earlier.", fr: 'J\'aurais aimé postuler plus tôt.', note: 'Past regret → past perfect.', noteFr: 'Regret passé → past perfect.' },
      { en: 'I wish you would call your mother more often.', fr: "J'aimerais que tu appelles ta mère plus souvent.", note: 'About someone\'s habit → "would + base".', noteFr: 'Habitude d\'autrui → "would + base".' },
      { en: 'If only I could speak Italian fluently.', fr: 'Si seulement je parlais italien couramment.', note: '"I wish I could" — not "would" — for self.', noteFr: '"I wish I could" — pas "would" — pour soi.' },
    ],
    drills: [
      { type: 'fill', prompt: 'I wish I ___ (have) more time today.', promptFr: 'J\'aimerais ___ (have) plus de temps aujourd\'hui.', answer: 'had', explanation: 'Wish about the present → past simple "had".', explanationFr: 'Souhait au présent → prétérit "had".' },
      { type: 'fill', prompt: 'I wish I ___ (study) harder in school.', promptFr: 'J\'aurais aimé ___ (study) plus à l\'école.', answer: 'had studied', explanation: 'Past regret → past perfect "had studied".', explanationFr: 'Regret passé → past perfect "had studied".' },
      { type: 'mcq', prompt: 'Pick the correct wish about an annoying habit.', promptFr: 'Choisis le bon souhait sur une habitude agaçante.', options: ['I wish you stopped interrupting.', 'I wish you would stop interrupting.', 'I wish you had stopped interrupting.', 'I wish you stop interrupting.'], answer: 1, explanation: 'Annoying habit → "would + base".', explanationFr: 'Habitude agaçante → "would + base".' },
      { type: 'fill', prompt: 'I wish I ___ (be) better at remembering names.', promptFr: 'J\'aimerais ___ (be) meilleur pour retenir les noms.', answer: 'were', acceptedAnswers: ['was'], explanation: 'Present wish → "were" (careful) or "was" (informal).', explanationFr: 'Souhait au présent → "were" (soigné) ou "was" (informel).' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I wish I had taken that job.', 'I wish I would speak Italian fluently.', 'I wish you would call more often.', 'I wish I had more time.'], answer: 1, explanation: '"I wish I would" → use "could" for yourself.', explanationFr: '"I wish I would" → utiliser "could" pour soi.' },
      { type: 'fill', prompt: 'If only she ___ (tell) me yesterday.', promptFr: 'Si seulement elle me l\'___ (tell) hier.', answer: 'had told', explanation: 'Past regret → past perfect.', explanationFr: 'Regret passé → past perfect.' },
      { type: 'mcq', prompt: 'Most natural: "I wish my colleague…"', promptFr: 'Le plus naturel : "I wish my colleague…"', options: ['…wouldn\'t talk so loudly.', '…doesn\'t talk so loudly.', '…hadn\'t talk so loudly.', '…not talk so loudly.'], answer: 0, explanation: 'Annoying behaviour → "would" (negative: "wouldn\'t").', explanationFr: 'Comportement agaçant → "would" (négatif : "wouldn\'t").' },
      { type: 'fill', prompt: 'I wish my parents ___ (live) closer.', promptFr: "J'aimerais que mes parents ___ (live) plus près.", answer: 'lived', explanation: 'Present wish about a state → past simple "lived".', explanationFr: 'Souhait au présent sur un état → prétérit "lived".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ["I wish I knew the answer.", "I wish I know the answer.", "I wish I would know the answer.", "I wish I had know the answer."], answer: 0, explanation: 'Wish about the present → past simple "knew".', explanationFr: 'Souhait au présent → prétérit "knew".' },
      { type: 'fill', prompt: 'I wish I ___ (not / say) that in the meeting.', promptFr: 'J\'aurais aimé ___ (not / say) ça en réunion.', answer: "hadn't said", acceptedAnswers: ['had not said'], explanation: 'Past regret → past perfect negative.', explanationFr: 'Regret passé → past perfect négatif.' },
    ],
  },

  /* ============================== B1 — both / either / neither ============================== */
  {
    id: 'both-either-neither',
    name: 'Both / either / neither / all',
    nameFr: 'Both / either / neither / all',
    level: 'B1',
    blurb:
      'Tiny words for groups of two or more. Native English uses them precisely — French speakers blur them.',
    blurbFr:
      'Petits mots pour parler de groupes de deux ou plus. Les natifs les utilisent précisément — les francophones les confondent.',
    rule: `**both** = the two of them (positive). *Both options work.*

**either** = one OR the other (positive in choice; negative form for "neither"). *Either option works. / I don't like either.*

**neither** = NOT one and NOT the other (one word, no extra "not"). *Neither option works.*

**all** = three or more (positive). *All three options work.*

Patterns to memorise:
- *both X and Y* — both Sarah and Mike
- *either X or Y* — either Sarah or Mike
- *neither X nor Y* — neither Sarah nor Mike (note: "nor", not "or")

With verbs, "neither" + singular verb in formal English: *Neither option is good.* But colloquial English often uses plural.`,
    ruleFr: `**both** = les deux (positif). *Both options work.*

**either** = l\'un OU l\'autre (positif dans un choix ; forme négative = "neither"). *Either option works. / I don\'t like either.*

**neither** = NI l\'un NI l\'autre (un seul mot, pas de "not" en plus). *Neither option works.*

**all** = trois ou plus (positif). *All three options work.*

Patterns à mémoriser :
- *both X and Y* — both Sarah and Mike
- *either X or Y* — either Sarah or Mike
- *neither X nor Y* — neither Sarah nor Mike (note : "nor", pas "or")

Avec un verbe, "neither" + verbe au singulier en anglais soigné : *Neither option is good.* L\'oral relâché met souvent au pluriel.`,
    examples: [
      { en: 'Both designers are senior.', fr: 'Les deux designers sont seniors.', note: '"Both" + plural verb.', noteFr: '"Both" + verbe au pluriel.' },
      { en: 'Either Tuesday or Thursday works for me.', fr: 'Mardi ou jeudi me va.', note: '"Either + or".', noteFr: '"Either + or".' },
      { en: 'Neither candidate has the right experience.', fr: 'Aucun des deux candidats n\'a la bonne expérience.', note: '"Neither" + singular verb (formal).', noteFr: '"Neither" + verbe au singulier (soigné).' },
      { en: 'All three of us agreed.', fr: 'Tous les trois on était d\'accord.', note: '"All" for 3+, plural verb.', noteFr: '"All" pour 3+, verbe pluriel.' },
    ],
    drills: [
      { type: 'fill', prompt: '___ designs are excellent — I can\'t pick.', promptFr: 'Les ___ designs sont excellents — je ne peux pas choisir.', answer: 'Both', acceptedAnswers: ['both'], explanation: 'Two items, positive → "Both".', explanationFr: 'Deux éléments, positif → "Both".' },
      { type: 'fill', prompt: '___ option works — I don\'t mind.', promptFr: 'L\'une ___ ou l\'autre me va — je n\'ai pas de préférence.', answer: 'Either', acceptedAnswers: ['either'], explanation: 'Choice between two → "Either".', explanationFr: 'Choix entre deux → "Either".' },
      { type: 'fill', prompt: '___ candidate had the right experience.', promptFr: '___ des candidats n\'avait l\'expérience requise.', answer: 'Neither', acceptedAnswers: ['neither'], explanation: 'Negation of two → "Neither".', explanationFr: 'Négation des deux → "Neither".' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ['Neither of them are right.', 'Neither of them is right.', 'Neither of them has right.', 'Both 1 and 2 are accepted; 2 is more formal.'], answer: 3, explanation: '"Neither" + singular is formal; plural is colloquial — both heard.', explanationFr: '"Neither" + singulier est soigné ; le pluriel est oral — les deux s\'entendent.' },
      { type: 'fill', prompt: 'I like ___ Tuesday ___ Thursday — your pick.', promptFr: "J'aime ___ mardi ___ jeudi — à toi de choisir.", answer: 'either / or', acceptedAnswers: ['either or'], explanation: '"Either + or" pattern.', explanationFr: 'Pattern "either + or".' },
      { type: 'fill', prompt: 'I trust ___ Sarah ___ Mike with this.', promptFr: 'Je ne fais confiance ___ à Sarah ___ à Mike pour ça.', answer: 'neither / nor', acceptedAnswers: ['neither nor'], explanation: '"Neither + nor" — note "nor", not "or".', explanationFr: '"Neither + nor" — attention "nor", pas "or".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['Both options are great.', 'Neither candidate is qualified.', 'Either Tuesday or Thursday works.', "Neither Tom or Sarah is coming."], answer: 3, explanation: '"Neither + nor" (not "or"): "Neither Tom NOR Sarah".', explanationFr: '"Neither + nor" (pas "or") : "Neither Tom NOR Sarah".' },
      { type: 'fill', prompt: '___ three options have trade-offs.', promptFr: 'Les ___ trois options ont des compromis.', answer: 'All', acceptedAnswers: ['all'], explanation: 'Three or more → "All".', explanationFr: 'Trois ou plus → "All".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I don\'t like either of them.', 'I don\'t like neither of them.', 'I like both of them not.', 'I don\'t like both of them.'], answer: 0, explanation: 'Use "either" with negative; "I don\'t like NEITHER" is double negative.', explanationFr: 'Utilise "either" avec négation ; "I don\'t like NEITHER" est une double négation.' },
      { type: 'fill', prompt: 'I want ___ tea ___ coffee, just water.', promptFr: 'Je ne veux ___ thé ___ café, juste de l\'eau.', answer: 'neither / nor', acceptedAnswers: ['neither nor'], explanation: 'Refusing both → "neither + nor".', explanationFr: 'Refus des deux → "neither + nor".' },
    ],
  },

  /* ============================== B2 — would rather / had better ============================== */
  {
    id: 'would-rather-had-better',
    name: 'Would rather / had better',
    nameFr: 'Would rather / had better',
    level: 'B2',
    blurb:
      'Two ways to express preference and strong advice. Both look like past tenses but talk about the present or future.',
    blurbFr:
      "Deux structures pour exprimer une préférence et un conseil fort. Les deux ont l'air de prétérits mais parlent du présent ou du futur.",
    rule: `**would rather + base verb** — preference (= prefer to). *I'd rather stay home.*

**would rather + (someone else) + past tense** — preference about someone else's action. *I'd rather you didn't smoke here.* (NOT "I'd rather you don't smoke")

**had better + base verb** — strong advice or warning, often with negative consequence implied. *You'd better leave now or you'll miss the train.*

**had better NOT + base verb** — negative warning. *You'd better not be late.* (NOT "you'd not better")

Both are followed by the BARE infinitive (no "to"):
- ✓ *I'd rather walk.* / *You'd better hurry.*
- ✗ *I'd rather to walk.* / *You'd better to hurry.*

"Had better" is stronger than "should" — it implies a real consequence if you don't.`,
    ruleFr: `**would rather + verbe à la base** — préférence (= préférer). *I'd rather stay home.*

**would rather + (autre personne) + prétérit** — préférence sur l\'action d\'autrui. *I'd rather you didn't smoke here.* (PAS "I'd rather you don't smoke")

**had better + verbe à la base** — conseil fort ou avertissement, avec conséquence négative implicite. *You'd better leave now or you'll miss the train.*

**had better NOT + verbe à la base** — avertissement négatif. *You'd better not be late.* (PAS "you'd not better")

Les deux sont suivis de l\'infinitif SANS "to" :
- ✓ *I'd rather walk.* / *You'd better hurry.*
- ✗ *I'd rather to walk.* / *You'd better to hurry.*

"Had better" est plus fort que "should" — il sous-entend une vraie conséquence.`,
    examples: [
      { en: 'I\'d rather work from home today.', fr: 'Je préfère bosser de chez moi aujourd\'hui.', note: '"Would rather + base verb".', noteFr: '"Would rather + verbe à la base".' },
      { en: 'I\'d rather you didn\'t share that yet.', fr: "Je préférerais que tu ne partages pas ça pour l'instant.", note: '"Would rather + person + past tense".', noteFr: '"Would rather + personne + prétérit".' },
      { en: 'You\'d better book your flight before prices spike.', fr: 'Tu ferais mieux de réserver ton vol avant que les prix grimpent.', note: '"Had better + base" = strong advice.', noteFr: '"Had better + base" = conseil fort.' },
      { en: 'We\'d better not skip the QA round.', fr: 'On ferait mieux de ne pas sauter la QA.', note: '"Had better NOT" — negative warning.', noteFr: '"Had better NOT" — avertissement négatif.' },
    ],
    drills: [
      { type: 'fill', prompt: 'I\'d rather ___ (stay) home tonight.', promptFr: 'Je préfère ___ (stay) à la maison ce soir.', answer: 'stay', explanation: '"Would rather + base verb".', explanationFr: '"Would rather + verbe à la base".' },
      { type: 'fill', prompt: 'You\'d better ___ (call) her before it\'s too late.', promptFr: 'Tu ferais mieux ___ (call) avant qu\'il ne soit trop tard.', answer: 'call', explanation: '"Had better + base verb".', explanationFr: '"Had better + verbe à la base".' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I\'d rather you don\'t use my laptop.', 'I\'d rather you didn\'t use my laptop.', 'I\'d rather you didn\'t to use my laptop.', 'I\'d rather not you use my laptop.'], answer: 1, explanation: '"Would rather + person + PAST tense" for someone else\'s action.', explanationFr: '"Would rather + personne + PRÉTÉRIT" pour l\'action d\'autrui.' },
      { type: 'fill', prompt: 'You ___ (had better / negative) be late again.', promptFr: 'Tu ___ (had better / négatif) être en retard à nouveau.', answer: "had better not", acceptedAnswers: ["'d better not", 'd better not'], explanation: '"Had better NOT" — negative warning.', explanationFr: '"Had better NOT" — avertissement négatif.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I\'d rather to walk than drive.', 'You\'d better hurry up.', 'I\'d rather you stayed.', 'We\'d better not skip lunch.'], answer: 0, explanation: '"Would rather + BARE verb" — no "to": "I\'d rather walk than drive".', explanationFr: '"Would rather + verbe à la base" — pas de "to" : "I\'d rather walk than drive".' },
      { type: 'fill', prompt: 'I\'d ___ (would rather) read than scroll.', promptFr: 'Je ___ (would rather) lire que scroller.', answer: 'rather', explanation: '"\'d rather" = "would rather".', explanationFr: '"\'d rather" = "would rather".' },
      { type: 'mcq', prompt: 'Most natural advice with strong consequence.', promptFr: 'Le conseil le plus fort avec conséquence.', options: ['You should bring an umbrella.', 'You\'d better bring an umbrella.', 'You can bring an umbrella.', 'You might bring an umbrella.'], answer: 1, explanation: '"Had better" = strong advice with consequence.', explanationFr: '"Had better" = conseil fort avec conséquence.' },
      { type: 'fill', prompt: "I'd rather we ___ (not / argue) about this now.", promptFr: 'Je préfère qu\'on ___ (not / argue) là-dessus maintenant.', answer: "didn't argue", acceptedAnswers: ['did not argue'], explanation: '"Would rather + person + past tense (negative)".', explanationFr: '"Would rather + personne + prétérit (négatif)".' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ["You'd not better lie to me.", "You hadn't better lie to me.", "You'd better not lie to me.", "You'd better don't lie to me."], answer: 2, explanation: '"\'d better not + base verb".', explanationFr: '"\'d better not + verbe à la base".' },
      { type: 'fill', prompt: 'They\'d ___ (would rather) ship late than ship broken.', promptFr: 'Ils ___ (would rather) livrer en retard que livrer cassé.', answer: 'rather', explanation: '"\'d rather X than Y" = preference between two options.', explanationFr: '"\'d rather X than Y" = préférence entre deux options.' },
    ],
  },

  /* ============================== B2 — although / despite / however ============================== */
  {
    id: 'concession-conjunctions',
    name: 'Although / despite / however',
    nameFr: 'Although / despite / however',
    level: 'B2',
    blurb:
      "Three ways to introduce contrast. They look interchangeable but their grammar differs — French speakers reliably mix them up.",
    blurbFr:
      'Trois façons d\'introduire un contraste. Ils paraissent interchangeables mais leur grammaire diffère — les francophones les confondent souvent.',
    rule: `**although / even though / though** + clause (subject + verb).
*Although it was raining, we went out. / We went out, even though it was raining.*

**despite / in spite of** + noun OR gerund (NOT a full clause).
*Despite the rain, we went out.*
*Despite being tired, I finished the report.*

**Important**: "despite" / "in spite of" CANNOT be followed by a clause directly. To add a clause, use "despite the fact that…":
- ✗ *Despite it was raining, we went out.*
- ✓ *Despite the fact that it was raining, we went out.*

**however** = a connector between sentences, with a comma. Used to introduce contrast at sentence level.
*The launch was delayed. However, the team handled it well.*

Don't confuse "however" with "although" — "however" can't replace "although" inside one sentence.`,
    ruleFr: `**although / even though / though** + proposition (sujet + verbe).
*Although it was raining, we went out. / We went out, even though it was raining.*

**despite / in spite of** + nom OU gérondif (PAS une proposition complète).
*Despite the rain, we went out.*
*Despite being tired, I finished the report.*

**Important** : "despite" / "in spite of" ne peuvent PAS être suivis directement d\'une proposition. Pour ajouter une proposition : "despite the fact that…" :
- ✗ *Despite it was raining, we went out.*
- ✓ *Despite the fact that it was raining, we went out.*

**however** = connecteur entre phrases, avec virgule. Introduit le contraste au niveau phrase.
*The launch was delayed. However, the team handled it well.*

Ne pas confondre "however" avec "although" — "however" ne peut pas remplacer "although" dans une seule phrase.`,
    examples: [
      { en: 'Although the deck was rough, the message landed.', fr: 'Bien que le deck soit brouillon, le message est passé.', note: '"Although + clause".', noteFr: '"Although + proposition".' },
      { en: 'Despite the rough deck, the message landed.', fr: "Malgré le deck brouillon, le message est passé.", note: '"Despite + noun phrase".', noteFr: '"Despite + groupe nominal".' },
      { en: 'The deck was rough. However, the message landed.', fr: 'Le deck était brouillon. Cependant, le message est passé.', note: '"However" = connector across sentences.', noteFr: '"However" = connecteur entre phrases.' },
      { en: 'Despite being exhausted, she nailed the demo.', fr: "Bien qu'épuisée, elle a réussi la démo.", note: '"Despite + gerund".', noteFr: '"Despite + gérondif".' },
    ],
    drills: [
      { type: 'fill', prompt: '___ I was tired, I finished the report.', promptFr: '___ j\'étais fatigué, j\'ai fini le rapport.', answer: 'Although', acceptedAnswers: ['Even though', 'Though', 'although', 'even though', 'though'], explanation: 'Followed by a clause → "Although" (or "even though" / "though").', explanationFr: 'Suivi d\'une proposition → "Although" (ou "even though" / "though").' },
      { type: 'fill', prompt: '___ being tired, I finished the report.', promptFr: '___ étant fatigué, j\'ai fini le rapport.', answer: 'Despite', acceptedAnswers: ['In spite of', 'despite', 'in spite of'], explanation: 'Followed by gerund/noun → "Despite" / "In spite of".', explanationFr: 'Suivi d\'un gérondif/nom → "Despite" / "In spite of".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['Despite he was tired, he finished.', 'Although he was tired, he finished.', 'Despite being tired, he finished.', 'Despite the tiredness, he finished.'], answer: 0, explanation: '"Despite" + clause is wrong. Use "Although he was tired" or "Despite being tired".', explanationFr: '"Despite" + proposition est faux. Utilise "Although he was tired" ou "Despite being tired".' },
      { type: 'fill', prompt: 'The launch failed. ___, we learned a lot.', promptFr: 'Le lancement a échoué. ___, on a beaucoup appris.', answer: 'However', acceptedAnswers: ['however'], explanation: '"However" connects two sentences with a comma.', explanationFr: '"However" relie deux phrases avec virgule.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['Despite of the rain, we went out.', 'In spite of the rain, we went out.', 'However the rain, we went out.', 'Despite the fact the rain, we went out.'], answer: 1, explanation: '"In spite of + noun". "Despite OF" is wrong (no "of" with "despite").', explanationFr: '"In spite of + nom". "Despite OF" est faux (pas de "of" avec "despite").' },
      { type: 'fill', prompt: '___ the long delay, the audience stayed.', promptFr: '___ le long retard, le public est resté.', answer: 'Despite', acceptedAnswers: ['In spite of', 'despite', 'in spite of'], explanation: '"Despite" / "In spite of" + noun.', explanationFr: '"Despite" / "In spite of" + nom.' },
      { type: 'mcq', prompt: 'Convert: "Despite he was nervous, he gave a great talk."', promptFr: 'Convertis : "Despite he was nervous, he gave a great talk."', options: ['Although he was nervous, he gave a great talk.', 'However he was nervous, he gave a great talk.', 'Despite of he was nervous, he gave a great talk.', 'In spite he was nervous, he gave a great talk.'], answer: 0, explanation: '"Despite + clause" is wrong → use "Although + clause".', explanationFr: '"Despite + proposition" est faux → utilise "Although + proposition".' },
      { type: 'fill', prompt: '___ the team was small, they shipped fast.', promptFr: '___ l\'équipe était petite, ils ont livré vite.', answer: 'Although', acceptedAnswers: ['Even though', 'Though', 'although', 'even though', 'though'], explanation: 'Clause → "Although".', explanationFr: 'Proposition → "Although".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['Although the bug was minor, we delayed the release.', 'Despite the minor bug, we delayed the release.', 'However the bug was minor, we delayed the release.', 'Despite being minor, the bug delayed the release.'], answer: 2, explanation: '"However" can\'t replace "although" within one clause.', explanationFr: '"However" ne peut pas remplacer "although" dans une proposition.' },
      { type: 'fill', prompt: 'The deal fell through. ___, we kept the relationship strong.', promptFr: 'Le deal est tombé à l\'eau. ___, on a gardé une relation solide.', answer: 'However', acceptedAnswers: ['however'], explanation: '"However" between sentences with comma.', explanationFr: '"However" entre phrases avec virgule.' },
    ],
  },

  /* ============================== A2 — countable vs uncountable ============================== */
  {
    id: 'countable-uncountable',
    name: 'Countable vs uncountable nouns',
    nameFr: 'Noms dénombrables vs indénombrables',
    level: 'A2',
    blurb:
      "The split that drives most quantifier and article choices in English. Many French nouns swap categories — caution.",
    blurbFr:
      "La distinction qui pilote la plupart des choix de quantifieurs et d'articles. Beaucoup de noms français changent de catégorie — attention.",
    rule: `**Countable** nouns can be counted: one chair, two chairs. They have plural forms and take "a/an" or numbers.

**Uncountable** nouns cannot be counted directly: water, advice, information, money, news, work, traffic, furniture, luggage. They have NO plural form and don't take "a/an" — they use *some, much, a lot of, a piece of*.

**French speaker traps**: French often uses plurals where English keeps the noun uncountable.
- ✗ *informations* → ✓ *information* (uncountable in EN)
- ✗ *advices* → ✓ *advice* (uncountable in EN)
- ✗ *news are* → ✓ *news is* (singular in EN)
- ✗ *furnitures* → ✓ *furniture* (uncountable)
- ✗ *a luggage* → ✓ *a piece of luggage*

To "count" an uncountable, use a container or unit: *a piece of advice, a glass of water, two slices of bread, a bit of news.*`,
    ruleFr: `Les noms **dénombrables** se comptent : one chair, two chairs. Ils ont un pluriel et prennent "a/an" ou un nombre.

Les noms **indénombrables** ne se comptent pas directement : water, advice, information, money, news, work, traffic, furniture, luggage. Pas de pluriel, pas de "a/an" — ils prennent *some, much, a lot of, a piece of*.

**Pièges francophones** : le français met souvent au pluriel ce que l'anglais garde indénombrable.
- ✗ *informations* → ✓ *information* (indénombrable en EN)
- ✗ *advices* → ✓ *advice* (indénombrable en EN)
- ✗ *news are* → ✓ *news is* (singulier en EN)
- ✗ *furnitures* → ✓ *furniture* (indénombrable)
- ✗ *a luggage* → ✓ *a piece of luggage*

Pour "compter" un indénombrable, on utilise un contenant ou une unité : *a piece of advice, a glass of water, two slices of bread, a bit of news.*`,
    examples: [
      { en: 'I need some advice on this.', fr: "J'ai besoin de conseils là-dessus.", note: '"Advice" is always uncountable.', noteFr: '"Advice" est toujours indénombrable.' },
      { en: 'She gave me three pieces of advice.', fr: "Elle m'a donné trois conseils.", note: 'To count → "pieces of advice".', noteFr: 'Pour compter → "pieces of advice".' },
      { en: 'The news is bad.', fr: 'Les nouvelles sont mauvaises.', note: '"News" looks plural but takes a singular verb.', noteFr: '"News" a l\'air pluriel mais prend un verbe au singulier.' },
      { en: 'We bought new furniture for the office.', fr: 'On a acheté de nouveaux meubles pour le bureau.', note: '"Furniture" is uncountable.', noteFr: '"Furniture" est indénombrable.' },
    ],
    drills: [
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I have a lot of work today.', 'She gave me good advices.', "We need new furniture.", "Can I have some water?"], answer: 1, explanation: '"Advice" is uncountable, no -s. "good advice".', explanationFr: '"Advice" est indénombrable, pas de -s. "good advice".' },
      { type: 'fill', prompt: 'I need ___ (a / some) information about this.', promptFr: "J'ai besoin ___ (a / some) info là-dessus.", answer: 'some', explanation: '"Information" uncountable → "some" (not "a").', explanationFr: '"Information" indénombrable → "some" (pas "a").' },
      { type: 'mcq', prompt: 'Which sentence is correct?', promptFr: 'Quelle phrase est correcte ?', options: ['The news are good today.', 'The news is good today.', 'The news be good today.', 'A news is good today.'], answer: 1, explanation: '"News" takes a singular verb, even though it ends in -s.', explanationFr: '"News" prend un verbe singulier malgré le -s.' },
      { type: 'fill', prompt: "Can I have a ___ of water, please?", promptFr: 'Je peux avoir un ___ d\'eau, s\'il te plaît ?', answer: 'glass', acceptedAnswers: ['bottle', 'cup'], explanation: 'To count "water", use a container: glass / bottle / cup.', explanationFr: 'Pour compter "water", on utilise un contenant : glass / bottle / cup.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I have some good news.', 'I have a good news.', 'I have several pieces of good news.', 'The news is positive.'], answer: 1, explanation: '"News" is uncountable → "I have some good news" (no "a").', explanationFr: '"News" est indénombrable → "I have some good news" (pas "a").' },
      { type: 'fill', prompt: 'They moved with two ___ of luggage.', promptFr: 'Ils ont déménagé avec deux ___ de bagages.', answer: 'pieces', acceptedAnswers: ['suitcases'], explanation: 'To count luggage → "pieces of luggage" or "suitcases".', explanationFr: 'Pour compter luggage → "pieces of luggage" ou "suitcases".' },
      { type: 'mcq', prompt: 'Pick the correct sentence.', promptFr: 'Choisis la phrase correcte.', options: ['How much money do you have?', 'How many money do you have?', 'How much moneys do you have?', 'How many moneys do you have?'], answer: 0, explanation: '"Money" is uncountable → "how much".', explanationFr: '"Money" est indénombrable → "how much".' },
      { type: 'fill', prompt: 'I had ___ (a / some) bread for breakfast.', promptFr: "J'ai mangé ___ (a / some) pain au petit-déj.", answer: 'some', acceptedAnswers: ['a slice of', 'a bit of'], explanation: '"Bread" uncountable → "some" or "a slice of".', explanationFr: '"Bread" indénombrable → "some" ou "a slice of".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['Heavy traffic delayed me.', 'I gave him three useful advice.', "There's too much furniture in here.", 'I have little time today.'], answer: 1, explanation: '"Advice" is uncountable. Use "three useful PIECES of advice".', explanationFr: '"Advice" est indénombrable. "Three useful PIECES of advice".' },
      { type: 'fill', prompt: 'There is ___ (a lot / many) of work left.', promptFr: 'Il reste ___ (a lot / many) de travail.', answer: 'a lot', explanation: '"Work" uncountable → "a lot of work" (NOT "many work").', explanationFr: '"Work" indénombrable → "a lot of work" (PAS "many work").' },
    ],
  },

  /* ============================== B1 — adjective order ============================== */
  {
    id: 'adjective-order',
    name: 'Adjective order',
    nameFr: 'Ordre des adjectifs',
    level: 'B1',
    blurb:
      'Native English follows a strict (often unconscious) adjective order. Get it wrong and your sentence sounds off — even if every word is correct.',
    blurbFr:
      "L'anglais natif suit un ordre d'adjectifs strict (souvent inconscient). Mal l'utiliser et la phrase sonne faux — même avec des mots justes.",
    rule: `When you stack multiple adjectives before a noun, English follows this order:

**OPSHACOM** (one mnemonic): Opinion → Size → Age → Shape → Colour → Origin → Material → Purpose.

- A **lovely** (opinion) **little** (size) **old** (age) **round** (shape) **red** (colour) **Italian** (origin) **wooden** (material) **dining** (purpose) **table**.

You rarely use 8 adjectives, but the principle holds with 2 or 3:
- ✓ *a small black bag* (size + colour)
- ✗ *a black small bag*

For 3+ adjectives, you can use commas, but the order rule stays. With purely descriptive (non-opinion) adjectives, native speakers rely on this pattern subconsciously.

When 2 adjectives feel equal (= you could swap them with "and"), commas separate them: *a kind, generous person.* When they're in different categories, NO comma: *a small leather bag.*`,
    ruleFr: `Pour empiler plusieurs adjectifs devant un nom, l'anglais suit cet ordre :

**OPSHACOM** (mnémotechnique) : Opinion → Size → Age → Shape → Colour → Origin → Material → Purpose.

- A **lovely** (opinion) **little** (size) **old** (age) **round** (shape) **red** (colour) **Italian** (origin) **wooden** (material) **dining** (purpose) **table**.

On utilise rarement 8 adjectifs, mais le principe tient à 2 ou 3 :
- ✓ *a small black bag* (taille + couleur)
- ✗ *a black small bag*

Pour 3+ adjectifs, des virgules sont possibles, mais l'ordre tient. Avec des adjectifs purement descriptifs (non-opinion), les natifs appliquent ça inconsciemment.

Quand 2 adjectifs sont équivalents (= tu pourrais les inverser avec "and"), virgules : *a kind, generous person.* Quand ils sont dans des catégories différentes, PAS de virgule : *a small leather bag.*`,
    examples: [
      { en: 'A beautiful old wooden chair.', fr: 'Une belle vieille chaise en bois.', note: 'Opinion → Age → Material.', noteFr: 'Opinion → Âge → Matière.' },
      { en: 'A small round table.', fr: 'Une petite table ronde.', note: 'Size → Shape.', noteFr: 'Taille → Forme.' },
      { en: 'A French silk scarf.', fr: 'Une écharpe en soie française.', note: 'Origin → Material.', noteFr: 'Origine → Matière.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Pick the natural order.', promptFr: 'Choisis l\'ordre naturel.', options: ['A black large dog.', 'A large black dog.', 'A black, large dog.', 'A dog large black.'], answer: 1, explanation: 'Size before colour: "a large black dog".', explanationFr: 'Taille avant couleur : "a large black dog".' },
      { type: 'mcq', prompt: 'Pick the natural order.', promptFr: 'Choisis l\'ordre naturel.', options: ['An Italian beautiful leather bag.', 'A leather Italian beautiful bag.', 'A beautiful Italian leather bag.', 'A beautiful leather Italian bag.'], answer: 2, explanation: 'Opinion → Origin → Material: "a beautiful Italian leather bag".', explanationFr: 'Opinion → Origine → Matière : "a beautiful Italian leather bag".' },
      { type: 'fill', prompt: 'Reorder: "wooden / a / small / old / desk".', promptFr: 'Réordonne : "wooden / a / small / old / desk".', answer: 'a small old wooden desk', explanation: 'Size → Age → Material: "a small old wooden desk".', explanationFr: 'Taille → Âge → Matière : "a small old wooden desk".' },
      { type: 'spot-error', prompt: 'Which order sounds wrong?', promptFr: 'Quel ordre sonne faux ?', options: ['A lovely young French woman.', 'A French lovely young woman.', 'A small round table.', 'A nice big new house.'], answer: 1, explanation: 'Opinion ("lovely") comes first, not origin ("French").', explanationFr: 'L\'opinion ("lovely") vient en premier, pas l\'origine ("French").' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['She has long beautiful blonde hair.', 'She has beautiful long blonde hair.', 'She has blonde beautiful long hair.', 'She has long blonde beautiful hair.'], answer: 1, explanation: 'Opinion → Size → Colour: "beautiful long blonde hair".', explanationFr: 'Opinion → Taille → Couleur : "beautiful long blonde hair".' },
      { type: 'fill', prompt: 'Reorder: "old / a / red / car / Italian".', promptFr: 'Réordonne : "old / a / red / car / Italian".', answer: 'an old red Italian car', explanation: 'Age → Colour → Origin: "an old red Italian car".', explanationFr: 'Âge → Couleur → Origine : "an old red Italian car".' },
      { type: 'mcq', prompt: 'Most natural sentence:', promptFr: 'Phrase la plus naturelle :', options: ['I bought a German wool grey thick coat.', 'I bought a thick grey German wool coat.', 'I bought a wool grey thick German coat.', 'I bought a coat grey German thick wool.'], answer: 1, explanation: 'Opinion/Size → Colour → Origin → Material.', explanationFr: 'Opinion/Taille → Couleur → Origine → Matière.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['A nice young teacher.', 'A young nice teacher.', 'A small black cat.', 'An expensive Swiss watch.'], answer: 1, explanation: 'Opinion ("nice") before age ("young"): "a nice young teacher".', explanationFr: 'Opinion ("nice") avant âge ("young") : "a nice young teacher".' },
      { type: 'fill', prompt: 'Reorder: "round / a / wooden / table / small".', promptFr: 'Réordonne : "round / a / wooden / table / small".', answer: 'a small round wooden table', explanation: 'Size → Shape → Material.', explanationFr: 'Taille → Forme → Matière.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['A handsome tall young man.', 'A young tall handsome man.', 'A handsome young tall man.', 'A tall young handsome man.'], answer: 0, explanation: 'Opinion → Size → Age: "a handsome tall young man".', explanationFr: 'Opinion → Taille → Âge : "a handsome tall young man".' },
    ],
  },

  /* ============================== A2 — possessive 's vs of ============================== */
  {
    id: 'possessive-s-of',
    name: "Possessive: 's vs of",
    nameFr: "Possession : 's vs of",
    level: 'A2',
    blurb:
      "Two ways to say 'X belongs to Y' in English. The choice depends on whether the owner is a person or a thing.",
    blurbFr:
      "Deux façons de dire 'X appartient à Y' en anglais. Le choix dépend si le possesseur est une personne ou une chose.",
    rule: `**'s** (apostrophe + s) — for PEOPLE, animals, organisations, time expressions.
*Sarah's deck / the dog's leash / the company's logo / yesterday's meeting.*

**of** — for THINGS (inanimate objects), abstract concepts.
*The colour of the wall / the start of the year / the result of the test.*

**Plural rule**: when the owner is plural and ends in -s, just add the apostrophe (no extra s):
- *the team's goal* (one team) vs *the teams' goals* (multiple teams)
- *children's toys* (irregular plural — adds 's normally)

When in doubt with mixed cases, both are often acceptable: *the girl's dress* / *the dress of the girl* — but the first is way more natural.

Avoid double possessives: *Sarah's brother's car* is OK, but stack carefully.`,
    ruleFr: `**'s** (apostrophe + s) — pour les PERSONNES, animaux, organisations, expressions de temps.
*Sarah's deck / the dog's leash / the company's logo / yesterday's meeting.*

**of** — pour les CHOSES (objets inanimés), concepts abstraits.
*The colour of the wall / the start of the year / the result of the test.*

**Pluriel** : quand le possesseur est pluriel et finit en -s, on ajoute juste l'apostrophe (pas de s en plus) :
- *the team's goal* (une équipe) vs *the teams' goals* (plusieurs équipes)
- *children's toys* (pluriel irrégulier — prend 's normalement)

En cas de doute sur du mixte, les deux sont souvent acceptés : *the girl's dress* / *the dress of the girl* — mais le premier est nettement plus naturel.

Évite les possessifs en chaîne : *Sarah's brother's car* est OK, mais empile avec parcimonie.`,
    examples: [
      { en: "I borrowed Sarah's notes.", fr: "J'ai emprunté les notes de Sarah.", note: 'Person → \'s.', noteFr: 'Personne → \'s.' },
      { en: 'The colour of the sky changes at sunset.', fr: 'La couleur du ciel change au coucher du soleil.', note: 'Thing → "of".', noteFr: 'Chose → "of".' },
      { en: 'Yesterday\'s meeting was productive.', fr: "La réunion d'hier était productive.", note: 'Time → \'s.', noteFr: 'Temps → \'s.' },
      { en: 'The walls\' colour has faded.', fr: 'La couleur des murs a passé.', note: 'Plural ending in s → just apostrophe.', noteFr: 'Pluriel en s → juste apostrophe.' },
    ],
    drills: [
      { type: 'mcq', prompt: 'Which sentence is most natural?', promptFr: 'Quelle phrase est la plus naturelle ?', options: ['The car of Sarah is blue.', "Sarah's car is blue.", "The Sarah's car is blue.", 'Sarah of car is blue.'], answer: 1, explanation: 'Person + possession → \'s. "Sarah\'s car".', explanationFr: 'Personne + possession → \'s. "Sarah\'s car".' },
      { type: 'mcq', prompt: 'Which sentence is most natural?', promptFr: 'Quelle phrase est la plus naturelle ?', options: ["The roof's of the house is leaking.", "The house's roof is leaking.", 'The roof of the house is leaking.', 'Both 2 and 3 work, but 3 is more common.'], answer: 3, explanation: 'For inanimate things, "of" is more natural; "house\'s" works informally.', explanationFr: 'Pour les choses inanimées, "of" est plus naturel ; "house\'s" passe à l\'oral.' },
      { type: 'fill', prompt: "I attended my ___ wedding. (= my friend has the wedding)", promptFr: 'Je suis allé au mariage de mon ami.', answer: "friend's", explanation: 'Person + possession → \'s.', explanationFr: 'Personne + possession → \'s.' },
      { type: 'fill', prompt: 'The end ___ the year is hectic.', promptFr: 'La fin ___ l\'année est chargée.', answer: 'of', explanation: 'Thing/concept → "of".', explanationFr: 'Chose/concept → "of".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["This is John's laptop.", "This is the laptop of John.", "Neither — both are technically OK.", "This is Johns' laptop."], answer: 3, explanation: '"Johns\'" implies multiple Johns. With a single John, use "John\'s".', explanationFr: '"Johns\'" sous-entend plusieurs Johns. Avec un seul John, "John\'s".' },
      { type: 'fill', prompt: 'The ___ toys are everywhere. (children plural)', promptFr: 'Les jouets ___ enfants sont partout.', answer: "children's", explanation: 'Irregular plural → still adds \'s.', explanationFr: 'Pluriel irrégulier → prend \'s normalement.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['The students of the books are heavy.', 'The students\' books are heavy.', 'The books of the students are heavy.', 'Both 2 and 3 work; 2 is more natural.'], answer: 3, explanation: 'For people, \'s is preferred. With plural ending in s → just apostrophe.', explanationFr: 'Pour les personnes, \'s préféré. Pluriel en s → juste apostrophe.' },
      { type: 'fill', prompt: '___ deadline is on Friday. (today)', promptFr: 'La deadline ___ est vendredi. (aujourd\'hui)', answer: "Today's", acceptedAnswers: ["today's"], explanation: 'Time expression → \'s.', explanationFr: 'Expression de temps → \'s.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["The colour of the table is nice.", "The table's colour is nice.", "The colour of table is nice.", "Both 1 and 2 work."], answer: 2, explanation: 'Need an article: "the table" or "this table". You can\'t drop "the".', explanationFr: 'Besoin d\'un article : "the table" ou "this table". On ne peut pas omettre "the".' },
      { type: 'fill', prompt: 'I love this restaurant ___ atmosphere.', promptFr: "J'adore l'atmosphère de ce restaurant.", answer: "restaurant's", acceptedAnswers: ["'s"], explanation: 'Restaurant (place/organisation) → \'s often works.', explanationFr: 'Restaurant (lieu/organisation) → \'s marche souvent.' },
    ],
  },
]
