/**
 * Consultations as data. Each entry makes one page at /consult/<slug>/ (DECISIONS.md D-25 and D-26).
 * All text is Simple English with British spelling. The pages contain no JSON.
 */

export interface Consultation {
  slug: string;
  /** The ID of the open question in §14 of SPEC.md. */
  oq: string;
  title: string;
  question: string;
  description: string;
  lede: string;
  whoCanAnswer: string;
  fpdsNow: string;
  sections: { heading: string; paragraphs: string[] }[];
  forHeading: string;
  caseFor: string[];
  againstHeading: string;
  caseAgainst: string[];
  /** Ideas to start the discussion. They are not a closed list. */
  ideas: { label: string; text: string }[];
  ideasNote?: string;
  answerNote: string;
}

/**
 * The ID of the one Tally form that all consultations use (DECISIONS.md D-44 in the spec repository).
 * Until it is set, each page says that the form opens when the consultation opens.
 */
export const TALLY_FORM_ID: string | undefined = "NpaEqp";

/**
 * The questions to create in the Tally form, for the maintainer. They are not shown on the page.
 * The page sends the slug of the consultation in the URL, and Tally stores it in the hidden field.
 */
export const TALLY_FORM_QUESTIONS = [
  'Hidden field: "consultation"',
  "Your name (optional)",
  "Your role (required): Intermediary (FIFA-licensed) / Scout / Head of Recruitment / Sporting Director / Unlicensed Agent / Player / Parent / Medical / Other",
  "Your answer (required, long text)",
  "Email (optional)",
  'Confirmation (required): "I am 18 or older and have read the privacy notice"',
] as const;

export const consultations: Consultation[] = [
  {
    slug: "release-clauses",
    oq: "OQ-14",
    title: "Release clauses and sell-on percentages",
    question: "Do release clauses and sell-on percentages belong in a player profile?",
    description: "Should a player profile include the release clause and the sell-on percentage? Tell us in three minutes.",
    lede: "When an agent offers a player to a club, the club often asks two questions. Is there a release clause? Does the selling club keep a percentage of a future transfer fee? We want to know if FPDS includes these facts.",
    whoCanAnswer: "Agents, intermediaries, club staff, players, and other people who are 18 or older",
    fpdsNow: "A profile cannot include a release clause or a sell-on percentage",
    sections: [
      {
        heading: "Why this question matters",
        paragraphs: [
          "A release clause is a fixed fee. If a club pays the fee, the player can leave. A sell-on percentage is a share of a future transfer fee that the selling club keeps.",
          "These two facts change the cost of a transfer. They are also confidential terms between a club and a player. Parties forward profiles many times, so a confidential term can travel far.",
        ],
      },
    ],
    forHeading: "Reasons to include them",
    caseFor: [
      "A club can see the real cost of a player before it asks.",
      "Recruitment staff use less time on players that the club cannot afford.",
      "A structured value is better than a number in a message with no source.",
    ],
    againstHeading: "Reasons to leave them out",
    caseAgainst: [
      "The terms belong to the club and the player, not to the agent.",
      "A forwarded document can show the terms to clubs that the sender did not choose.",
      "A published fee can weaken the position of the selling club in a negotiation.",
    ],
    ideas: [
      { label: "A. Include the amount.", text: "The profile states the fee or the percentage, with its source." },
      {
        label: "B. Include only whether one exists.",
        text: 'The profile says "yes", "no" or "not stated". The club asks for the amount.',
      },
      { label: "C. Leave them out.", text: "Parties discuss these terms outside the profile." },
    ],
    ideasNote: "Your answer can give a different idea for release clauses and for sell-on percentages.",
    answerNote: "You can answer without an email address.",
  },
  {
    slug: "medical-availability",
    oq: "OQ-15",
    title: "Medical availability",
    question: "Does a player profile say whether the player is fit to play?",
    description: "Should a player profile say whether the player is fit to play? Tell us in three minutes.",
    lede: "A club that receives a profile wants to know if the player can play now. That fact is close to health data, and health data has strict legal protection. We want to know where FPDS draws the line.",
    whoCanAnswer: "Agents, intermediaries, club staff, medical staff, players, and other people who are 18 or older",
    fpdsNow: "A profile contains no medical information",
    sections: [
      {
        heading: "What this question does not cover",
        paragraphs: [
          "Diagnoses, injury details and medical history are not part of this consultation. FPDS does not permit them in a profile, for any option. In most countries they are special-category health data. A document that parties forward is the wrong place for them.",
        ],
      },
      {
        heading: "Why this question matters",
        paragraphs: [
          'Recruitment staff use time on players who cannot play for months. A short status can prevent this. But a status such as "not available" also tells the reader something about the health of the player.',
        ],
      },
    ],
    forHeading: "Reasons to include a status",
    caseFor: [
      "A club knows at once if the player can play in the next weeks.",
      'Agents already say "fully fit" in messages, with no structure and no source.',
      "A small list of values is safer than free text.",
    ],
    againstHeading: "Reasons to leave it out",
    caseAgainst: [
      '"Not available" can show that the player has an injury.',
      "A status goes out of date quickly, but the document stays in inboxes.",
      "Clubs do a medical examination before a transfer, so a status adds little.",
    ],
    ideas: [
      { label: "A. No medical information.", text: "Parties discuss fitness outside the profile." },
      {
        label: "B. A status only.",
        text: '"Available", "not available", "available with a managed load" or "not stated".',
      },
      {
        label: "C. A status and an expected return date.",
        text: "Option B, plus the date that the player expects to be available.",
      },
    ],
    answerNote: "Do not write about the health of a specific person in your answer.",
  },
  {
    slug: "wages",
    oq: "OQ-2",
    title: "Wages",
    question: "Does a player profile include information about wages?",
    description: "Should a player profile include information about wages? Tell us in three minutes.",
    lede: "Wages decide many transfers before a club talks about a fee. Wages are also the most private number in football. We want to know if FPDS includes any information about them.",
    whoCanAnswer: "Agents, intermediaries, club staff, players, and other people who are 18 or older",
    fpdsNow: "A profile contains no information about wages",
    sections: [
      {
        heading: "Why this question matters",
        paragraphs: [
          "A club with a wage limit cannot sign a player who earns more than that limit. If the club finds this out late, all parties lose time.",
          "Some agencies say that they cannot use a standard that asks for wages. For this reason, this question has the largest effect on whether agents use FPDS.",
        ],
      },
    ],
    forHeading: "Reasons to include wage information",
    caseFor: [
      "A club knows early if a player is in its wage range.",
      "Fewer talks start and then stop because of money.",
      "A range tells the club enough and keeps the exact amount private.",
    ],
    againstHeading: "Reasons to leave it out",
    caseAgainst: [
      "Wages are private information about the player.",
      "A forwarded document can show a wage to clubs that the sender did not choose.",
      "A stated expectation can weaken the position of the player in a negotiation.",
    ],
    ideas: [
      { label: "A. No wage information.", text: "Parties discuss wages outside the profile." },
      { label: "B. A yes or no question.", text: '"Is the player open to a lower wage?"' },
      {
        label: "C. An expected range.",
        text: "A wide band, for example a range of annual wages, not an exact amount.",
      },
      { label: "D. The current wage.", text: "The exact amount, with its source." },
    ],
    answerNote: "Do not write the wage of a specific person in your answer.",
  },
];

export function getConsultation(slug: string): Consultation {
  const consultation = consultations.find((c) => c.slug === slug);
  if (!consultation) throw new Error(`No consultation with slug ${slug}`);
  return consultation;
}
