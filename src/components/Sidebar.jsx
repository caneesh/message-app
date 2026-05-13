import {
  HomeIcon,
  ChatIcon,
  ClockIcon,
  FileTextIcon,
  CalendarIcon,
  ListIcon,
  ScaleIcon,
  HandshakeIcon,
  BellIcon,
  PackageIcon,
  DoveIcon,
  LockIcon,
  HeartIcon,
  HeartPulseIcon,
  ImageIcon,
  SmartphoneIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './icons'

const navCategories = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard', icon: HomeIcon, label: 'Dashboard' },
      { id: 'chat', icon: ChatIcon, label: 'Chat' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { id: 'reminders', icon: ClockIcon, label: 'Reminders' },
      { id: 'events', icon: CalendarIcon, label: 'Events' },
      { id: 'lists', icon: ListIcon, label: 'Lists' },
    ],
  },
  {
    label: 'Decisions',
    items: [
      { id: 'decisions', icon: ScaleIcon, label: 'Decisions' },
      { id: 'promises', icon: HandshakeIcon, label: 'Promises' },
      { id: 'followups', icon: BellIcon, label: 'Follow-ups' },
    ],
  },
  {
    label: 'Archive',
    items: [
      { id: 'notes', icon: FileTextIcon, label: 'Notes' },
      { id: 'capsules', icon: PackageIcon, label: 'Capsules' },
      { id: 'memories', icon: ImageIcon, label: 'Memories' },
      { id: 'vault', icon: LockIcon, label: 'Vault' },
    ],
  },
  {
    label: 'Wellbeing',
    items: [
      { id: 'misunderstandings', icon: DoveIcon, label: 'Clear the Air' },
      { id: 'checkin', icon: HeartIcon, label: 'Check-in' },
      { id: 'care', icon: HeartPulseIcon, label: 'Care Mode' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'devices', icon: SmartphoneIcon, label: 'Devices' },
      { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    ],
  },
]

const navItems = navCategories.flatMap((cat) => cat.items)

function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo" title="OneRoom">
          {collapsed ? (
            <img
              src="/icon-192.svg"
              alt="OneRoom"
              className="logo-icon"
            />
          ) : (
            <>
              <img
                src="/logo.svg"
                alt="OneRoom"
                className="logo-full logo-light"
              />
              <img
                src="/logo-dark.svg"
                alt="OneRoom"
                className="logo-full logo-dark"
              />
            </>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>
      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        {navCategories.map((category) => (
          <div key={category.label} className="nav-category">
            {!collapsed && (
              <div className="nav-category-label">{category.label}</div>
            )}
            {category.items.map((item) => {
              const IconComponent = item.icon
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <span className="nav-icon">
                    <IconComponent />
                  </span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export { navItems, navCategories }
export default Sidebar
