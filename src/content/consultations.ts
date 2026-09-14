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
  options: { label: string; text: string }[];
  optionsNote?: string;
  answerNote: string;
  /** The Tally form ID. Until it is set, the page says that the form opens when the consultation opens. */
  tallyFormId?: string;
  /**
   * The questions to create in Tally, for the maintainer. They are not shown on the page.
   * Duplicate the template form, then add the questions that are specific to this consultation.
   */
  formQuestions: string[];
}

const SHARED_QUESTIONS = {
  role: "Your role (required): Agent or intermediary / Club staff / Player / Parent or guardian / Data or software provider / Other",
  why: "Why? (optional, long text)",
  country: "Country where you work (optional)",
  email: "Email address, if you want the summary (optional)",
  confirm:
    'Confirmation (required): "I am 18 or older, and I have read the privacy notice at https://fpds.football/consult/privacy/"',
};

export const consultations: Consultation[] = [
  {
    slug: "release-clauses",
    oq: "OQ-14",
    title: "Release clauses and sell-on percentages",
    question: "Do release clauses and sell-on percentages belong in a player submission?",
    description: "Should a player submission include the release clause and the sell-on percentage? Tell us in three minutes.",
    lede: "When an agent offers a player to a club, the club often asks two questions. Is there a release clause? Does the selling club keep a percentage of a future transfer fee? We want to know if FPDS includes these facts.",
    whoCanAnswer: "Agents, intermediaries, club staff, players, and other people who are 18 or older",
    fpdsNow: "A submission cannot include a release clause or a sell-on percentage",
    sections: [
      {
        heading: "Why this question matters",
        paragraphs: [
          "A release clause is a fixed fee. If a club pays the fee, the player can leave. A sell-on percentage is a share of a future transfer fee that the selling club keeps.",
          "These two facts change the cost of a transfer. They are also confidential terms between a club and a player. Parties forward submissions many times, so a confidential term can travel far.",
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
    options: [
      { label: "A. Include the amount.", text: "The submission states the fee or the percentage, with its source." },
      {
        label: "B. Include only whether one exists.",
        text: 'The submission says "yes", "no" or "not stated". The club asks for the amount.',
      },
      { label: "C. Leave them out.", text: "Parties discuss these terms outside the submission." },
    ],
    optionsNote: "You can choose a different option for release clauses and for sell-on percentages.",
    answerNote: "You can answer without an email address.",
    formQuestions: [
      SHARED_QUESTIONS.role,
      "Release clauses (required): A. Include the amount / B. Include only whether one exists / C. Leave them out",
      "Sell-on percentages (required): A. Include the amount / B. Include only whether one exists / C. Leave them out",
      SHARED_QUESTIONS.why,
      SHARED_QUESTIONS.country,
      SHARED_QUESTIONS.email,
      SHARED_QUESTIONS.confirm,
    ],
  },
  {
    slug: "medical-availability",
    oq: "OQ-15",
    title: "Medical availability",
    question: "Does a player submission say whether the player is fit to play?",
    description: "Should a player submission say whether the player is fit to play? Tell us in three minutes.",
    lede: "A club that receives a submission wants to know if the player can play now. That fact is close to health data, and health data has strict legal protection. We want to know where FPDS draws the line.",
    whoCanAnswer: "Agents, intermediaries, club staff, medical staff, players, and other people who are 18 or older",
    fpdsNow: "A submission contains no medical information",
    sections: [
      {
        heading: "What this question does not cover",
        paragraphs: [
          "Diagnoses, injury details and medical history are not part of this consultation. FPDS does not permit them in a submission, for any option. In most countries they are special-category health data. A document that parties forward is the wrong place for them.",
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
    options: [
      { label: "A. No medical information.", text: "Parties discuss fitness outside the submission." },
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
    formQuestions: [
      "Your role (required): Agent or intermediary / Club staff / Club medical staff / Player / Parent or guardian / Data or software provider / Other",
      "Your answer (required): A. No medical information / B. A status only / C. A status and an expected return date",
      `${SHARED_QUESTIONS.why}. Help text: "Do not write about the health of a specific person."`,
      SHARED_QUESTIONS.country,
      SHARED_QUESTIONS.email,
      SHARED_QUESTIONS.confirm,
    ],
  },
  {
    slug: "wages",
    oq: "OQ-2",
    title: "Wages",
    question: "Does a player submission include information about wages?",
    description: "Should a player submission include information about wages? Tell us in three minutes.",
    lede: "Wages decide many transfers before a club talks about a fee. Wages are also the most private number in football. We want to know if FPDS includes any information about them.",
    whoCanAnswer: "Agents, intermediaries, club staff, players, and other people who are 18 or older",
    fpdsNow: "A submission contains no information about wages",
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
    options: [
      { label: "A. No wage information.", text: "Parties discuss wages outside the submission." },
      { label: "B. A yes or no question.", text: '"Is the player open to a lower wage?"' },
      {
        label: "C. An expected range.",
        text: "A wide band, for example a range of annual wages, not an exact amount.",
      },
      { label: "D. The current wage.", text: "The exact amount, with its source." },
    ],
    answerNote: "Do not write the wage of a specific person in your answer.",
    formQuestions: [
      SHARED_QUESTIONS.role,
      "Your answer (required): A. No wage information / B. A yes or no question / C. An expected range / D. The current wage",
      "If FPDS includes wage information, do you use FPDS? (required): Yes / No / Not sure",
      `${SHARED_QUESTIONS.why}. Help text: "Do not write the wage of a specific person."`,
      SHARED_QUESTIONS.country,
      SHARED_QUESTIONS.email,
      SHARED_QUESTIONS.confirm,
    ],
  },
];

export function getConsultation(slug: string): Consultation {
  const consultation = consultations.find((c) => c.slug === slug);
  if (!consultation) throw new Error(`No consultation with slug ${slug}`);
  return consultation;
}
