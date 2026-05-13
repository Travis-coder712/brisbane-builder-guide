import type { SelectionStep } from './types'

export const selectionSteps: SelectionStep[] = [
  {
    step: 1,
    title: 'Define the brief in writing',
    detail:
      'Before you talk to a builder, get on paper: scope (which rooms, which walls), must-haves, nice-to-haves, your hard budget, target start date and any non-negotiables (e.g. keeping the original VJ panelling).',
    checklist: [
      'One-page scope document with photos / sketches',
      'Hard budget and a comfortable budget — share only one',
      'List of inspiration images (Pinterest, Houzz) tagged to specific features',
      'Confirm whether you can move out during works'
    ]
  },
  {
    step: 2,
    title: 'Shortlist 4–6 builders by tier',
    detail:
      'Match the builder type to the job. For a Red Hill bathroom at premium finish, your shortlist should mostly be specialist renovators plus one boutique. Avoid volume builders entirely.',
    checklist: [
      'Search Google "bathroom renovations Red Hill / Paddington / Bardon"',
      'Cross-check Houzz "Best of Houzz" for QLD',
      'Ask 2 neighbours who recently renovated',
      'Filter to QBCC-licensed (search by name on qbcc.qld.gov.au)'
    ]
  },
  {
    step: 3,
    title: 'Vet the licence, insurance and history',
    detail:
      'A QBCC licence search shows the licence class, current standing and any disciplinary history. Home Warranty Insurance (QBCC HWI) is mandatory for residential work over $3,300.',
    checklist: [
      'Confirm QBCC licence is current and the class covers your scope',
      'Public liability ($10M+) and workers comp current',
      'No history of director-name churning (a red flag)',
      'Search ASIC for company history and check Google for any litigation'
    ]
  },
  {
    step: 4,
    title: 'Site walk and brief',
    detail:
      'Invite 3 builders to a site walk on consecutive days while the brief is fresh. Don\'t share other builders\' quotes. Ask each the same questions.',
    checklist: [
      'How many similar bathrooms have you completed in the last 12 months?',
      'Who is the actual site supervisor — can I meet them?',
      'What is your typical programme for a 6 m² bathroom?',
      'Can you share 2 completed addresses I can drive past?',
      'How do you handle latent conditions in a pre-1946 home?'
    ]
  },
  {
    step: 5,
    title: 'Get three written, comparable quotes',
    detail:
      'Insist on a fixed-price quote with itemised PC sums (prime cost) and PS (provisional sums). Cheap quotes usually hide selections that the homeowner will end up paying.',
    checklist: [
      'Same scope document supplied to all three',
      'Itemised PC sums for tiles, tapware, vanity, screen',
      'Listed exclusions in writing',
      'Clear payment schedule — never pay more than 10% deposit (QBCC cap is 20%)'
    ]
  },
  {
    step: 6,
    title: 'Reference-check past clients',
    detail:
      'Reviews online tell you about communication. References tell you about defects management — which is where reputations are really made.',
    checklist: [
      'Speak to 2 clients whose project finished 6–18 months ago',
      'Ask: were there variations, and how were they handled?',
      'Ask: how was the defects period (3 months) handled?',
      'Drive past one completed project and ask the owner unannounced if possible'
    ]
  },
  {
    step: 7,
    title: 'Read the contract before signing',
    detail:
      'For residential work in QLD, use the QBCC Level 1 (under $20k) or Level 2 ($20k+) contract, or a Master Builders / HIA equivalent. Pay a solicitor $400–$800 to read it.',
    checklist: [
      'Fixed price (not cost-plus) unless you understand the risk',
      'Variation process in writing, with priced examples',
      'Liquidated damages clause for late completion',
      'Defect liability period (minimum 12 months)',
      'Retention or final payment held until certificates issued'
    ]
  },
  {
    step: 8,
    title: 'Lock selections before site start',
    detail:
      'The #1 cause of overruns and friction is mid-build selection changes. Have every tile, tap, fitting and finish chosen and signed off before the demolition crew arrives.',
    checklist: [
      'Selections schedule signed by both parties',
      'Long-lead items (tapware, custom joinery) ordered',
      'A single decision-maker for the project (one human)',
      'A WhatsApp group with the supervisor — but variations only by email'
    ]
  }
]

export const redFlags: string[] = [
  'Cash discount offered',
  'No written quote, just a verbal "around $X"',
  'Deposit over 20% (illegal in QLD residential)',
  'Cannot produce QBCC licence number on request',
  'Pressure to sign today',
  'Their own company name has changed in the last 24 months',
  'No insurance certificate available',
  'Quote is 25%+ below the other quotes — they are missing scope or planning to recover via variations',
  'Refuses to use a standard QBCC / Master Builders / HIA contract'
]
