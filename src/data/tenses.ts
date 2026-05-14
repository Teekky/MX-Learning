/**
 * Tenses topic bank — when to use which English tense.
 *
 * Different from Grammar (which covers structural patterns like inversions
 * or clefts), Tenses covers the diagnostic question: "given this context,
 * which tense fits?". Drills are mostly fill-in-the-blank with the verb
 * provided in its base form in parentheses — the user has to put it in
 * the correct tense.
 *
 * Topics center on the contrasts that French speakers reliably miss:
 * past simple vs present perfect, past simple vs past continuous, etc.
 * Bilingual (rule + explanations available in FR for low-level learners).
 */

import type { GrammarDrill, GrammarExample } from './grammar'
import type { Level } from '@/types'

export interface TenseTopic {
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

export const TENSE_TOPICS: TenseTopic[] = [
  /* ============================== B1 ============================== */
  {
    id: 'present-simple-vs-continuous',
    name: 'Present simple vs present continuous',
    nameFr: 'Présent simple vs présent continu',
    level: 'B1',
    blurb:
      'Habits and general truths use the simple. Things happening right now or temporarily use the continuous.',
    blurbFr:
      "Les habitudes et vérités générales prennent le présent simple. Ce qui se passe maintenant ou temporairement prend le présent continu.",
    rule: `**Present simple** ("I work / she works") — for habits, routines, schedules, general truths, and permanent states. Triggered by adverbs like always, usually, often, every day, on Mondays.

**Present continuous** ("I am working / she is working") — for actions happening RIGHT NOW, or temporary situations, or arrangements in the near future. Triggered by now, at the moment, currently, this week, today.

Stative verbs (know, like, want, believe, own, seem) usually stay in the simple even when the meaning is "right now": *I know him* (not "I am knowing him").`,
    ruleFr: `**Présent simple** ("I work / she works") — pour les habitudes, routines, horaires, vérités générales, états permanents. Déclencheurs : always, usually, often, every day, on Mondays.

**Présent continu** ("I am working / she is working") — pour les actions qui se passent MAINTENANT, les situations temporaires, ou les arrangements pour un futur proche. Déclencheurs : now, at the moment, currently, this week, today.

Les verbes d'état (know, like, want, believe, own, seem) restent presque toujours au simple, même au sens "en ce moment" : *I know him* (pas "I am knowing him").`,
    examples: [
      {
        en: 'She usually works from home on Fridays.',
        fr: 'Elle travaille généralement de chez elle le vendredi.',
        note: 'Habit → present simple.',
        noteFr: 'Habitude → présent simple.',
      },
      {
        en: "She's working from the office this week.",
        fr: 'Elle travaille au bureau cette semaine.',
        note: 'Temporary → present continuous.',
        noteFr: 'Temporaire → présent continu.',
      },
      {
        en: 'I know her well.',
        note: 'Stative verb stays in the simple.',
        noteFr: "Verbe d'état : reste au simple.",
      },
      {
        en: "We're meeting the client tomorrow at 3.",
        fr: 'On voit le client demain à 15h.',
        note: 'Planned future → present continuous.',
        noteFr: 'Futur planifié → présent continu.',
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: 'Every morning I ___ (drink) coffee before checking emails.',
        promptFr: 'Chaque matin, je ___ (drink) un café avant de regarder mes emails.',
        answer: 'drink',
        explanation: '"Every morning" signals a habit → present simple.',
        explanationFr: '"Every morning" indique une habitude → présent simple.',
      },
      {
        type: 'fill',
        prompt: "Sorry, I can't talk now — I ___ (write) an important email.",
        promptFr: 'Désolé, je ne peux pas parler — je ___ (write) un email important.',
        answer: 'am writing',
        acceptedAnswers: ["'m writing"],
        explanation: '"Now" + a one-off action in progress → present continuous.',
        explanationFr: '"Now" + action en cours ponctuelle → présent continu.',
      },
      {
        type: 'fill',
        prompt: 'My sister ___ (live) in Berlin for a few months while she finishes her thesis.',
        promptFr: 'Ma sœur ___ (live) à Berlin quelques mois le temps de finir sa thèse.',
        answer: 'is living',
        acceptedAnswers: ["'s living"],
        explanation: 'Temporary situation ("for a few months") → present continuous.',
        explanationFr: 'Situation temporaire → présent continu.',
      },
      {
        type: 'mcq',
        prompt: 'Which sentence is most natural?',
        promptFr: 'Quelle phrase est la plus naturelle ?',
        options: [
          'I am wanting a coffee.',
          'I want a coffee.',
          'I am want a coffee.',
          'I do want a coffee right now.',
        ],
        answer: 1,
        explanation: '"Want" is stative — it stays in the simple even for "right now".',
        explanationFr: '"Want" est un verbe d\'état : il reste au simple même pour "en ce moment".',
      },
      {
        type: 'fill',
        prompt: 'The sun ___ (rise) in the east.',
        promptFr: 'Le soleil ___ (rise) à l\'est.',
        answer: 'rises',
        explanation: 'General truth → present simple, third person -s.',
        explanationFr: 'Vérité générale → présent simple, -s à la 3ᵉ personne.',
      },
      {
        type: 'fill',
        prompt: "Look! It ___ (snow) again!",
        promptFr: 'Regarde ! Il ___ (snow) à nouveau !',
        answer: 'is snowing',
        acceptedAnswers: ["'s snowing"],
        explanation: '"Look!" + happening right now → present continuous.',
        explanationFr: '"Look!" + maintenant → présent continu.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence has the wrong tense?',
        promptFr: "Quelle phrase a le mauvais temps ?",
        options: [
          "I'm taking the train to Lyon tomorrow morning.",
          'She always takes the bus to school.',
          'I am knowing the answer to that question.',
          "It's raining outside.",
        ],
        answer: 2,
        explanation: 'Stative "know" should stay in the simple: "I know the answer".',
        explanationFr: 'Le verbe d\'état "know" reste au simple : "I know the answer".',
      },
      {
        type: 'fill',
        prompt: 'My team ___ (meet) every Monday at 10.',
        promptFr: 'Mon équipe ___ (meet) tous les lundis à 10h.',
        answer: 'meets',
        explanation: 'Recurring schedule → present simple.',
        explanationFr: 'Horaire récurrent → présent simple.',
      },
      {
        type: 'fill',
        prompt: 'I ___ (think) about changing jobs these days.',
        promptFr: 'Je ___ (think) à changer de travail ces temps-ci.',
        answer: 'am thinking',
        acceptedAnswers: ["'m thinking"],
        explanation:
          '"Think" is dynamic here ("considering"), and "these days" is temporary → present continuous.',
        explanationFr:
          '"Think" est ici dynamique ("envisager"), et "these days" est temporaire → présent continu.',
      },
      {
        type: 'mcq',
        prompt: 'Pick the most natural sentence for an arrangement.',
        promptFr: 'Choisis la phrase la plus naturelle pour un rendez-vous.',
        options: [
          "I have lunch with the CEO tomorrow.",
          "I'm having lunch with the CEO tomorrow.",
          "I will have lunch with the CEO tomorrow probably.",
          "I do have lunch with the CEO tomorrow.",
        ],
        answer: 1,
        explanation:
          'Fixed personal arrangement → present continuous is the most natural in everyday English.',
        explanationFr:
          'Rendez-vous personnel fixé → le présent continu est le plus naturel.',
      },
    ],
  },

  {
    id: 'past-simple-vs-continuous',
    name: 'Past simple vs past continuous',
    nameFr: 'Prétérit simple vs prétérit continu',
    level: 'B1',
    blurb:
      'A finished past action vs an action that was in progress when something else happened.',
    blurbFr:
      'Une action passée terminée vs une action qui était en cours quand autre chose s\'est passé.',
    rule: `**Past simple** ("I worked / she wrote") — for finished past actions, especially with a clear time marker (yesterday, in 2019, last week, on Monday).

**Past continuous** ("I was working / she was writing") — for actions that were IN PROGRESS at a past moment, or that were interrupted by another action.

The classic combo: *I was reading when she called.* — past continuous (the long ongoing action) + past simple (the short interrupting action).`,
    ruleFr: `**Prétérit simple** ("I worked / she wrote") — pour les actions passées terminées, surtout avec un marqueur de temps clair (yesterday, in 2019, last week, on Monday).

**Prétérit continu** ("I was working / she was writing") — pour les actions qui étaient EN COURS à un moment passé, ou qui ont été interrompues par une autre action.

La combinaison classique : *I was reading when she called.* — prétérit continu (longue action en cours) + prétérit simple (action courte qui interrompt).`,
    examples: [
      {
        en: 'I called her yesterday afternoon.',
        fr: 'Je l\'ai appelée hier après-midi.',
        note: 'Finished action with a time marker → past simple.',
        noteFr: 'Action terminée avec marqueur → prétérit simple.',
      },
      {
        en: 'I was cooking dinner when the phone rang.',
        fr: 'Je faisais à dîner quand le téléphone a sonné.',
        note: 'Long action in progress + short interruption.',
        noteFr: 'Action longue en cours + interruption courte.',
      },
      {
        en: 'At 8 pm last night, I was watching the game.',
        note: 'Action in progress at a specific past moment → past continuous.',
        noteFr: 'Action en cours à un moment passé précis → prétérit continu.',
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: 'When the alarm ___ (ring), I was already in the kitchen.',
        promptFr: "Quand l'alarme ___ (ring), j'étais déjà dans la cuisine.",
        answer: 'rang',
        explanation: 'Short interrupting action → past simple.',
        explanationFr: 'Action courte qui interrompt → prétérit simple.',
      },
      {
        type: 'fill',
        prompt: 'At midnight I ___ (still / work) on the deck.',
        promptFr: 'À minuit, je ___ (still / work) encore sur le deck.',
        answer: 'was still working',
        explanation: 'Action in progress at a past moment → past continuous.',
        explanationFr: 'Action en cours à un moment passé → prétérit continu.',
      },
      {
        type: 'fill',
        prompt: 'They ___ (have) dinner when the lights went out.',
        promptFr: 'Ils ___ (have) à dîner quand les lumières se sont éteintes.',
        answer: 'were having',
        explanation: 'Long ongoing action interrupted → past continuous.',
        explanationFr: 'Action longue interrompue → prétérit continu.',
      },
      {
        type: 'fill',
        prompt: 'In 2019 we ___ (move) to Berlin.',
        promptFr: 'En 2019, nous ___ (move) à Berlin.',
        answer: 'moved',
        explanation: 'Specific past time + finished event → past simple.',
        explanationFr: 'Temps passé précis + événement terminé → prétérit simple.',
      },
      {
        type: 'mcq',
        prompt: 'Pick the natural pair.',
        promptFr: 'Choisis la paire naturelle.',
        options: [
          'I wrote the report when my manager called.',
          'I was writing the report when my manager called.',
          'I was writing the report when my manager was calling.',
          'I wrote the report while my manager called.',
        ],
        answer: 1,
        explanation:
          'Long ongoing (writing) + short interruption (called) → past continuous + past simple.',
        explanationFr:
          'Longue action (writing) + interruption courte (called) → continu + simple.',
      },
      {
        type: 'fill',
        prompt: 'What ___ (you / do) at 6 pm yesterday?',
        promptFr: 'Que ___ (you / do) hier à 18h ?',
        answer: 'were you doing',
        explanation:
          'Asking about an action in progress at a past moment → past continuous.',
        explanationFr:
          "On demande l'action en cours à un moment passé → prétérit continu.",
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence is wrong?',
        promptFr: 'Quelle phrase est incorrecte ?',
        options: [
          'While I was cooking, the doorbell rang.',
          'I saw her when I went to the supermarket.',
          'They were watching TV at 9 last night.',
          'I was finishing the report and sent it.',
        ],
        answer: 3,
        explanation:
          'Two finished sequential actions → both should be past simple: "I finished the report and sent it."',
        explanationFr:
          'Deux actions terminées en séquence → tout au prétérit simple : "I finished the report and sent it."',
      },
      {
        type: 'fill',
        prompt: 'She ___ (drive) to work when it started snowing.',
        promptFr: 'Elle ___ (drive) au travail quand il a commencé à neiger.',
        answer: 'was driving',
        explanation:
          'Action in progress when something else happened → past continuous.',
        explanationFr:
          "Action en cours quand autre chose se passe → prétérit continu.",
      },
      {
        type: 'fill',
        prompt: 'Last summer we ___ (visit) my grandparents twice.',
        promptFr: "L'été dernier, nous ___ (visit) mes grands-parents deux fois.",
        answer: 'visited',
        explanation:
          'Specific past time, finished action with a count → past simple.',
        explanationFr:
          'Temps passé précis, action terminée avec un nombre → prétérit simple.',
      },
      {
        type: 'mcq',
        prompt: 'Most natural for "background scene" in a story:',
        promptFr: 'Le plus naturel pour une "scène de fond" dans une histoire :',
        options: [
          'The sun shone, the birds sang, and people walked in the park.',
          'The sun was shining, the birds were singing, and people were walking in the park.',
          'The sun has shone, the birds have sung, and people walked in the park.',
          'The sun shines, the birds sing, and people walk in the park.',
        ],
        answer: 1,
        explanation:
          'Background scene-setting in a past narrative → past continuous on all three.',
        explanationFr:
          "Description d'arrière-plan dans un récit passé → prétérit continu pour les trois.",
      },
    ],
  },

  {
    id: 'past-simple-vs-present-perfect',
    name: 'Past simple vs present perfect',
    nameFr: 'Prétérit simple vs present perfect',
    level: 'B1',
    blurb:
      "The hardest pair for French speakers: when the past action's time matters vs when only its present effect matters.",
    blurbFr:
      "La paire la plus difficile pour les francophones : quand le moment de l'action compte vs quand seul son effet présent compte.",
    rule: `**Past simple** ("I worked yesterday") — for actions tied to a SPECIFIC FINISHED time period (yesterday, in 2020, last week, when I was a student).

**Present perfect** ("I have worked here for 3 years") — for actions in an UNFINISHED time period, or with present relevance, or no time mentioned at all.

Key triggers for present perfect: *ever, never, already, yet, just, since, for, today, this week, this year* (when the period isn't yet over), *recently*.

Common French speaker error: *"I have seen him yesterday"* — wrong, "yesterday" is finished → use past simple: *"I saw him yesterday"*.`,
    ruleFr: `**Prétérit simple** ("I worked yesterday") — pour les actions liées à une période passée TERMINÉE et précise (yesterday, in 2020, last week, when I was a student).

**Present perfect** ("I have worked here for 3 years") — pour les actions dans une période NON TERMINÉE, avec une pertinence présente, ou sans temps mentionné.

Déclencheurs clés du present perfect : *ever, never, already, yet, just, since, for, today, this week, this year* (quand la période n'est pas finie), *recently*.

Erreur classique des francophones : *"I have seen him yesterday"* — faux, "yesterday" est terminé → prétérit simple : *"I saw him yesterday"*.`,
    examples: [
      {
        en: 'I saw her last Tuesday.',
        fr: 'Je l\'ai vue mardi dernier.',
        note: '"Last Tuesday" is a finished moment → past simple.',
        noteFr: '"Last Tuesday" est terminé → prétérit simple.',
      },
      {
        en: "I have seen her three times this month.",
        fr: 'Je l\'ai vue trois fois ce mois-ci.',
        note: '"This month" is unfinished → present perfect.',
        noteFr: '"This month" n\'est pas terminé → present perfect.',
      },
      {
        en: 'Have you ever been to Tokyo?',
        fr: 'Es-tu déjà allé à Tokyo ?',
        note: 'Life experience, no specific time → present perfect.',
        noteFr: 'Expérience de vie, sans temps précis → present perfect.',
      },
      {
        en: "I've worked here for 5 years.",
        note: 'Started in the past, still true now → present perfect.',
        noteFr: "Commencé dans le passé, toujours vrai → present perfect.",
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: 'I ___ (live) in Paris from 2010 to 2015.',
        promptFr: "J'___ (live) à Paris de 2010 à 2015.",
        answer: 'lived',
        explanation: 'Finished period in the past → past simple.',
        explanationFr: 'Période passée terminée → prétérit simple.',
      },
      {
        type: 'fill',
        prompt: 'I ___ (live) in Berlin since 2020.',
        promptFr: "J'___ (live) à Berlin depuis 2020.",
        answer: 'have lived',
        acceptedAnswers: ["'ve lived", 'have been living'],
        explanation:
          'Started in the past, still true now → present perfect (with "since").',
        explanationFr:
          'Commencé dans le passé, toujours vrai → present perfect (avec "since").',
      },
      {
        type: 'fill',
        prompt: 'She ___ (already / send) the report.',
        promptFr: 'Elle ___ (already / send) le rapport.',
        answer: 'has already sent',
        explanation: '"Already" + recent action → present perfect.',
        explanationFr: '"Already" + action récente → present perfect.',
      },
      {
        type: 'fill',
        prompt: 'When I was a student, I ___ (work) at a café.',
        promptFr: 'Quand j\'étais étudiant, je ___ (work) dans un café.',
        answer: 'worked',
        explanation:
          '"When I was a student" is a finished period → past simple.',
        explanationFr:
          '"When I was a student" est une période terminée → prétérit simple.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence has the wrong tense?',
        promptFr: 'Quelle phrase a le mauvais temps ?',
        options: [
          'I have visited Tokyo three times.',
          'I have seen her yesterday.',
          'She has worked here since 2018.',
          "We've never been to Italy.",
        ],
        answer: 1,
        explanation:
          '"Yesterday" is a finished moment → use past simple: "I saw her yesterday".',
        explanationFr:
          '"Yesterday" est terminé → prétérit simple : "I saw her yesterday".',
      },
      {
        type: 'fill',
        prompt: '___ you ever ___ (eat) sushi?',
        promptFr: '___ déjà ___ (eat) des sushis ?',
        answer: 'have / eaten',
        acceptedAnswers: ['Have / eaten', 'have eaten'],
        explanation: '"Ever" + life experience → present perfect.',
        explanationFr: '"Ever" + expérience de vie → present perfect.',
      },
      {
        type: 'fill',
        prompt: 'We ___ (not / finish) the project yet.',
        promptFr: "Nous ___ (not / finish) le projet pour le moment.",
        answer: "haven't finished",
        acceptedAnswers: ['have not finished'],
        explanation: '"Yet" → present perfect (negative).',
        explanationFr: '"Yet" → present perfect (négatif).',
      },
      {
        type: 'fill',
        prompt: 'The CEO ___ (just / arrive). Want me to introduce you?',
        promptFr: 'Le CEO ___ (just / arrive). Tu veux que je te présente ?',
        answer: 'has just arrived',
        explanation:
          '"Just" + recent event with present relevance → present perfect.',
        explanationFr:
          '"Just" + événement récent avec pertinence présente → present perfect.',
      },
      {
        type: 'mcq',
        prompt: 'Pick the natural sentence.',
        promptFr: 'Choisis la phrase naturelle.',
        options: [
          'I have written that email last night.',
          'I wrote that email last night.',
          'I am writing that email last night.',
          'I write that email last night.',
        ],
        answer: 1,
        explanation:
          '"Last night" is a finished time → past simple "wrote".',
        explanationFr:
          '"Last night" est terminé → prétérit simple "wrote".',
      },
      {
        type: 'fill',
        prompt: 'How many emails ___ you ___ (send) today?',
        promptFr: "Combien d'emails ___ aujourd'hui ?",
        answer: 'have / sent',
        acceptedAnswers: ['Have / sent'],
        explanation:
          '"Today" can still be in progress → present perfect.',
        explanationFr:
          '"Today" peut encore être en cours → present perfect.',
      },
    ],
  },

  /* ============================== B2 ============================== */
  {
    id: 'present-perfect-vs-continuous',
    name: 'Present perfect vs present perfect continuous',
    nameFr: 'Present perfect vs present perfect continu',
    level: 'B2',
    blurb:
      'Same starting point, different focus: result and quantity vs duration and ongoing process.',
    blurbFr:
      'Même point de départ, focus différent : résultat et quantité vs durée et processus en cours.',
    rule: `**Present perfect** ("I have worked / I have written 3 reports") — focuses on the RESULT or the QUANTITY achieved. The action might be finished or still ongoing, but what matters is what's been completed.

**Present perfect continuous** ("I have been working / I have been writing all morning") — focuses on the DURATION or the ONGOING NATURE. Often used to explain a present situation: "I'm tired because I've been running."

Both can use *for* and *since*. With state verbs (know, like, own), only the simple form works.`,
    ruleFr: `**Present perfect** ("I have worked / I have written 3 reports") — met l'accent sur le RÉSULTAT ou la QUANTITÉ. L'action peut être terminée ou en cours, ce qui compte c'est ce qui est accompli.

**Present perfect continu** ("I have been working / I have been writing all morning") — met l'accent sur la DURÉE ou le PROCESSUS EN COURS. Souvent utilisé pour expliquer une situation présente : "I'm tired because I've been running."

Les deux peuvent prendre *for* et *since*. Avec les verbes d'état (know, like, own), seul le simple fonctionne.`,
    examples: [
      {
        en: "I've written three emails this morning.",
        note: 'Quantity achieved → simple.',
        noteFr: 'Quantité accomplie → simple.',
      },
      {
        en: "I've been writing emails all morning.",
        note: 'Duration / ongoing → continuous.',
        noteFr: 'Durée / en cours → continu.',
      },
      {
        en: "She's known him for years.",
        note: 'State verb → only simple is possible.',
        noteFr: "Verbe d'état → seul le simple est possible.",
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: 'I ___ (read) this book three times.',
        promptFr: 'J\'___ (read) ce livre trois fois.',
        answer: 'have read',
        explanation: 'Quantity ("three times") → present perfect simple.',
        explanationFr: 'Quantité → present perfect simple.',
      },
      {
        type: 'fill',
        prompt: 'My eyes hurt — I ___ (read) for hours.',
        promptFr: "J'ai mal aux yeux — je ___ (read) depuis des heures.",
        answer: 'have been reading',
        acceptedAnswers: ["'ve been reading"],
        explanation: 'Duration that explains a present state → continuous.',
        explanationFr: 'Durée qui explique un état présent → continu.',
      },
      {
        type: 'fill',
        prompt: 'How long ___ you ___ (work) on this project?',
        promptFr: 'Depuis combien de temps ___ sur ce projet ?',
        answer: 'have / been working',
        explanation: '"How long" + ongoing process → continuous.',
        explanationFr: '"How long" + processus en cours → continu.',
      },
      {
        type: 'fill',
        prompt: "She's tired because she ___ (run) all afternoon.",
        promptFr: "Elle est fatiguée car elle ___ (run) tout l'après-midi.",
        answer: 'has been running',
        explanation: 'Cause of present state → continuous.',
        explanationFr: 'Cause d\'un état présent → continu.',
      },
      {
        type: 'fill',
        prompt: 'I ___ (know) the answer since this morning.',
        promptFr: 'Je ___ (know) la réponse depuis ce matin.',
        answer: 'have known',
        acceptedAnswers: ["'ve known"],
        explanation: '"Know" is stative → only the simple works.',
        explanationFr: '"Know" est un verbe d\'état → seul le simple fonctionne.',
      },
      {
        type: 'mcq',
        prompt: 'Which best emphasises a completed achievement?',
        promptFr: 'Lequel met le mieux en avant un accomplissement ?',
        options: [
          'She has been finishing the marathon.',
          'She finished the marathon.',
          "She's finished the marathon.",
          "She's been finishing the marathon for hours.",
        ],
        answer: 2,
        explanation:
          'Completion → present perfect simple. "Has been finishing" doesn\'t make sense for a one-shot achievement.',
        explanationFr:
          'Accomplissement → present perfect simple. "Has been finishing" n\'a pas de sens pour un événement ponctuel.',
      },
      {
        type: 'fill',
        prompt: 'They ___ (live) here for ten years and still love it.',
        promptFr: 'Ils ___ (live) ici depuis dix ans et adorent toujours.',
        answer: 'have lived',
        acceptedAnswers: ["'ve lived", 'have been living'],
        explanation:
          'Both are accepted with "live" + duration; the simple is slightly more common when the duration alone is the point.',
        explanationFr:
          'Les deux sont acceptés avec "live" + durée ; le simple est légèrement plus fréquent quand seule la durée compte.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence is wrong?',
        promptFr: 'Quelle phrase est fausse ?',
        options: [
          "I've been writing 50 emails today.",
          "I've written 50 emails today.",
          "I've been working all morning.",
          "I've finished the deck.",
        ],
        answer: 0,
        explanation:
          'Quantity ("50 emails") needs the simple: "I\'ve written 50 emails today."',
        explanationFr:
          'Quantité ("50 emails") demande le simple : "I\'ve written 50 emails today."',
      },
      {
        type: 'fill',
        prompt: 'My boots are muddy — I ___ (walk) in the park.',
        promptFr: "Mes bottes sont boueuses — je ___ (walk) dans le parc.",
        answer: 'have been walking',
        acceptedAnswers: ["'ve been walking"],
        explanation:
          'Recent ongoing activity that explains the present state → continuous.',
        explanationFr:
          'Activité récente en cours qui explique l\'état présent → continu.',
      },
      {
        type: 'mcq',
        prompt: "Most natural for: 'we are still in the middle of something':",
        promptFr: "Le plus naturel pour 'nous sommes encore en plein milieu' :",
        options: [
          "We've prepared the launch since Monday.",
          "We've been preparing the launch since Monday.",
          'We prepare the launch since Monday.',
          'We are preparing the launch since Monday.',
        ],
        answer: 1,
        explanation:
          'Ongoing process that started in the past → present perfect continuous.',
        explanationFr:
          'Processus en cours commencé dans le passé → present perfect continu.',
      },
    ],
  },

  {
    id: 'past-perfect-when',
    name: 'Past perfect — when to use it',
    nameFr: 'Past perfect — quand l\'utiliser',
    level: 'B2',
    blurb:
      'When you need "had + V-ed" instead of just past — to make the order of two past events crystal clear.',
    blurbFr:
      'Quand utiliser "had + V-ed" au lieu du simple passé — pour clarifier l\'ordre de deux événements passés.',
    rule: `Use the **past perfect** ("had + V-ed") for events that happened BEFORE another past event you're already describing. The past perfect makes the order of events explicit.

Trigger phrases: *by the time…, before…, after…, when… already, until that point*.

If the order is obvious from context (like "before"), some natives drop the past perfect, but using it correctly is the marker of a careful writer.`,
    ruleFr: `On utilise le **past perfect** ("had + V-ed") pour des événements qui se sont passés AVANT un autre événement passé déjà mentionné. Il rend l'ordre explicite.

Déclencheurs : *by the time…, before…, after…, when… already, until that point*.

Si l'ordre est évident (comme avec "before"), certains natifs sautent le past perfect, mais l'utiliser correctement est le signe d'un écrivain soigné.`,
    examples: [
      {
        en: 'When I arrived, the meeting had already started.',
        fr: 'Quand je suis arrivé, la réunion avait déjà commencé.',
        note: 'Two past events; the meeting started FIRST → past perfect.',
        noteFr: 'Deux événements passés ; la réunion a commencé EN PREMIER.',
      },
      {
        en: 'She told me she had finished the prototype.',
        fr: 'Elle m\'a dit qu\'elle avait terminé le prototype.',
        note: 'Reported speech, sequence of past events.',
        noteFr: 'Discours rapporté, séquence d\'événements passés.',
      },
      {
        en: 'I went home after the demo ended.',
        fr: 'Je suis rentré après la démo.',
        note: 'Two past events with "after" — order is obvious, simple past is fine.',
        noteFr: 'Deux événements avec "after" — l\'ordre est évident, le prétérit suffit.',
      },
    ],
    drills: [
      {
        type: 'mcq',
        prompt: 'By the time we arrived, the film ___.',
        promptFr: 'Quand nous sommes arrivés, le film ___.',
        options: ['started', 'has started', 'had started', 'was starting'],
        answer: 2,
        explanation: 'Past perfect marks the action completed BEFORE another past action.',
        explanationFr: 'Le past perfect marque l\'action terminée AVANT une autre action passée.',
      },
      {
        type: 'fill',
        prompt: 'When I checked, the team ___ (already / ship) the fix.',
        promptFr: 'Quand j\'ai vérifié, l\'équipe ___ (already / ship) le correctif.',
        answer: 'had already shipped',
        explanation: 'Two past events; the shipping happened first → "had shipped".',
        explanationFr: 'Deux événements ; le ship est arrivé en premier → "had shipped".',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence misuses the past perfect?',
        promptFr: 'Quelle phrase utilise mal le past perfect ?',
        options: [
          'She told me she had read the report twice.',
          'Before he joined Figma, he had worked at Airbnb.',
          'I had eaten lunch at noon yesterday.',
          'When the demo started, I had already taken my seat.',
        ],
        answer: 2,
        explanation:
          '"I had eaten lunch at noon yesterday" — no second past event to anchor before. Use "I ate lunch at noon".',
        explanationFr:
          '"I had eaten lunch at noon yesterday" — pas de second événement passé. Utilise "I ate lunch at noon".',
      },
      {
        type: 'mcq',
        prompt: 'Pick the natural sequence.',
        promptFr: 'Choisis la séquence naturelle.',
        options: [
          'The CEO left before I had finished my pitch.',
          'The CEO had left before I finished my pitch.',
          'The CEO left before I finish my pitch.',
          'The CEO has left before I had finished my pitch.',
        ],
        answer: 1,
        explanation:
          'CEO leaves first → past perfect. Pitch finishes after → simple past.',
        explanationFr:
          'Le CEO part en premier → past perfect. Le pitch finit après → prétérit.',
      },
      {
        type: 'fill',
        prompt: 'I realised I ___ (leave) my laptop at the café.',
        promptFr: "Je me suis rendu compte que j'___ (leave) mon ordi au café.",
        answer: 'had left',
        explanation:
          'The forgetting happened before the realising → past perfect.',
        explanationFr:
          "L'oubli a eu lieu avant la prise de conscience → past perfect.",
      },
      {
        type: 'fill',
        prompt: 'She ___ (never / fly) before she moved to New York.',
        promptFr: "Elle ___ (never / fly) avant de déménager à New York.",
        answer: 'had never flown',
        explanation: '"Before" + completed past experience → past perfect.',
        explanationFr: '"Before" + expérience passée terminée → past perfect.',
      },
      {
        type: 'mcq',
        prompt: 'Which sentence sounds most native?',
        promptFr: 'Quelle phrase sonne la plus naturelle ?',
        options: [
          'After I finished the report, I sent it to the team.',
          'After I had finished the report, I sent it to the team.',
          'Both are correct — natives use either.',
          'Neither is correct.',
        ],
        answer: 2,
        explanation:
          'With "after" the order is already clear, so both work. Natives use either depending on rhythm.',
        explanationFr:
          'Avec "after" l\'ordre est clair, donc les deux marchent. Les natifs alternent selon le rythme.',
      },
      {
        type: 'fill',
        prompt: 'By 6pm, the team ___ (close) every ticket.',
        promptFr: 'À 18h, l\'équipe ___ (close) tous les tickets.',
        answer: 'had closed',
        explanation: '"By 6pm" + completion before that point → past perfect.',
        explanationFr: '"By 6pm" + accomplissement avant ce point → past perfect.',
      },
      {
        type: 'fill',
        prompt: 'When the bug appeared in production, no one ___ (test) the new flow.',
        promptFr: 'Quand le bug est apparu en prod, personne ___ (test) le nouveau flow.',
        answer: 'had tested',
        explanation:
          'Two past events; the (lack of) testing happened before the bug → past perfect.',
        explanationFr:
          'Deux événements ; l\'absence de test précède le bug → past perfect.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence is wrong?',
        promptFr: 'Quelle phrase est fausse ?',
        options: [
          'When I called, she had already left for the airport.',
          'I had visited Tokyo last summer.',
          'They had never met before that conference.',
          'By the time we noticed, the deadline had passed.',
        ],
        answer: 1,
        explanation:
          '"Last summer" is a completed past time → past simple. "I visited Tokyo last summer."',
        explanationFr:
          '"Last summer" est un temps passé terminé → prétérit. "I visited Tokyo last summer."',
      },
    ],
  },

  {
    id: 'future-expressions',
    name: 'Future expressions: will / going to / present continuous',
    nameFr: 'Expressions du futur : will / going to / présent continu',
    level: 'B1',
    blurb:
      'Three ways to talk about the future, each with its own job. Mixing them up is a B1 hallmark — getting them right is a B2 marker.',
    blurbFr:
      'Trois façons de parler du futur, chacune avec son rôle. Les confondre est typique du B1 ; les maîtriser marque le B2.',
    rule: `**Will** — for spontaneous decisions, predictions based on opinion, promises, offers. *I'll get the door. / It will probably rain.*

**Going to** — for plans already decided before speaking, or predictions based on PRESENT EVIDENCE. *I'm going to start a side project. / Look at those clouds — it's going to rain.*

**Present continuous** — for fixed personal arrangements with a specific time/person. *I'm meeting Sarah at 5. / We're flying to Tokyo on Tuesday.*`,
    ruleFr: `**Will** — pour les décisions spontanées, les prédictions basées sur une opinion, les promesses, les offres. *I'll get the door. / It will probably rain.*

**Going to** — pour les plans déjà décidés avant de parler, ou les prédictions basées sur des INDICES PRÉSENTS. *I'm going to start a side project. / Look at those clouds — it's going to rain.*

**Présent continu** — pour les rendez-vous personnels fixés avec un horaire/personne précise. *I'm meeting Sarah at 5. / We're flying to Tokyo on Tuesday.*`,
    examples: [
      {
        en: 'The phone is ringing — I\'ll get it.',
        fr: 'Le téléphone sonne — je réponds.',
        note: 'Spontaneous decision → will.',
        noteFr: 'Décision spontanée → will.',
      },
      {
        en: 'I\'m going to learn Japanese this year.',
        fr: 'Je vais apprendre le japonais cette année.',
        note: 'Plan decided before speaking → going to.',
        noteFr: 'Plan décidé avant de parler → going to.',
      },
      {
        en: 'We\'re having dinner with the CEO on Friday.',
        fr: 'On dîne avec le CEO vendredi.',
        note: 'Fixed arrangement → present continuous.',
        noteFr: 'Rendez-vous fixé → présent continu.',
      },
      {
        en: "Look at the sky — it's going to rain.",
        note: 'Prediction with present evidence → going to.',
        noteFr: 'Prédiction avec indices présents → going to.',
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: "I'm thirsty — I ___ (get) some water.",
        promptFr: "J'ai soif — je ___ (get) de l'eau.",
        answer: "'ll get",
        acceptedAnswers: ['will get'],
        explanation: 'Spontaneous decision in the moment → will.',
        explanationFr: 'Décision spontanée dans l\'instant → will.',
      },
      {
        type: 'fill',
        prompt: "Look out — that vase ___ (fall)!",
        promptFr: "Attention — ce vase ___ (fall) !",
        answer: 'is going to fall',
        acceptedAnswers: ["'s going to fall"],
        explanation:
          'Prediction based on what you can see right now → going to.',
        explanationFr:
          'Prédiction basée sur ce qu\'on voit maintenant → going to.',
      },
      {
        type: 'fill',
        prompt: "We ___ (meet) the new designer at 3pm tomorrow.",
        promptFr: "Nous ___ (meet) la nouvelle designer demain à 15h.",
        answer: "'re meeting",
        acceptedAnswers: ['are meeting'],
        explanation:
          'Fixed personal arrangement with time → present continuous.',
        explanationFr:
          'Rendez-vous personnel fixé avec horaire → présent continu.',
      },
      {
        type: 'fill',
        prompt: "I think AI ___ (change) every job in the next decade.",
        promptFr: "Je pense que l'IA ___ (change) tous les métiers dans la prochaine décennie.",
        answer: 'will change',
        explanation:
          'General prediction based on opinion → will.',
        explanationFr:
          'Prédiction générale basée sur une opinion → will.',
      },
      {
        type: 'mcq',
        prompt: 'Which is most natural?',
        promptFr: 'Quelle phrase est la plus naturelle ?',
        options: [
          'I think I will start running every morning.',
          "I think I'm starting running every morning.",
          "I'm going to start running every morning — I've already bought new shoes.",
          'I start running every morning, I think.',
        ],
        answer: 2,
        explanation:
          'Plan already decided + evidence → going to. (Will would also work for a less concrete plan.)',
        explanationFr:
          'Plan décidé + indice (chaussures achetées) → going to.',
      },
      {
        type: 'fill',
        prompt: "Don't worry, I ___ (help) you with the slides.",
        promptFr: "T'inquiète, je ___ (help) avec les slides.",
        answer: "'ll help",
        acceptedAnswers: ['will help'],
        explanation: 'Offer of help → will.',
        explanationFr: 'Offre d\'aide → will.',
      },
      {
        type: 'fill',
        prompt: 'My flight ___ (leave) at 7am on Saturday.',
        promptFr: 'Mon vol ___ (leave) à 7h samedi.',
        answer: 'leaves',
        explanation:
          'Scheduled timetable (flights, trains) → present simple is the natural choice.',
        explanationFr:
          'Horaire fixé (vols, trains) → le présent simple est le plus naturel.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence sounds wrong?',
        promptFr: 'Quelle phrase sonne fausse ?',
        options: [
          "I'm meeting my therapist tomorrow at 6.",
          "Don't worry, I'll send the email later.",
          "Look at the queue — we will wait for ages.",
          "I'm going to redesign the homepage next quarter.",
        ],
        answer: 2,
        explanation:
          'Prediction based on present evidence (the queue) → "we are going to wait for ages."',
        explanationFr:
          'Prédiction basée sur des indices (la queue) → "we are going to wait for ages."',
      },
      {
        type: 'fill',
        prompt: 'Hold on, I ___ (call) you back in 5 minutes.',
        promptFr: 'Attends, je te ___ (call) dans 5 minutes.',
        answer: "'ll call",
        acceptedAnswers: ['will call'],
        explanation: 'Promise / spontaneous arrangement → will.',
        explanationFr: 'Promesse / arrangement spontané → will.',
      },
      {
        type: 'mcq',
        prompt: 'Best for "I have a planned trip on these specific dates":',
        promptFr: 'Le mieux pour "j\'ai un voyage prévu à ces dates précises" :',
        options: [
          "I will fly to Berlin on the 12th and come back on the 19th.",
          "I'm flying to Berlin on the 12th and coming back on the 19th.",
          "I'm going to fly to Berlin on the 12th and going to come back on the 19th.",
          "I fly to Berlin on the 12th and come back on the 19th.",
        ],
        answer: 1,
        explanation:
          'Booked travel arrangement with specific dates → present continuous is the most natural.',
        explanationFr:
          'Voyage réservé avec dates précises → le présent continu est le plus naturel.',
      },
    ],
  },

  /* ============================== B2 ============================== */
  {
    id: 'stative-vs-dynamic',
    name: 'Stative vs dynamic verbs',
    nameFr: 'Verbes d\'état vs verbes d\'action',
    level: 'B2',
    blurb:
      'Stative verbs (know, like, want, believe) avoid the continuous form even when "right now" feels right.',
    blurbFr:
      'Les verbes d\'état (know, like, want, believe) évitent la forme en -ing même quand "maintenant" semble juste.',
    rule: `**Stative verbs** describe a state, not an action: *know, believe, understand, like, love, hate, want, need, prefer, own, belong, contain, seem, mean*. They normally stay in the **simple form**, even when you're talking about right now.

A few verbs swap meaning between stative and dynamic:
- *think* (= believe, stative) vs *think* (= consider, dynamic): "I think you're right" vs "I'm thinking about it."
- *have* (= own, stative) vs *have* (action, dynamic): "I have a car" vs "I'm having lunch."
- *see* (= perceive, stative) vs *see* (= meet, dynamic): "I see your point" vs "I'm seeing the doctor on Tuesday."`,
    ruleFr: `**Les verbes d'état** décrivent un état, pas une action : *know, believe, understand, like, love, hate, want, need, prefer, own, belong, contain, seem, mean*. Ils restent au **simple**, même pour parler du moment présent.

Quelques verbes changent de sens selon stative/dynamic :
- *think* (= croire, stative) vs *think* (= réfléchir, dynamic) : "I think you're right" vs "I'm thinking about it."
- *have* (= posséder, stative) vs *have* (action, dynamic) : "I have a car" vs "I'm having lunch."
- *see* (= percevoir, stative) vs *see* (= rencontrer, dynamic) : "I see your point" vs "I'm seeing the doctor on Tuesday."`,
    examples: [
      {
        en: 'I know what you mean.',
        note: '"Know" + "mean" both stative → simple.',
        noteFr: '"Know" et "mean" stative → simple.',
      },
      {
        en: "I'm thinking about your offer.",
        note: '"Think" = consider, dynamic → continuous OK.',
        noteFr: '"Think" = réfléchir, dynamic → continu OK.',
      },
      {
        en: "We're having a great time.",
        note: '"Have" = experience, dynamic → continuous OK.',
        noteFr: '"Have" = passer un moment, dynamic → continu OK.',
      },
    ],
    drills: [
      {
        type: 'fill',
        prompt: 'I ___ (love) this song!',
        promptFr: "J'___ (love) cette chanson !",
        answer: 'love',
        explanation: '"Love" is stative → simple form even for the moment.',
        explanationFr: '"Love" est stative → forme simple même pour l\'instant.',
      },
      {
        type: 'fill',
        prompt: 'Sorry, I ___ (not / understand) what you mean.',
        promptFr: "Désolé, je ___ (not / understand) ce que tu veux dire.",
        answer: "don't understand",
        acceptedAnswers: ['do not understand'],
        explanation: '"Understand" is stative → simple, never continuous.',
        explanationFr: '"Understand" est stative → simple, jamais continu.',
      },
      {
        type: 'fill',
        prompt: "We ___ (have) dinner — call me back later.",
        promptFr: "On ___ (have) à dîner — rappelle plus tard.",
        answer: 'are having',
        acceptedAnswers: ["'re having"],
        explanation: '"Have dinner" is dynamic (an action) → continuous.',
        explanationFr: '"Have dinner" est dynamic → continu.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence sounds wrong?',
        promptFr: 'Quelle phrase sonne fausse ?',
        options: [
          "I'm wanting that promotion badly.",
          "I'm having lunch right now.",
          "I'm thinking about your offer.",
          "I want that promotion badly.",
        ],
        answer: 0,
        explanation:
          '"Want" is stative → simple form: "I want that promotion badly."',
        explanationFr:
          '"Want" est stative → forme simple : "I want that promotion badly."',
      },
      {
        type: 'fill',
        prompt: "She ___ (own) three properties in Lisbon.",
        promptFr: 'Elle ___ (own) trois propriétés à Lisbonne.',
        answer: 'owns',
        explanation: '"Own" is purely stative → simple, never continuous.',
        explanationFr: '"Own" est purement stative → simple, jamais continu.',
      },
      {
        type: 'fill',
        prompt: 'He ___ (think) of changing careers next year.',
        promptFr: 'Il ___ (think) à changer de carrière l\'an prochain.',
        answer: 'is thinking',
        acceptedAnswers: ["'s thinking"],
        explanation: '"Think of/about" = consider, dynamic → continuous.',
        explanationFr: '"Think of/about" = envisager, dynamic → continu.',
      },
      {
        type: 'fill',
        prompt: "I ___ (see) what you mean — it makes sense now.",
        promptFr: "Je ___ (see) ce que tu veux dire — ça a du sens.",
        answer: 'see',
        explanation: '"See" = perceive/understand, stative → simple.',
        explanationFr: '"See" = comprendre, stative → simple.',
      },
      {
        type: 'fill',
        prompt: "I ___ (see) the doctor on Tuesday at 4.",
        promptFr: 'Je ___ (see) le médecin mardi à 16h.',
        answer: 'am seeing',
        acceptedAnswers: ["'m seeing"],
        explanation: '"See" = meet professionally, dynamic → continuous (also a future arrangement).',
        explanationFr: '"See" = rencontrer, dynamic → continu (aussi un rendez-vous futur).',
      },
      {
        type: 'mcq',
        prompt: 'Pick the natural sentence.',
        promptFr: 'Choisis la phrase naturelle.',
        options: [
          'This soup is tasting amazing.',
          'This soup tastes amazing.',
          'This soup tastes amazingly.',
          'This soup is taste amazing.',
        ],
        answer: 1,
        explanation: '"Taste" as a perception is stative → simple form.',
        explanationFr: '"Taste" comme perception est stative → forme simple.',
      },
      {
        type: 'spot-error',
        prompt: 'Which sentence has a stative verb misused?',
        promptFr: 'Dans quelle phrase un verbe d\'état est mal utilisé ?',
        options: [
          'I am hating this traffic.',
          "I'm enjoying my new role.",
          "I'm reading a great book.",
          "We're learning Italian together.",
        ],
        answer: 0,
        explanation: '"Hate" is stative → "I hate this traffic."',
        explanationFr: '"Hate" est stative → "I hate this traffic."',
      },
    ],
  },

  /* ============================== B2 — used to / would ============================== */
  {
    id: 'past-habits-used-to-would',
    name: 'Past habits: used to / would',
    nameFr: 'Habitudes passées : used to / would',
    level: 'B2',
    blurb:
      'Two ways to talk about regular past habits — and the trap French speakers fall into when picking between them.',
    blurbFr:
      'Deux façons de parler d\'habitudes passées régulières — et le piège des francophones pour choisir.',
    rule: `**used to + base verb** — past habit OR past STATE that no longer applies. Works for both actions and states.
*I used to smoke. (action) / I used to live in Paris. (state)*

**would + base verb** — past habit ONLY (not states). Best for repeated actions; usually appears after a "when" or "as a kid" frame.
*When I was a kid, I would spend hours drawing.*

**Critical**: "would" does NOT work with state verbs (be, have, know, like, live).
- ✓ *I used to live in Paris.*
- ✗ *I would live in Paris.* (wrong — "live" is a state)

Past simple ("I lived in Paris in 2010") works for one specific past period; "used to" emphasises the contrast with now.`,
    ruleFr: `**used to + verbe à la base** — habitude OU état passé qui n\'existe plus. Marche pour les actions et les états.
*I used to smoke. (action) / I used to live in Paris. (état)*

**would + verbe à la base** — habitude UNIQUEMENT (pas d\'état). Idéal pour les actions répétées ; vient souvent après "when" ou "as a kid".
*When I was a kid, I would spend hours drawing.*

**Crucial** : "would" ne marche PAS avec les verbes d\'état (be, have, know, like, live).
- ✓ *I used to live in Paris.*
- ✗ *I would live in Paris.* (faux — "live" est un état)

Le prétérit ("I lived in Paris in 2010") sert pour une période passée précise ; "used to" insiste sur le contraste avec maintenant.`,
    examples: [
      { en: 'I used to drink coffee black.', fr: 'Je buvais le café noir avant.', note: 'Past habit → "used to".', noteFr: 'Habitude passée → "used to".' },
      { en: 'When I was a student, I would study at cafés every weekend.', fr: 'Étudiant, je bossais dans les cafés chaque week-end.', note: 'Repeated action with "when" frame → "would".', noteFr: 'Action répétée avec contexte "when" → "would".' },
      { en: 'I used to be afraid of public speaking.', fr: "J'avais peur de parler en public avant.", note: 'STATE → "used to" only ("would be" is wrong).', noteFr: 'ÉTAT → "used to" seulement ("would be" est faux).' },
    ],
    drills: [
      { type: 'fill', prompt: 'When I was a kid, I ___ (would / spend) hours building Legos.', promptFr: 'Enfant, je ___ (would / spend) des heures à monter des Legos.', answer: 'would spend', explanation: 'Repeated action + "when" frame → "would spend".', explanationFr: 'Action répétée + contexte "when" → "would spend".' },
      { type: 'fill', prompt: 'I ___ (use to) live in Berlin before moving here.', promptFr: 'Je ___ (use to) vivre à Berlin avant de venir ici.', answer: 'used to', explanation: 'Past state → "used to" (NOT "would").', explanationFr: 'État passé → "used to" (PAS "would").' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ['I used to be shy.', 'When I was young, I would be shy.', 'When I was young, I would walk to school.', 'I used to walk to school.'], answer: 1, explanation: '"Would" doesn\'t work with state verbs like "be". Use "I used to be shy".', explanationFr: '"Would" ne marche pas avec les verbes d\'état comme "be". Utilise "I used to be shy".' },
      { type: 'fill', prompt: 'My grandfather ___ (would / tell) us bedtime stories every night.', promptFr: 'Mon grand-père nous ___ (would / tell) des histoires chaque soir.', answer: 'would tell', explanation: 'Repeated action → "would tell".', explanationFr: 'Action répétée → "would tell".' },
      { type: 'mcq', prompt: 'Which option is correct for both forms?', promptFr: 'Quelle option marche pour les deux formes ?', options: ['I used to / would smoke.', 'I used to / would have a beard.', 'I used to / would be tall.', 'I used to / would know him well.'], answer: 0, explanation: '"Smoke" is an action, so both work. The others are states/possession.', explanationFr: '"Smoke" est une action, les deux marchent. Les autres sont des états/possessions.' },
      { type: 'fill', prompt: 'I ___ (use to) hate olives, but now I love them.', promptFr: 'Je ___ (use to) détester les olives, mais maintenant je les adore.', answer: 'used to', explanation: 'State (hate) → "used to" only.', explanationFr: 'État (hate) → "used to" seulement.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I would have long hair when I was 20.', 'I used to have long hair when I was 20.', 'I have long hair when I was 20.', 'I had used long hair when I was 20.'], answer: 1, explanation: 'Possession ("have") is a state → "used to have".', explanationFr: 'Possession ("have") est un état → "used to have".' },
      { type: 'fill', prompt: 'Every Sunday, my mom ___ (would / cook) a roast.', promptFr: 'Chaque dimanche, ma mère ___ (would / cook) un rôti.', answer: 'would cook', explanation: 'Repeated weekly habit → "would cook".', explanationFr: 'Habitude hebdomadaire → "would cook".' },
      { type: 'spot-error', prompt: 'Which sentence misuses past habit forms?', promptFr: "Quelle phrase utilise mal les formes d'habitude passée ?", options: ['I used to drink three coffees a day.', "I'd take the bus when it rained.", 'I would know the answer to that.', "We'd visit my grandmother every Sunday."], answer: 2, explanation: '"Know" is stative — use "I used to know" (not "I would know").', explanationFr: '"Know" est stative — utilise "I used to know" (pas "I would know").' },
      { type: 'fill', prompt: 'When I worked there, we ___ (would / meet) every Friday for lunch.', promptFr: 'Quand je bossais là-bas, on ___ (would / meet) chaque vendredi pour le déj.', answer: 'would meet', acceptedAnswers: ['used to meet'], explanation: 'Repeated past meeting → both work; "would meet" emphasises ritual.', explanationFr: 'Réunion passée répétée → les deux marchent ; "would meet" insiste sur le rituel.' },
    ],
  },

  /* ============================== B2 — habit-in-progress: was always doing ============================== */
  {
    id: 'past-continuous-annoying-habit',
    name: 'Past continuous for annoying habits',
    nameFr: 'Prétérit continu pour habitudes agaçantes',
    level: 'B2',
    blurb:
      'A subtle B2/C1 use of past continuous: "She was always interrupting me." It signals annoyance, not just an action in progress.',
    blurbFr:
      'Un usage B2/C1 subtil du prétérit continu : "She was always interrupting me." Ça signale l\'agacement, pas juste une action en cours.',
    rule: `Past continuous ("was/were V-ing") usually describes an action in progress at a past moment. But there's a special use you'll spot in native speakers:

**was always / was constantly / was forever + V-ing** — describes a past habit the speaker found ANNOYING or excessive. The "always" carries emotional charge.

- *He was always losing his keys.* (= it kept happening, frustrating)
- *They were constantly arguing.* (= it was a pattern that bothered the speaker)

This is similar to "would + base" for past habits, but with an explicit emotional layer. "I used to" is neutral; "He was always V-ing" is loaded.

Don't confuse with the simple past continuous of one moment: *I was reading at 8 pm* (no annoyance).`,
    ruleFr: `Le prétérit continu ("was/were V-ing") décrit en général une action en cours à un moment passé. Mais il y a un usage spécial qu'on entend chez les natifs :

**was always / was constantly / was forever + V-ing** — décrit une habitude passée que le locuteur trouve AGAÇANTE ou excessive. Le "always" porte la charge émotionnelle.

- *He was always losing his keys.* (= ça arrivait sans cesse, frustrant)
- *They were constantly arguing.* (= c'était un pattern qui agaçait le locuteur)

Similaire à "would + base" pour les habitudes passées, mais avec une couche émotionnelle. "I used to" est neutre ; "He was always V-ing" est chargé.

À ne pas confondre avec un prétérit continu d'un moment précis : *I was reading at 8 pm* (pas d\'agacement).`,
    examples: [
      { en: 'My old manager was always cancelling our 1:1s.', fr: 'Mon ancien manager annulait sans arrêt nos 1:1.', note: 'Annoying habit → was + always + V-ing.', noteFr: 'Habitude agaçante → was + always + V-ing.' },
      { en: 'When we lived together, my flatmate was constantly leaving dishes in the sink.', fr: 'Quand on vivait ensemble, mon coloc laissait sans cesse la vaisselle dans l\'évier.', note: '"Constantly + V-ing" carries the irritation.', noteFr: '"Constantly + V-ing" porte l\'agacement.' },
      { en: 'I was reading when she called.', fr: 'Je lisais quand elle a appelé.', note: 'Different — single past moment, no annoyance.', noteFr: 'Différent — moment passé unique, pas d\'agacement.' },
    ],
    drills: [
      { type: 'fill', prompt: 'My ex-roommate ___ (always / leave) the door unlocked.', promptFr: 'Mon ex-coloc ___ (always / leave) la porte non verrouillée.', answer: 'was always leaving', explanation: 'Annoying past habit → "was always leaving".', explanationFr: 'Habitude passée agaçante → "was always leaving".' },
      { type: 'mcq', prompt: 'Pick the sentence that signals annoyance.', promptFr: 'Choisis la phrase qui exprime l\'agacement.', options: ['She used to call me every evening.', 'She would call me every evening.', 'She was always calling me late at night.', 'She called me every evening.'], answer: 2, explanation: '"Was always V-ing" carries an emotional charge of frustration.', explanationFr: '"Was always V-ing" porte une charge émotionnelle de frustration.' },
      { type: 'fill', prompt: 'When I was a teen, my mom ___ (always / tell) me to clean my room.', promptFr: 'Ado, ma mère me ___ (always / tell) de ranger ma chambre.', answer: 'was always telling', explanation: 'Repeated past action with annoyance → past continuous + always.', explanationFr: 'Action passée répétée avec agacement → prétérit continu + always.' },
      { type: 'spot-error', prompt: 'Which sentence is grammatically off?', promptFr: 'Quelle phrase est grammaticalement décalée ?', options: ['He was always losing his keys.', 'She was constantly checking her phone.', 'They were always argued.', 'My boss was forever asking for updates.'], answer: 2, explanation: 'Should be "were always arguing" — past continuous needs -ing form.', explanationFr: 'Il faut "were always arguing" — le prétérit continu prend -ing.' },
      { type: 'fill', prompt: 'My grandfather ___ (always / forget) where he put his glasses.', promptFr: 'Mon grand-père ___ (always / forget) où il avait mis ses lunettes.', answer: 'was always forgetting', explanation: 'Past annoying habit → was + always + V-ing.', explanationFr: 'Habitude passée agaçante → was + always + V-ing.' },
      { type: 'mcq', prompt: 'Most neutral past habit:', promptFr: 'Habitude passée la plus neutre :', options: ['She was always running late.', 'She used to run late.', 'She was running late.', 'She runs late.'], answer: 1, explanation: '"Used to" is neutral; "was always V-ing" carries irritation.', explanationFr: '"Used to" est neutre ; "was always V-ing" porte l\'irritation.' },
      { type: 'fill', prompt: 'They ___ (constantly / interrupt) each other in meetings.', promptFr: 'Ils ___ (constantly / interrupt) tout le temps en réunion.', answer: 'were constantly interrupting', explanation: '"Constantly + V-ing" signals annoying repetition.', explanationFr: '"Constantly + V-ing" signale une répétition agaçante.' },
      { type: 'spot-error', prompt: 'Which sentence misuses the pattern?', promptFr: 'Quelle phrase utilise mal le pattern ?', options: ['He was always asking for raises.', 'I was always reading novels back then.', 'She was always to interrupt me.', 'They were forever cancelling plans.'], answer: 2, explanation: 'Should be "She was always interrupting me" — gerund, not infinitive.', explanationFr: 'Il faut "She was always interrupting me" — gérondif, pas infinitif.' },
      { type: 'fill', prompt: 'The wifi at that office ___ (always / drop) during meetings.', promptFr: 'Le wifi à ce bureau ___ (always / drop) en réunion.', answer: 'was always dropping', explanation: 'Past annoyance → was + always + V-ing.', explanationFr: 'Agacement passé → was + always + V-ing.' },
      { type: 'mcq', prompt: 'Pick the most idiomatic complaint.', promptFr: 'Choisis la plainte la plus idiomatique.', options: ['He always lost his temper.', 'He was always losing his temper.', 'He has always lost his temper.', 'He used to lose his temper.'], answer: 1, explanation: 'Idiomatic complaint about a past habit → past continuous + always.', explanationFr: 'Plainte idiomatique sur habitude passée → prétérit continu + always.' },
    ],
  },

  /* ============================== B2 — future continuous ============================== */
  {
    id: 'future-continuous',
    name: 'Future continuous: will be doing',
    nameFr: 'Future continu : will be doing',
    level: 'B2',
    blurb:
      'Use "will be V-ing" for actions in progress at a future moment, or for polite enquiries about plans.',
    blurbFr:
      'Utilise "will be V-ing" pour des actions en cours à un moment futur, ou pour des questions polies sur les plans.',
    rule: `**Future continuous** ("will be + V-ing") — for an action that WILL BE IN PROGRESS at a specific future moment, or already arranged events.

Use 1 — action in progress at a future point: *This time tomorrow, I'll be flying to Tokyo.*

Use 2 — already-arranged plans (less personal than present continuous): *I'll be meeting the client on Tuesday.*

Use 3 — polite enquiry about plans (avoids sounding pushy): *Will you be coming to the offsite?* (gentler than "Are you coming?")

Compare:
- *I'll work on it.* (decision, will + base)
- *I'll be working on it from 9 to 5 tomorrow.* (in progress at that time)

The structure is: **subject + will + be + V-ing**.`,
    ruleFr: `**Future continu** ("will be + V-ing") — pour une action EN COURS à un moment futur précis, ou des événements déjà arrangés.

Usage 1 — action en cours à un moment futur : *This time tomorrow, I'll be flying to Tokyo.*

Usage 2 — plan déjà arrangé (moins personnel que le présent continu) : *I'll be meeting the client on Tuesday.*

Usage 3 — question polie sur des plans (évite d\'avoir l\'air pressant) : *Will you be coming to the offsite?* (plus doux que "Are you coming?")

Comparaison :
- *I'll work on it.* (décision, will + base)
- *I'll be working on it from 9 to 5 tomorrow.* (en cours à ce moment-là)

Structure : **sujet + will + be + V-ing**.`,
    examples: [
      { en: 'This time next week, I\'ll be lying on a beach.', fr: 'Dans une semaine, je serai allongé sur une plage.', note: 'Action in progress at a future point.', noteFr: 'Action en cours à un moment futur.' },
      { en: "I'll be presenting at 3pm tomorrow.", fr: 'Je présenterai à 15h demain.', note: 'Already-arranged future plan.', noteFr: 'Plan futur déjà arrangé.' },
      { en: 'Will you be using the meeting room at 10?', fr: 'Tu utiliseras la salle de réunion à 10h ?', note: 'Polite enquiry.', noteFr: 'Question polie.' },
    ],
    drills: [
      { type: 'fill', prompt: "This time tomorrow, I ___ (fly) to New York.", promptFr: "Dans 24h, je ___ (fly) pour New York.", answer: "will be flying", acceptedAnswers: ["'ll be flying"], explanation: 'Action in progress at a future moment → future continuous.', explanationFr: 'Action en cours à un moment futur → future continu.' },
      { type: 'fill', prompt: "I ___ (work) from home all day Friday.", promptFr: "Je ___ (work) de chez moi toute la journée vendredi.", answer: "will be working", acceptedAnswers: ["'ll be working"], explanation: 'Future arrangement spanning a period → future continuous.', explanationFr: 'Plan futur sur une période → future continu.' },
      { type: 'mcq', prompt: 'Most polite way to ask about plans:', promptFr: 'Façon la plus polie de demander un plan :', options: ['Are you coming to the dinner?', 'Will you come to the dinner?', 'Will you be coming to the dinner?', 'Do you come to the dinner?'], answer: 2, explanation: 'Future continuous in questions feels softer / more polite.', explanationFr: 'Le future continu en question est plus doux / poli.' },
      { type: 'fill', prompt: "Don't call at 3 — I ___ (have) my interview then.", promptFr: "N'appelle pas à 15h — je ___ (have) mon entretien à ce moment.", answer: "will be having", acceptedAnswers: ["'ll be having"], explanation: 'In progress at a future moment → future continuous.', explanationFr: 'En cours à un moment futur → future continu.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["I'll be presenting at 3pm tomorrow.", "She will work on the deck at 3pm tomorrow.", "Both work — 1 emphasises in-progress, 2 is more general.", "We'll be meeting clients all next week."], answer: 1, explanation: 'Sentence 2 is grammatically OK but for a specific future moment, "will be working" is more natural.', explanationFr: 'La phrase 2 est grammaticalement correcte, mais pour un moment futur précis, "will be working" est plus naturel.' },
      { type: 'fill', prompt: "Next month, my team ___ (run) a customer research sprint.", promptFr: "Le mois prochain, mon équipe ___ (run) un sprint de recherche utilisateur.", answer: "will be running", acceptedAnswers: ["'ll be running"], explanation: 'Planned future activity in progress → future continuous.', explanationFr: 'Activité future planifiée en cours → future continu.' },
      { type: 'mcq', prompt: 'Pick the natural sentence about a planned future.', promptFr: 'Choisis la phrase naturelle sur un futur planifié.', options: ["I'll attend the conference next week.", "I'll be attending the conference next week.", "I attend the conference next week.", "I will to attend the conference next week."], answer: 1, explanation: 'Already-arranged plan → future continuous "will be attending".', explanationFr: 'Plan déjà arrangé → future continu "will be attending".' },
      { type: 'fill', prompt: 'By 8pm tonight, the kids ___ (sleep) already.', promptFr: "À 20h ce soir, les enfants ___ (sleep) déjà.", answer: "will be sleeping", acceptedAnswers: ["'ll be sleeping"], explanation: 'In progress at a future moment → future continuous.', explanationFr: 'En cours à un moment futur → future continu.' },
      { type: 'mcq', prompt: 'Most natural for "asking if a colleague needs the printer at 4pm":', promptFr: "Le plus naturel pour 'demander si un collègue a besoin de l'imprimante à 16h' :", options: ['Will you use the printer at 4?', 'Will you be using the printer at 4?', 'Are you using the printer at 4?', 'Do you use the printer at 4?'], answer: 1, explanation: '"Will you be using" is the polite enquiry form.', explanationFr: '"Will you be using" est la forme polie de la question.' },
      { type: 'fill', prompt: 'In an hour, we ___ (drive) to the airport.', promptFr: "Dans une heure, on ___ (drive) à l'aéroport.", answer: "will be driving", acceptedAnswers: ["'ll be driving"], explanation: 'Action in progress at a future point → future continuous.', explanationFr: 'Action en cours à un moment futur → future continu.' },
    ],
  },

  /* ============================== C1 — future perfect ============================== */
  {
    id: 'future-perfect',
    name: 'Future perfect: will have done',
    nameFr: 'Future perfect : will have done',
    level: 'C1',
    blurb:
      'For events that will be COMPLETED before a specific future moment. The "by 2030" tense.',
    blurbFr:
      'Pour des événements qui seront TERMINÉS avant un moment futur précis. Le temps du "by 2030".',
    rule: `**Future perfect** ("will have + past participle") — for actions that will be COMPLETED before a specific future point.

Pattern: *By + future time, subject + will have + V-ed.*
- *By 2030, AI will have changed every industry.*
- *By the time you arrive, I'll have finished cooking.*

Trigger phrases: *by [date/time], by then, by the time, before…*

Compare three future tenses:
- *I will work on it.* (will, simple decision)
- *I will be working on it at 3pm.* (future continuous, in progress)
- *I will have finished it by 5pm.* (future perfect, completed before a point)

The negative is *will not have V-ed* / *won't have V-ed*: *I won't have finished by Friday.*`,
    ruleFr: `**Future perfect** ("will have + participe passé") — pour des actions qui seront TERMINÉES avant un moment futur précis.

Pattern : *By + temps futur, sujet + will have + V-ed.*
- *By 2030, AI will have changed every industry.*
- *By the time you arrive, I'll have finished cooking.*

Déclencheurs : *by [date/heure], by then, by the time, before…*

Comparaison de trois temps futurs :
- *I will work on it.* (will, décision simple)
- *I will be working on it at 3pm.* (future continu, en cours)
- *I will have finished it by 5pm.* (future perfect, terminé avant un point)

La négation est *will not have V-ed* / *won't have V-ed* : *I won't have finished by Friday.*`,
    examples: [
      { en: 'By the end of this year, I\'ll have lived here for ten years.', fr: 'À la fin de cette année, j\'aurai vécu ici pendant dix ans.', note: 'Duration completed by a future point.', noteFr: 'Durée complétée à un moment futur.' },
      { en: "By the time you read this, I'll have left.", fr: 'Quand tu liras ceci, je serai déjà parti.', note: 'Action completed before another future event.', noteFr: 'Action complétée avant un autre événement futur.' },
      { en: 'We won\'t have finished the migration by Friday.', fr: 'On n\'aura pas fini la migration avant vendredi.', note: 'Negative future perfect.', noteFr: 'Future perfect négatif.' },
    ],
    drills: [
      { type: 'fill', prompt: "By 8pm, I ___ (finish) the report.", promptFr: "À 20h, j'___ (finish) le rapport.", answer: "will have finished", acceptedAnswers: ["'ll have finished"], explanation: '"By + future time" → future perfect.', explanationFr: '"By + temps futur" → future perfect.' },
      { type: 'fill', prompt: "By 2030, AI ___ (change) every industry.", promptFr: "D'ici 2030, l'IA ___ (change) chaque industrie.", answer: "will have changed", acceptedAnswers: ["'ll have changed"], explanation: 'Future completion by a future date → future perfect.', explanationFr: 'Achèvement futur à une date future → future perfect.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ["By next week, I'll finish the project.", "By next week, I'll have finished the project.", "By next week, I'll be finishing the project.", "By next week, I finish the project."], answer: 1, explanation: '"By + future time" → future perfect "will have finished".', explanationFr: '"By + temps futur" → future perfect "will have finished".' },
      { type: 'fill', prompt: "By the time you arrive, dinner ___ (be) ready.", promptFr: "Quand tu arriveras, le dîner ___ (be) prêt.", answer: "will have been", acceptedAnswers: ["'ll have been"], explanation: '"By the time + clause" → future perfect.', explanationFr: '"By the time + proposition" → future perfect.' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["By June, I'll have shipped three features.", "By June, I'll ship three features.", "Both are accepted; sentence 1 emphasises completion.", "By next year, she will have moved abroad."], answer: 1, explanation: 'Sentence 2 is grammatically OK but loses the "completed by" emphasis. With "by + future time", future perfect is preferred.', explanationFr: 'La phrase 2 est correcte mais perd l\'emphase "complété avant". Avec "by + temps futur", le future perfect est préféré.' },
      { type: 'fill', prompt: "By next month, we ___ (not / launch) yet.", promptFr: "D'ici le mois prochain, on ___ (not / launch) encore.", answer: "won't have launched", acceptedAnswers: ['will not have launched'], explanation: 'Negative future perfect → "won\'t have + V-ed".', explanationFr: 'Future perfect négatif → "won\'t have + V-ed".' },
      { type: 'mcq', prompt: 'Pick the natural sentence about completion before a date.', promptFr: 'Choisis la phrase naturelle pour un achèvement avant une date.', options: ['By December, the team will have grown to 50.', 'By December, the team will grow to 50.', 'By December, the team grows to 50.', 'By December, the team will be growing to 50.'], answer: 0, explanation: 'Completion before a future date → future perfect.', explanationFr: 'Achèvement avant une date future → future perfect.' },
      { type: 'fill', prompt: "By tomorrow morning, the system ___ (run) for 1000 hours straight.", promptFr: "Demain matin, le système ___ (run) depuis 1000h d'affilée.", answer: "will have run", acceptedAnswers: ["'ll have run"], explanation: 'Duration up to a future point → future perfect.', explanationFr: "Durée jusqu'à un moment futur → future perfect.", },
      { type: 'mcq', prompt: 'Pick the right tense:', promptFr: 'Choisis le bon temps :', options: ["By 5pm, I'll work for 8 hours.", "By 5pm, I'll have worked for 8 hours.", "By 5pm, I work for 8 hours.", "By 5pm, I'll be worked for 8 hours."], answer: 1, explanation: 'Duration completed by a future moment → future perfect.', explanationFr: 'Durée complétée à un moment futur → future perfect.' },
      { type: 'fill', prompt: "By the time my parents retire, they ___ (live) in Lisbon for 20 years.", promptFr: "Quand mes parents partiront en retraite, ils ___ (live) à Lisbonne depuis 20 ans.", answer: "will have lived", acceptedAnswers: ["'ll have lived"], explanation: '"By the time" + future point → future perfect.', explanationFr: '"By the time" + moment futur → future perfect.' },
    ],
  },

  /* ============================== B2 — used vs would for past ============================== */
  {
    id: 'present-perfect-life-experience',
    name: 'Present perfect for life experience',
    nameFr: 'Present perfect pour les expériences de vie',
    level: 'B1',
    blurb:
      "Have you ever…? I've never… The present perfect's signature use for talking about experiences across a lifetime.",
    blurbFr:
      "Have you ever…? I've never… L'usage signature du present perfect pour parler d'expériences sur toute une vie.",
    rule: `When you ask about — or describe — experiences across someone's whole life so far, use the present perfect (have/has + V-ed). NOT past simple, because the time period (your whole life) isn't finished.

**Common patterns**:
- *Have you ever + V-ed…?* — life-experience question
- *I have/I've + V-ed (already / just / never / ever)* — affirming an experience
- *I have/I've never + V-ed* — never had this experience

The trap: as soon as you specify WHEN, you switch to past simple.
- *Have you ever been to Tokyo?* (general life experience)
- *I went to Tokyo last summer.* (specific past time → past simple)
- *Yes, I've been there twice.* (back to general, no time)

Common time markers that pair with present perfect: *ever, never, already, yet, just, before, in my life, so far, this year/month/week (still in progress).*`,
    ruleFr: `Quand on demande — ou qu'on décrit — des expériences sur toute la vie de quelqu'un jusqu'à maintenant, on utilise le present perfect (have/has + V-ed). PAS le prétérit, car la période (toute la vie) n'est pas terminée.

**Patterns courants** :
- *Have you ever + V-ed…?* — question d'expérience de vie
- *I have/I've + V-ed (already / just / never / ever)* — affirmer une expérience
- *I have/I've never + V-ed* — jamais eu cette expérience

Le piège : dès qu'on précise QUAND, on bascule au prétérit.
- *Have you ever been to Tokyo?* (expérience générale)
- *I went to Tokyo last summer.* (temps précis → prétérit)
- *Yes, I've been there twice.* (général, sans temps)

Marqueurs courants avec le present perfect : *ever, never, already, yet, just, before, in my life, so far, this year/month/week (en cours).*`,
    examples: [
      { en: 'Have you ever tried sushi?', fr: 'As-tu déjà goûté des sushis ?', note: 'Life experience question → present perfect.', noteFr: "Question d'expérience de vie → present perfect." },
      { en: "I've never been to Asia.", fr: "Je n'ai jamais été en Asie.", note: 'Negative life experience → present perfect.', noteFr: 'Expérience négative → present perfect.' },
      { en: "I've already submitted three applications this week.", fr: "J'ai déjà envoyé trois candidatures cette semaine.", note: '"Already" + ongoing period → present perfect.', noteFr: '"Already" + période en cours → present perfect.' },
      { en: 'I went there last year.', fr: "J'y suis allé l'année dernière.", note: 'Specific time → past simple, not present perfect.', noteFr: 'Temps précis → prétérit, pas present perfect.' },
    ],
    drills: [
      { type: 'fill', prompt: '___ you ever ___ (eat) Korean food?', promptFr: '___ déjà ___ (eat) coréen ?', answer: 'Have / eaten', acceptedAnswers: ['have eaten', 'have / eaten'], explanation: '"Have ever + past participle" — life experience.', explanationFr: '"Have ever + participe passé" — expérience de vie.' },
      { type: 'fill', prompt: "I ___ (never / be) to South America.", promptFr: 'Je ___ (never / be) en Amérique du Sud.', answer: "have never been", acceptedAnswers: ["'ve never been", 'have never been to', "'ve never been to"], explanation: '"Have never + past participle".', explanationFr: '"Have never + participe passé".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["I've visited Tokyo last year.", "I've been to Tokyo three times.", "I went to Tokyo last year.", 'I have never been to Tokyo.'], answer: 0, explanation: '"Last year" is finished → use past simple "I went", not "I\'ve visited".', explanationFr: '"Last year" est terminé → prétérit "I went", pas "I\'ve visited".' },
      { type: 'fill', prompt: "She ___ (already / submit) the report.", promptFr: 'Elle ___ (already / submit) le rapport.', answer: "has already submitted", explanation: '"Has already + past participle".', explanationFr: '"Has already + participe passé".' },
      { type: 'mcq', prompt: 'Most natural for "general life so far":', promptFr: 'Le plus naturel pour "vie en général jusqu\'ici" :', options: ["I lived in three countries.", "I have lived in three countries.", "I am living in three countries.", "I live in three countries."], answer: 1, explanation: 'Life experience without specific time → present perfect.', explanationFr: 'Expérience de vie sans temps précis → present perfect.' },
      { type: 'fill', prompt: "Have you ___ (try) the new café yet?", promptFr: 'As-tu ___ (try) le nouveau café ?', answer: 'tried', explanation: '"Have + past participle" → "tried".', explanationFr: '"Have + participe passé" → "tried".' },
      { type: 'spot-error', prompt: 'Which sentence is wrong?', promptFr: 'Quelle phrase est fausse ?', options: ["I've finished my project this morning.", "I finished my project this morning.", "I've never tried bungee jumping.", "I've already eaten lunch."], answer: 0, explanation: '"This morning" is finished if it\'s now afternoon → past simple "I finished".', explanationFr: '"This morning" est terminé si on est l\'après-midi → prétérit "I finished".' },
      { type: 'fill', prompt: "We ___ (just / receive) the news.", promptFr: 'On ___ (just / receive) la nouvelle.', answer: "have just received", acceptedAnswers: ["'ve just received"], explanation: '"Have just + past participle" — recent.', explanationFr: '"Have just + participe passé" — récent.' },
      { type: 'mcq', prompt: 'Pick the natural sentence.', promptFr: 'Choisis la phrase naturelle.', options: ['I have seen that movie three times last year.', 'I saw that movie three times last year.', 'I have been seeing that movie three times last year.', 'I see that movie three times last year.'], answer: 1, explanation: '"Last year" → past simple. "I saw it three times last year".', explanationFr: '"Last year" → prétérit. "I saw it three times last year".' },
      { type: 'fill', prompt: "How many books ___ you ___ (read) this year?", promptFr: "Combien de livres ___ (read) cette année ?", answer: 'have / read', acceptedAnswers: ['have read', 'have / read'], explanation: '"This year" can still be in progress → present perfect.', explanationFr: '"This year" peut être en cours → present perfect.' },
    ],
  },
]
