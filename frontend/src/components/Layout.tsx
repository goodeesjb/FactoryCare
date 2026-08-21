import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Settings,
  Package,
  Users,
  LogOut,
  Factory,
  Bell,
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/dashboard' },
  { icon: Wrench, label: '설비관리', path: '/equipments' },
  { icon: ClipboardList, label: '점검관리', path: '/inspection-schedules' },
  { icon: ClipboardCheck, label: '체크리스트', path: '/inspection-checklists' },
  { icon: AlertTriangle, label: '장애관리', path: '/faults' },
  { icon: Settings, label: '유지보수', path: '/maintenance' },
  { icon: Package, label: '부품관리', path: '/parts' },
]

const adminNavItems = [
  { icon: Users, label: '회원 관리', path: '/users' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const token = localStorage.getItem('accessToken')
  const name = localStorage.getItem('name') ?? '사용자'
  const role = localStorage.getItem('role') ?? ''
  const initial = name.trim().charAt(0).toUpperCase()
  const roleLabel = role === 'ADMIN' ? '관리자' : role === 'MANAGER' ? '매니저' : '작업자'

  if (!token) return <>{children}</>

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const allNav = [...navItems, ...(role === 'ADMIN' ? adminNavItems : [])]
  const currentLabel = allNav.find(n =>
    n.path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(n.path)
  )?.label ?? 'FactoryCare'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">FactoryCare</p>
            <p className="tabular text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CMMS v1.0</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {allNav.map((item) => {
            const isActive = item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors border-l-2',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="m-3 rounded-md border border-sidebar-border bg-card/60 p-3">
          <p className="text-xs text-muted-foreground">현장 실시간 연동</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-sidebar-foreground">
            <span className="size-2 animate-pulse rounded-full bg-success" />
            PLC 게이트웨이 정상
          </p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <Factory className="size-5 text-primary" />
            <span className="font-semibold">FactoryCare</span>
          </div>
          <h2 className="hidden text-sm font-semibold text-foreground lg:block">{currentLabel}</h2>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground">
              <Bell className="size-4" />
            </button>
            <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {initial}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium">{name}</p>
                <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 lg:hidden">
          {allNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors',
                (item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(item.path))
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-5 lg:p-8">
          {children}
        </main>

        <footer className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          FactoryCare · 설비 유지보수 관리 시스템
        </footer>
      </div>
    </div>
  )
}
