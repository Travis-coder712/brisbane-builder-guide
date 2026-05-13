import type { FinishTier } from './types'

// Brisbane 2025–2026 indicative bathroom renovation rates per square metre of
// bathroom floor area. These are total turnkey rates including labour,
// trades, materials, waterproofing, tiling, fittings and a builder margin.
// They are guide ranges only — get three written quotes.
export const finishTiers: FinishTier[] = [
  {
    id: 'budget',
    label: 'Budget refresh',
    ratePerSqm: [2500, 4000],
    description: 'Cosmetic to light renovation. Keep plumbing layout, replace tiles, vanity, toilet and tapware. Standard waterproofing.',
    inclusions: [
      'Builder-grade ceramic tiles (~$35–$60/m²)',
      'Off-the-shelf vanity from Reece / Bunnings',
      'Chrome tapware (Methven, Phoenix Vivid)',
      'Acrylic shower base, framed glass screen',
      'Single exhaust + LED downlights'
    ],
    examples: [
      'Rental upgrade or pre-sale refresh',
      '4 m² bathroom: ~$10k–$16k turnkey'
    ]
  },
  {
    id: 'mid',
    label: 'Mid-range quality',
    ratePerSqm: [4000, 6500],
    description: 'Full strip-out, retiled floor and walls, new vanity with stone top, frameless glass, quality tapware. Same footprint.',
    inclusions: [
      'Porcelain tiles ($70–$130/m²)',
      'Custom or semi-custom vanity, 20mm engineered stone top',
      'Brushed nickel / matte black tapware (Phoenix Lexi, Meir)',
      'Frameless shower screen, niche, linear or tile-in floor waste',
      'Heated towel rail, inline mirror demister'
    ],
    examples: [
      'Owner-occupier Red Hill cottage main bathroom',
      '6 m² bathroom: ~$28k–$40k turnkey'
    ]
  },
  {
    id: 'premium',
    label: 'Premium / designer',
    ratePerSqm: [6500, 9500],
    description: 'Architecturally specified, possibly moved plumbing, full custom joinery, designer tile mix, premium fixtures. The level you want.',
    inclusions: [
      'Designer porcelain or stone-look tiles ($130–$250/m²)',
      'Full custom joinery with integrated handles, stone splashback',
      'Brodware / Astra Walker / Sussex tapware',
      'Frameless screens, in-wall cisterns, concealed shower diverters',
      'Underfloor heating, smart mirror, premium lighting design'
    ],
    examples: [
      'Inner-north Queenslander ensuite or main',
      '7 m² bathroom: ~$45k–$66k turnkey'
    ]
  },
  {
    id: 'luxury',
    label: 'Luxury / bespoke',
    ratePerSqm: [9500, 16000],
    description: 'Stone slabs, imported fittings, bespoke joinery, structural changes, smart-home integration. The "no compromises" tier.',
    inclusions: [
      'Honed natural stone slabs (Calacatta, travertine)',
      'Imported tapware (Fantini, Vola, Gessi)',
      'Bespoke joinery from a furniture-grade cabinet maker',
      'Freestanding stone bath, walk-in wet zone',
      'Structural reconfiguration, new window, skylight'
    ],
    examples: [
      'Award-entered renos, magazine features',
      '8 m² bathroom: $76k–$128k+ turnkey'
    ]
  }
]

export const givenYourBrief = {
  recommendedTier: 'premium',
  rationale:
    'You want a "high quality finish but not millions". For a bathroom in Red Hill that targets the premium tier ($6,500–$9,500/m²), which gets you a magazine-quality outcome without bespoke stone slabs and imported European fittings. Expect $45k–$70k turnkey for a typical 6–8 m² bathroom — pull the high end down by holding the footprint and choosing local-Australian designer tapware over imported.'
}
