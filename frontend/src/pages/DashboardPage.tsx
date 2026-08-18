import { useQuery } from '@tanstack/react-query'
import { Wrench, AlertTriangle, Settings, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import axiosInstance from '../api/axiosInstance'

export default function DashboardPage() {
  const name = localStorage.getItem('name') ?? '사용자'

  const { data: equipments } = useQuery({
    queryKey: ['equipments-dashboard'],
    queryFn: () => axiosInstance.get('/equipments?size=100').then(r => r.data),
  })

  const { data: faults } = useQuery({
    queryKey: ['faults-dashboard'],
    queryFn: () => axiosInstance.get('/faults?size=5').then(r => r.data),
  })

  const { data: maintenance } = useQuery({
    queryKey: ['maintenance-dashboard'],
    queryFn: () => axiosInstance.get('/maintenance?size=5').then(r => r.data),
  })

  const totalEq = equipments?.totalElements ?? 0
  const normalEq = equipments?.content?.filter((e: any) => e.status === 'NORMAL').length ?? 0
  const brokenEq = equipments?.content?.filter((e: any) => e.status === 'BROKEN').length ?? 0
  const pendingMaint = maintenance?.content?.filter((m: any) => m.status === 'PENDING').length ?? 0

  const stats = [
    { label: '전체 설비', value: totalEq, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', link: '/equipments' },
    { label: '정상 설비', value: normalEq, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', link: '/equipments' },
    { label: '고장 설비', value: brokenEq, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', link: '/faults' },
    { label: '대기 정비', value: pendingMaint, icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50', link: '/maintenance' },
  ]

  const FAULT_SEVERITY: Record<string, string> = { LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급' }
  const severityVariant: Record<string, any> = { LOW: 'secondary', MEDIUM: 'warning', HIGH: 'orange', CRITICAL: 'destructive' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground mt-1 text-sm">{name}님, 오늘의 설비 현황을 확인하세요.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.label} to={s.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                    <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Faults */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">최근 장애</CardTitle>
                <CardDescription>최근 접수된 장애 5건</CardDescription>
              </div>
              <Link to="/faults" className="text-sm text-primary hover:underline">전체보기</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faults?.content?.length > 0 ? faults.content.map((f: any) => (
                <Link key={f.id} to={`/faults/${f.id}`} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.equipmentName}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge variant={severityVariant[f.severity] ?? 'secondary'}>{FAULT_SEVERITY[f.severity] ?? f.severity}</Badge>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-6">장애 내역이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Maintenance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">최근 정비작업</CardTitle>
                <CardDescription>최근 정비작업 5건</CardDescription>
              </div>
              <Link to="/maintenance" className="text-sm text-primary hover:underline">전체보기</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maintenance?.content?.length > 0 ? maintenance.content.map((m: any) => (
                <Link key={m.id} to={`/maintenance/${m.id}`} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.taskNo}</p>
                  </div>
                  <Badge variant={m.status === 'COMPLETED' ? 'success' : m.status === 'IN_PROGRESS' ? 'info' : m.status === 'CANCELLED' ? 'secondary' : 'warning'}>
                    {m.status === 'PENDING' ? '대기' : m.status === 'IN_PROGRESS' ? '진행중' : m.status === 'COMPLETED' ? '완료' : '취소'}
                  </Badge>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-6">정비 내역이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
