export type BuilderTier =
  | 'volume'
  | 'mid-tier'
  | 'boutique'
  | 'specialist-renovator'
  | 'small-trade'

export interface BuilderTierInfo {
  id: BuilderTier
  label: string
  size: string
  bestFor: string
  strengths: string[]
  watchOuts: string[]
  typicalMarkup: string
}

export interface BuilderProfile {
  name: string
  area: string
  type: BuilderTier
  focus: string
  ratingSummary: string
  reviewThemesPositive: string[]
  reviewThemesNegative: string[]
  notes: string
  links?: { label: string; url: string }[]
}

export interface FinishTier {
  id: string
  label: string
  ratePerSqm: [number, number]
  description: string
  inclusions: string[]
  examples: string[]
}

export interface CostDriver {
  category: string
  impact: 'huge' | 'large' | 'medium' | 'small'
  examples: string[]
  advice: string
}

export interface SelectionStep {
  step: number
  title: string
  detail: string
  checklist: string[]
}
