import { useMemo, useState } from 'react'
import { builderTiers } from './data/builderTiers'
import { redHillBuilders } from './data/redHillBuilders'
import { finishTiers, givenYourBrief } from './data/finishTiers'
import { costDrivers } from './data/costDrivers'
import { selectionSteps, redFlags } from './data/selectionSteps'

type TabId = 'start' | 'steps' | 'types' | 'redhill' | 'costs' | 'drivers' | 'estimate'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'start', label: 'Start here', emoji: '🏠' },
  { id: 'steps', label: 'Selection steps', emoji: '✅' },
  { id: 'types', label: 'Builder types', emoji: '🏗️' },
  { id: 'redhill', label: 'Red Hill builders', emoji: '📍' },
  { id: 'costs', label: 'Cost per m²', emoji: '💰' },
  { id: 'drivers', label: 'Cost drivers', emoji: '⚖️' },
  { id: 'estimate', label: 'Estimate', emoji: '🧮' }
]

const tierColours: Record<string, string> = {
  budget: '#7dd3fc',
  mid: '#fbbf24',
  premium: '#fb923c',
  luxury: '#f472b6'
}

const impactColours: Record<string, string> = {
  huge: '#ef4444',
  large: '#f97316',
  medium: '#eab308',
  small: '#84cc16'
}

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(n)
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.25rem' }}>
      <h2 style={{ fontSize: '1.35rem', marginBottom: subtitle ? '0.25rem' : '0.85rem', color: '#ffb86b' }}>{title}</h2>
      {subtitle && <p style={{ color: '#9aa8bd', marginBottom: '0.85rem' }}>{subtitle}</p>}
      {children}
    </section>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      style={{
        background: '#172339',
        border: '1px solid #25324d',
        borderLeft: accent ? `4px solid ${accent}` : '1px solid #25324d',
        borderRadius: 10,
        padding: '1rem 1.1rem',
        marginBottom: '0.85rem'
      }}
    >
      {children}
    </div>
  )
}

function StartHere({ onJump }: { onJump: (id: TabId) => void }) {
  return (
    <div>
      <Section title="Bathroom reno in Red Hill — your situation">
        <p style={{ marginBottom: '0.8rem' }}>
          You want a high-quality bathroom renovation in a Brisbane inner-north suburb (Red Hill area)
          without spending boutique-architect money. This guide is built for exactly that brief.
        </p>
        <Card accent="#fb923c">
          <strong style={{ color: '#ffb86b' }}>The headline recommendation</strong>
          <p style={{ marginTop: '0.4rem' }}>{givenYourBrief.rationale}</p>
        </Card>
      </Section>

      <Section title="The shortcut: 5 things to do this week">
        <ol style={{ paddingLeft: '1.2rem', display: 'grid', gap: '0.4rem' }}>
          <li>Write your brief in one page — keep your stretch budget private.</li>
          <li>Shortlist 4 specialist renovators + 1 boutique builder from the Red Hill list.</li>
          <li>QBCC-licence check every name on <a href="https://www.qbcc.qld.gov.au/online-services" target="_blank" rel="noreferrer">qbcc.qld.gov.au</a>.</li>
          <li>Book 3 site walks in the same week with identical scope sheets.</li>
          <li>Insist on fixed-price quotes with itemised PC sums.</li>
        </ol>
      </Section>

      <Section title="Jump straight to">
        <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {TABS.filter(t => t.id !== 'start').map(t => (
            <button
              key={t.id}
              onClick={() => onJump(t.id)}
              style={{
                background: '#1d2b46',
                border: '1px solid #2a3a5a',
                color: '#e8eef7',
                borderRadius: 8,
                padding: '0.7rem 0.8rem',
                fontSize: '0.95rem',
                textAlign: 'left'
              }}
            >
              <span style={{ marginRight: 8 }}>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Steps() {
  return (
    <div>
      <Section title="Eight steps to choose a builder" subtitle="Run these in order. The first three filter your shortlist; the rest protect you on price and finish.">
        {selectionSteps.map(s => (
          <Card key={s.step}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#fb923c',
                  color: '#0f1a2b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                {s.step}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{s.title}</h3>
                <p style={{ color: '#c5cee0', marginBottom: '0.5rem' }}>{s.detail}</p>
                <ul style={{ paddingLeft: '1.1rem', color: '#9aa8bd', fontSize: '0.92rem' }}>
                  {s.checklist.map(c => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </Section>

      <Section title="Red flags — walk away if you see these">
        <Card accent="#ef4444">
          <ul style={{ paddingLeft: '1.1rem', display: 'grid', gap: '0.3rem' }}>
            {redFlags.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Card>
      </Section>
    </div>
  )
}

function Types() {
  return (
    <div>
      <Section
        title="Builder categories"
        subtitle="Brisbane builders fall into five rough categories. Match the category to your job — for a bathroom reno, specialist renovators are usually the right tier."
      >
        {builderTiers.map(t => (
          <Card key={t.id} accent="#7dd3fc">
            <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{t.label}</h3>
            <p style={{ color: '#9aa8bd', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t.size}</p>
            <p style={{ marginBottom: '0.6rem' }}><strong>Best for: </strong>{t.bestFor}</p>
            <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <strong style={{ color: '#84cc16' }}>Strengths</strong>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0' }}>
                  {t.strengths.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ color: '#ef4444' }}>Watch-outs</strong>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0' }}>
                  {t.watchOuts.map(w => <li key={w}>{w}</li>)}
                </ul>
              </div>
            </div>
            <p style={{ marginTop: '0.6rem', fontSize: '0.88rem', color: '#9aa8bd' }}>
              <strong>Typical margin: </strong>{t.typicalMarkup}
            </p>
          </Card>
        ))}
      </Section>
    </div>
  )
}

function RedHill() {
  return (
    <div>
      <Section
        title="Red Hill / Paddington / Bardon shortlist"
        subtitle="A composite review summary of inner-north Brisbane renovators based on publicly visible Google, Houzz and ProductReview themes. Always verify current ratings before engaging."
      >
        {redHillBuilders.map(b => (
          <Card key={b.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{b.name}</h3>
              <span style={{ color: '#9aa8bd', fontSize: '0.85rem' }}>{b.area}</span>
            </div>
            <p style={{ color: '#ffb86b', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              {b.type.replace('-', ' ')} · {b.focus}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>{b.ratingSummary}</p>
            <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: '1fr 1fr', marginBottom: '0.5rem' }}>
              <div>
                <strong style={{ color: '#84cc16' }}>Positive themes</strong>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0' }}>
                  {b.reviewThemesPositive.map(p => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ color: '#ef4444' }}>Critical themes</strong>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0' }}>
                  {b.reviewThemesNegative.map(n => <li key={n}>{n}</li>)}
                </ul>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#9aa8bd' }}>{b.notes}</p>
          </Card>
        ))}
        <Card accent="#7dd3fc">
          <strong>How to verify these before quoting</strong>
          <ul style={{ paddingLeft: '1.1rem', marginTop: '0.4rem', fontSize: '0.92rem' }}>
            <li>Google Maps → search "[builder name] Brisbane" → sort reviews by Newest, read last 12 months only.</li>
            <li>Houzz.com.au → reviews are written from real project leads, harder to fake.</li>
            <li>ProductReview.com.au → company-level reviews, watch for review bombing patterns.</li>
            <li>QBCC online licence search → confirms current licence + any disciplinary actions.</li>
            <li>ASIC Connect → confirms company history and director continuity.</li>
          </ul>
        </Card>
      </Section>
    </div>
  )
}

function Costs() {
  return (
    <div>
      <Section
        title="Bathroom cost per square metre (Brisbane 2025–26)"
        subtitle="Total turnkey rates including labour, trades, materials, waterproofing and builder margin. Floor area = the bathroom footprint, not the whole house."
      >
        {finishTiers.map(t => (
          <Card key={t.id} accent={tierColours[t.id]}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{t.label}</h3>
              <strong style={{ color: tierColours[t.id] }}>
                {formatAud(t.ratePerSqm[0])}–{formatAud(t.ratePerSqm[1])} /m²
              </strong>
            </div>
            <p style={{ marginBottom: '0.5rem' }}>{t.description}</p>
            <strong style={{ fontSize: '0.9rem' }}>Typical inclusions</strong>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0', marginBottom: '0.4rem' }}>
              {t.inclusions.map(i => <li key={i}>{i}</li>)}
            </ul>
            <strong style={{ fontSize: '0.9rem' }}>Real-world examples</strong>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0' }}>
              {t.examples.map(e => <li key={e}>{e}</li>)}
            </ul>
          </Card>
        ))}
        <Card accent="#fb923c">
          <strong style={{ color: '#ffb86b' }}>Target for your brief</strong>
          <p style={{ marginTop: '0.3rem' }}>
            High-quality finish, sensible budget = the <strong>premium tier</strong> ($6,500–$9,500/m²).
            Hold the high end down by: (1) keeping the existing plumbing layout, (2) Australian-premium
            tapware instead of imported European, (3) one feature tile, not three.
          </p>
        </Card>
      </Section>
    </div>
  )
}

function Drivers() {
  return (
    <div>
      <Section
        title="What moves the budget — and what doesn't"
        subtitle="Ordered from biggest budget swing to smallest. Spend energy on the top of this list."
      >
        {costDrivers.map(d => (
          <Card key={d.category} accent={impactColours[d.impact]}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '1.05rem' }}>{d.category}</h3>
              <span
                style={{
                  background: impactColours[d.impact],
                  color: '#0f1a2b',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}
              >
                {d.impact} impact
              </span>
            </div>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0', marginBottom: '0.4rem' }}>
              {d.examples.map(e => <li key={e}>{e}</li>)}
            </ul>
            <p style={{ fontSize: '0.92rem', color: '#ffb86b' }}><strong>Advice: </strong>{d.advice}</p>
          </Card>
        ))}
      </Section>
    </div>
  )
}

function Estimate() {
  const [sqm, setSqm] = useState(6)
  const [tier, setTier] = useState('premium')
  const [moveplumbing, setMovePlumbing] = useState(false)
  const [character, setCharacter] = useState(true)

  const selected = useMemo(() => finishTiers.find(t => t.id === tier)!, [tier])

  const base = useMemo(() => {
    const [lo, hi] = selected.ratePerSqm
    return [lo * sqm, hi * sqm] as const
  }, [selected, sqm])

  const adjustments = useMemo(() => {
    const items: { label: string; lo: number; hi: number }[] = []
    if (moveplumbing) items.push({ label: 'Move plumbing / structural change', lo: 3500, hi: 9000 })
    if (character) items.push({ label: 'Pre-1946 character contingency (10–15%)', lo: base[0] * 0.10, hi: base[1] * 0.15 })
    return items
  }, [moveplumbing, character, base])

  const totalLo = base[0] + adjustments.reduce((s, a) => s + a.lo, 0)
  const totalHi = base[1] + adjustments.reduce((s, a) => s + a.hi, 0)

  return (
    <div>
      <Section title="Quick estimator" subtitle="Indicative only — for budgeting conversations, not contracts.">
        <Card>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Bathroom floor area: <strong>{sqm} m²</strong></span>
              <input
                type="range"
                min={3}
                max={15}
                step={0.5}
                value={sqm}
                onChange={e => setSqm(Number(e.target.value))}
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Finish tier</span>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                style={{ background: '#1d2b46', color: '#e8eef7', border: '1px solid #2a3a5a', padding: '0.45rem', borderRadius: 6 }}
              >
                {finishTiers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({formatAud(t.ratePerSqm[0])}–{formatAud(t.ratePerSqm[1])}/m²)
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={moveplumbing} onChange={e => setMovePlumbing(e.target.checked)} />
              <span>Move plumbing or structural wall</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={character} onChange={e => setCharacter(e.target.checked)} />
              <span>Pre-1946 character home (Red Hill default)</span>
            </label>
          </div>
        </Card>

        <Card accent="#fb923c">
          <strong style={{ color: '#ffb86b' }}>Indicative total</strong>
          <p style={{ fontSize: '1.4rem', margin: '0.4rem 0' }}>
            {formatAud(totalLo)} – {formatAud(totalHi)}
          </p>
          <details style={{ marginTop: '0.4rem' }}>
            <summary style={{ cursor: 'pointer', color: '#9aa8bd' }}>Breakdown</summary>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.9rem', color: '#c5cee0', marginTop: '0.4rem' }}>
              <li>Base ({selected.label}, {sqm} m²): {formatAud(base[0])} – {formatAud(base[1])}</li>
              {adjustments.map(a => (
                <li key={a.label}>{a.label}: +{formatAud(a.lo)} – {formatAud(a.hi)}</li>
              ))}
            </ul>
          </details>
        </Card>
      </Section>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<TabId>('start')

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 1rem 0.5rem', borderBottom: '1px solid #25324d', background: '#0f1a2b', position: 'sticky', top: 0, zIndex: 5 }}>
        <h1 style={{ fontSize: '1.25rem', color: '#ffb86b' }}>Brisbane Builder Guide</h1>
        <p style={{ fontSize: '0.85rem', color: '#9aa8bd', marginBottom: '0.6rem' }}>
          Choose, vet and budget a builder — written for a Red Hill bathroom reno.
        </p>
        <nav style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flexShrink: 0,
                background: tab === t.id ? '#fb923c' : '#1d2b46',
                color: tab === t.id ? '#0f1a2b' : '#e8eef7',
                border: '1px solid #2a3a5a',
                borderRadius: 999,
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: tab === t.id ? 700 : 500
              }}
            >
              <span style={{ marginRight: 4 }}>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ flex: 1, padding: '1.25rem 1rem 4rem', maxWidth: 880, width: '100%', margin: '0 auto' }}>
        {tab === 'start' && <StartHere onJump={setTab} />}
        {tab === 'steps' && <Steps />}
        {tab === 'types' && <Types />}
        {tab === 'redhill' && <RedHill />}
        {tab === 'costs' && <Costs />}
        {tab === 'drivers' && <Drivers />}
        {tab === 'estimate' && <Estimate />}
      </main>

      <footer style={{ padding: '0.8rem 1rem', borderTop: '1px solid #25324d', fontSize: '0.78rem', color: '#6b7894', textAlign: 'center' }}>
        v{__APP_VERSION__} · Guidance only — verify QBCC licences and get three written quotes before committing.
      </footer>
    </div>
  )
}
