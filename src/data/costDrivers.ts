import type { CostDriver } from './types'

// Ordered roughly from biggest cost lever to smallest. "Impact" is the swing
// the decision can cause on a typical Brisbane bathroom reno budget.
export const costDrivers: CostDriver[] = [
  {
    category: 'Moving plumbing or structural walls',
    impact: 'huge',
    examples: [
      'Relocating the toilet stack ($3k–$8k+)',
      'Removing a load-bearing wall ($5k–$15k incl. engineer + beam)',
      'Adding a new window or skylight ($2k–$6k)'
    ],
    advice: 'Easiest win on cost: keep the existing plumbing layout. Designers can almost always make the same footprint feel new.'
  },
  {
    category: 'Stone slab vs tiles vs engineered stone',
    impact: 'huge',
    examples: [
      'Calacatta natural stone vanity top: $1,500–$4,000',
      'Engineered stone 20mm: $400–$900',
      'Tiled splashback vs stone splashback: $200 vs $1,500'
    ],
    advice: 'Spec engineered stone for the vanity top. Use a stone-look porcelain tile on the floor for 70% of the look at 30% of the cost.'
  },
  {
    category: 'Tapware brand',
    impact: 'large',
    examples: [
      'Imported (Brodware/Sussex/Astra Walker): $3,500–$7,000 per bathroom',
      'Premium Australian (Phoenix Lexi, Meir): $1,200–$2,200',
      'Builder-grade chrome: $500–$900'
    ],
    advice: 'Australian premium ranges (Phoenix, Meir, ABI Interiors) hit the visual mark for a fraction of imported pricing. Reserve imported tapware for one feature piece.'
  },
  {
    category: 'Tile size, format and pattern',
    impact: 'large',
    examples: [
      'Large-format 600×1200 porcelain: faster to lay but heavier — ~$95/m² supply',
      'Mosaic feature wall: $200/m² supply + 2–3× labour for laying',
      'Herringbone or chevron pattern adds ~25% to tiling labour'
    ],
    advice: 'Use a single 600×1200 tile floor-to-ceiling on most walls. Spend the saved labour on one feature niche or floor strip.'
  },
  {
    category: 'Joinery (vanity and storage)',
    impact: 'large',
    examples: [
      'Off-the-shelf 1200mm vanity: $700–$1,500',
      'Semi-custom polyurethane joinery: $2,500–$4,500',
      'Custom furniture-grade with integrated handles + stone top: $5,000–$10,000'
    ],
    advice: 'Semi-custom (polyurethane carcass + stone top) is the sweet spot. Push budget here over tapware if you want visible wow.'
  },
  {
    category: 'Shower screen and waste',
    impact: 'medium',
    examples: [
      'Framed screen: $400–$700',
      'Semi-frameless: $700–$1,200',
      'Frameless 10mm fixed panel: $1,400–$2,500',
      'Linear floor drain vs centre waste: +$300–$600'
    ],
    advice: 'Frameless 10mm + a tile-in linear waste is the single most "premium" upgrade for the dollar.'
  },
  {
    category: 'Waterproofing and substrate',
    impact: 'medium',
    examples: [
      'Standard AS 3740 compliant waterproofing: included in builder quote',
      'Compressed FC sheet vs blueboard: ~$500–$1,000 upgrade',
      'Re-screed of a sloped floor: $1,500–$3,000'
    ],
    advice: 'Do not cheap out here. Get the waterproofing certificate before the tiler arrives. This is the failure point that ruins bathrooms within 5 years.'
  },
  {
    category: 'Heating, lighting and ventilation',
    impact: 'medium',
    examples: [
      'Heated towel rail: $300–$900',
      'Underfloor heating (electric mat under tile): $1,500–$3,000',
      'Designer pendant or wall sconce: $300–$1,200 ea',
      '3-in-1 exhaust vs separate fan + heater: $200 vs $700'
    ],
    advice: 'Underfloor heating is one of the most-loved upgrades from clients post-move-in. Worth the spend in Brisbane winter mornings.'
  },
  {
    category: 'Toilet, basin, bath',
    impact: 'medium',
    examples: [
      'Standard close-coupled toilet: $400–$700',
      'In-wall cistern + wall-hung pan: $900–$1,800',
      'Acrylic bath: $400–$900',
      'Freestanding stone-composite bath: $2,000–$4,500'
    ],
    advice: 'In-wall cisterns look much higher-end and aren\'t much more to install during a full reno.'
  },
  {
    category: 'Site conditions (Brisbane character home)',
    impact: 'large',
    examples: [
      'Removing asbestos sheeting: $2k–$5k',
      'Replacing rotten VJ wall behind old tiles: $1k–$3k',
      'Levelling sagging floor joists pre-tile: $2k–$6k',
      'Lead paint encapsulation: $1k–$2k'
    ],
    advice: 'Budget a 10–15% contingency for pre-1946 homes. Ask your builder to include a "latent conditions" provisional sum in the contract.'
  },
  {
    category: 'Selections and decision speed',
    impact: 'small',
    examples: [
      'Variations after start: $200–$500 admin per change',
      'Holding cost if trades demobilise waiting on tiles: $500–$1,500/week'
    ],
    advice: 'Lock 100% of selections before site start. Indecision is the cheapest thing to fix and the most common cause of overruns.'
  }
]
