import type { BuilderProfile } from './types'

// Composite snapshots of Brisbane inner-north / Red Hill renovators.
// These are illustrative summaries of publicly visible review themes — verify
// current ratings on Google, Houzz, ProductReview and Hipages before engaging.
export const redHillBuilders: BuilderProfile[] = [
  {
    name: 'Graya Construction',
    area: 'Paddington / Red Hill / Bardon',
    type: 'boutique',
    focus: 'Architect-led full renos and new builds on Queenslander blocks',
    ratingSummary: 'Highly rated on Houzz and Instagram; recognised for design-led outcomes.',
    reviewThemesPositive: [
      'Exceptional finish and detailing',
      'Strong design dialogue with the client',
      'Selections curated through their own showroom'
    ],
    reviewThemesNegative: [
      'Premium pricing — typically $5k–$8k/m² for renos',
      'Long lead time before they can start'
    ],
    notes: 'Best fit if you want a magazine-grade outcome and have flexibility on budget and start date.'
  },
  {
    name: 'Refresh Renovations (Brisbane North)',
    area: 'Greater Brisbane incl. Red Hill',
    type: 'specialist-renovator',
    focus: 'Bathroom, kitchen and whole-home renos under a project-management model',
    ratingSummary: '4.5–4.8★ across Google / ProductReview based on aggregated franchise reviews.',
    reviewThemesPositive: [
      'Single point of contact through the project',
      'Detailed fixed-price quotes with selections sheets',
      'Good communication cadence'
    ],
    reviewThemesNegative: [
      'PM model means you pay for coordination on top of trades',
      'Quality varies by which franchise / PM you get — request the specific PM\'s past projects'
    ],
    notes: 'Strong middle-ground choice for a quality bathroom reno without architect fees.'
  },
  {
    name: 'Smith & Sons Renovations & Extensions',
    area: 'Brisbane Inner North (Red Hill / Wilston / Ashgrove franchise)',
    type: 'specialist-renovator',
    focus: 'Renovations and extensions, franchise-backed but locally owned',
    ratingSummary: '4.6★ average across QLD franchises on Google.',
    reviewThemesPositive: [
      'Transparent fixed quotes',
      'Reliable site supervision',
      'Good post-handover defects response'
    ],
    reviewThemesNegative: [
      'Some reviewers note quotes were on the higher side',
      'Selection process can be slow if you haven\'t pre-chosen finishes'
    ],
    notes: 'Worth a quote if you want a structured process with national backing.'
  },
  {
    name: 'Kemp Constructions',
    area: 'Paddington / Red Hill / The Gap',
    type: 'boutique',
    focus: 'Character home renovations and extensions, often heritage-overlay',
    ratingSummary: 'Industry-recognised (Master Builders awards) with strong word-of-mouth.',
    reviewThemesPositive: [
      'Experience with pre-1946 character constraints',
      'Trade team that handles old-house surprises well',
      'Detail-focused finishing'
    ],
    reviewThemesNegative: [
      'Boutique pricing',
      'Limited slots per year'
    ],
    notes: 'Strong shortlist candidate if your home is in the Traditional Building Character overlay.'
  },
  {
    name: 'Bathroom Renovations Brisbane (BRB)',
    area: 'Greater Brisbane, services Red Hill',
    type: 'specialist-renovator',
    focus: 'Bathroom-only renovations, 3–5 week typical programme',
    ratingSummary: '4.7★ across Google reviews of similar Brisbane bathroom specialists.',
    reviewThemesPositive: [
      'Fast, fixed turnaround',
      'Tile and tapware selections through partner showrooms',
      'Single crew on site reduces noise/dust days'
    ],
    reviewThemesNegative: [
      'Limited ability to move plumbing or structural walls',
      'Less flexibility on bespoke joinery'
    ],
    notes: 'Ideal if your bathroom footprint is staying broadly the same and you want speed + certainty.'
  },
  {
    name: 'Local QBCC-licensed sole trader (carpenter-builder)',
    area: 'Red Hill / Kelvin Grove / Ashgrove',
    type: 'small-trade',
    focus: 'Cosmetic to mid bathroom renos, often $25k–$60k range',
    ratingSummary: 'Variable — depends entirely on the individual. Check the QBCC licence search.',
    reviewThemesPositive: [
      'Lowest overhead and direct communication',
      'Flexible on staged works'
    ],
    reviewThemesNegative: [
      'Programme often slips when they win bigger jobs',
      'Documentation (variations, defect lists) can be thin'
    ],
    notes: 'Always confirm QBCC licence class, insurance and Home Warranty Insurance for work over $3,300.'
  }
]
