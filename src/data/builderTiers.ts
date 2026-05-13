import type { BuilderTierInfo } from './types'

export const builderTiers: BuilderTierInfo[] = [
  {
    id: 'volume',
    label: 'Volume / Project Builders',
    size: 'Large (50+ homes/yr, national or QLD-wide)',
    bestFor: 'New-build display homes and house-and-land packages. Rarely the right fit for a single-room renovation.',
    strengths: [
      'Predictable pricing on standard inclusions',
      'Strong supplier discounts',
      'Established warranty processes'
    ],
    watchOuts: [
      'Limited interest in small reno scopes',
      'Designs locked to their catalogue',
      'Site supervisors stretched across many jobs'
    ],
    typicalMarkup: '15–20% builder margin, lots of upgrade upsell'
  },
  {
    id: 'mid-tier',
    label: 'Mid-tier Custom Builders',
    size: 'Medium (10–30 homes / large renos per year)',
    bestFor: 'Whole-home renovations, extensions, raise-and-builds, or several rooms at once.',
    strengths: [
      'In-house drafting and project management',
      'Can handle structural and council approvals',
      'Real custom selections without bespoke prices'
    ],
    watchOuts: [
      'Quoting backlog of 4–8 weeks is common',
      'Watch fixed-price PC sums — they are often light',
      'Some sub-out everything, so vet their trade list'
    ],
    typicalMarkup: '18–25% margin including PM overhead'
  },
  {
    id: 'boutique',
    label: 'Boutique / High-end Custom',
    size: 'Small (3–8 projects/yr), often architect-led',
    bestFor: 'Architecturally designed renos, heritage Queenslanders, character homes in Red Hill / Paddington / Bardon.',
    strengths: [
      'Exceptional finish quality and detailing',
      'Long-standing trade teams (cabinetry, stone, tiling)',
      'Comfortable with complex sites and old-house surprises'
    ],
    watchOuts: [
      'Premium rates ($4,500–$8,000+/m² for full renos)',
      'Booked 6–12 months out',
      'Will not engage without measured drawings'
    ],
    typicalMarkup: '20–30% margin, longer programme'
  },
  {
    id: 'specialist-renovator',
    label: 'Specialist Renovators',
    size: 'Small–medium, focused on renos only',
    bestFor: 'Bathroom, kitchen and laundry-led renos — exactly your scenario.',
    strengths: [
      'Process-driven for single-room work',
      'Fixed quotes with selections locked early',
      'Less site downtime — crews dedicated to renos'
    ],
    watchOuts: [
      'May not be licensed for structural work — ask for the QBCC class',
      'Some are project managers who sub everything (fine, but verify trades)'
    ],
    typicalMarkup: '15–22%, often packaged'
  },
  {
    id: 'small-trade',
    label: 'Owner-Builder Trade (lead trade contracts the rest)',
    size: '1–3 person operation',
    bestFor: 'Smaller bathrooms (<6 m²) where you act as PM, or cosmetic refresh.',
    strengths: [
      'Cheapest hourly rate',
      'Direct line to the person doing the work',
      'Flexible on scope changes'
    ],
    watchOuts: [
      'Programme drift — they juggle multiple jobs',
      'Less paperwork (insurance, variations, defects)',
      'Above $3,300 of labour-and-materials you legally need a QBCC-licensed builder for that trade in QLD'
    ],
    typicalMarkup: 'No formal margin, but trade markup on sub-quotes'
  }
]
