import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/plan', label: 'New Plan', icon: '✨' },
  { path: '/proposals', label: 'Proposals', icon: '📋' },
  { path: '/verify', label: 'Verify', icon: '✅' },
  { path: '/history', label: 'History', icon: '🕐' },
];

export default function Sidebar() {
  return (
    <aside className="w-[220px] bg-surface h-screen fixed left-0 top-0 border-r border-border flex flex-col">
      <div className="p-5 pb-6 border-b border-border">
        <h1 className="text-lg font-bold text-primary">Traycer<span className="text-primaryHover">-mini</span></h1>
      </div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-5 py-2.5 flex items-center gap-2.5 text-sm cursor-pointer transition-colors ${
                isActive
                  ? 'bg-surfaceHover text-primary border-r-3 border-primary'
                  : 'text-textMuted hover:bg-surfaceHover hover:text-text'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
