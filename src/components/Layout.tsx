import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Zap, BarChart3, RefreshCw,
  TrendingUp, Settings, Activity,
} from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/generators', icon: Zap,             label: 'Generators'      },
  { to: '/bids',       icon: BarChart3,       label: 'Bid Analysis'    },
  { to: '/rebids',     icon: RefreshCw,       label: 'Rebid Tracker'   },
  { to: '/trends',     icon: TrendingUp,      label: 'Trends'          },
  { to: '/status',     icon: Activity,        label: 'Data Status'     },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚡</span>
          <div>
            <div className="brand-title">NEM Bid Analyser</div>
            <div className="brand-sub">NSW · VIC · Large Generators</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a className="nav-item" href="https://nemweb.com.au" target="_blank" rel="noreferrer">
            <Settings size={16} />
            <span>NEMWeb</span>
          </a>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
