import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Zap, BarChart3, RefreshCw,
  TrendingUp, Settings, Activity, Info, Menu, X,
} from 'lucide-react';
import { api } from '../api/client';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/generators', icon: Zap,             label: 'Generators'      },
  { to: '/bids',       icon: BarChart3,       label: 'Bid Analysis'    },
  { to: '/rebids',     icon: RefreshCw,       label: 'Rebid Tracker'   },
  { to: '/trends',     icon: TrendingUp,      label: 'Trends'          },
  { to: '/status',     icon: Activity,        label: 'Data Status'     },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  function close() { setOpen(false); }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span>
          <div>
            <div className="brand-title">NEM Bid Analyser</div>
            <div className="brand-sub">NSW · VIC · Large Generators</div>
          </div>
          <button className="sidebar-close" onClick={close} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={close}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a className="nav-item" href="https://nemweb.com.au" target="_blank" rel="noreferrer" onClick={close}>
            <Settings size={16} />
            <span>NEMWeb</span>
          </a>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <span className="mobile-title">⚡ NEM Bid Analyser</span>
        </div>
        {api.isStatic && (
          <div className="static-banner">
            <Info size={15} />
            <span>
              <strong>Public demo</strong> — viewing pre-built data updated daily via GitHub Actions.
              AI narratives and manual sync require the{' '}
              <a href="https://github.com/Travis-coder712/brisbane-builder-guide#quick-start-mac--linux" target="_blank" rel="noreferrer">
                local backend
              </a>.
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
