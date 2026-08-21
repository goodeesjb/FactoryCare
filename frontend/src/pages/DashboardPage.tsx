import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  AlertOctagon,
  CalendarCheck,
} from 'lucide-react'
import { dashboardApi } from '../api/dashboard'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
] as const

const EQUIPMENT_STATUS_OPTIONS = [
  { label: '전체', value: 'ALL' },
  { label: '정상', value: 'NORMAL' },
  { label: '점검필요', value: 'INSPECTION_NEEDED' },
  { label: '고장', value: 'BROKEN' },
  { label: '수리중', value: 'REPAIRING' },
  { label: '폐기', value: 'DISCARDED' },
]

const STATUS_COLORS: Record<string, string> = {
  NORMAL: '#22c55e',
  INSPECTION_NEEDED: '#eab308',
  BROKEN: '#ef4444',
  REPAIRING: '#3b82f6',
  DISCARDED: '#6b7280',
}

const SEVERITY_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
}
const SEVERITY_CLS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const MAINT_STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', IN_PROGRESS: '진행중', COMPLETED: '완료', CANCELLED: '취소',
}
const MAINT_STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const FAULT_STATUS_LABEL: Record<string, string> = {
  REPORTED: '접수', CONFIRMED: '확인', IN_PROGRESS: '처리중', RESOLVED: '해결', CLOSED: '종료',
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="h-3 w-20 bg-muted rounded mb-4" />
          <div className="h-8 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [equipmentStatus, setEquipmentStatus] = useState('ALL')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', period, equipmentStatus],
    queryFn: () => dashboardApi.getSummary(period, equipmentStatus),
  })

  const kpiCards = data
    ? [
        { label: '전체 설비', value: data.kpi.totalEquipments, Icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', link: '/equipments' },
        { label: '정상 설비', value: data.kpi.normalEquipments, Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', link: '/equipments' },
        { label: '고장 설비', value: data.kpi.brokenEquipments, Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', link: '/faults' },
        { label: '대기 정비', value: data.kpi.pendingMaintenance, Icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', link: '/maintenance' },
        { label: '미해결 장애', value: data.kpi.unresolvedFaults, Icon: AlertOctagon, color: 'text-rose-600', bg: 'bg-rose-50', link: '/faults' },
        { label: '예정 점검', value: data.kpi.scheduledInspections, Icon: CalendarCheck, color: 'text-violet-600', bg: 'bg-violet-50', link: '/inspection-schedules' },
      ]
    : []

  const faultTrendData = data
    ? {
        labels: data.faultTrend.map((i) => i.month),
        datasets: [{
          label: '장애 건수',
          data: data.faultTrend.map((i) => i.count),
          fill: true,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          pointRadius: 4,
        }],
      }
    : null

  const equipDistData = data
    ? {
        labels: data.equipmentStatusDistribution.map((i) => i.label),
        datasets: [{
          data: data.equipmentStatusDistribution.map((i) => i.count),
          backgroundColor: data.equipmentStatusDistribution.map((i) => STATUS_COLORS[i.status] ?? '#94a3b8'),
          borderWidth: 0,
        }],
      }
    : null

  const selectCls = "h-8 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring transition-colors"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">설비 관제 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">실시간 설비 현황을 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as 7 | 30 | 90)}
            className={selectCls}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={equipmentStatus}
            onChange={(e) => setEquipmentStatus(e.target.value)}
            className={selectCls}
          >
            {EQUIPMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          데이터를 불러오지 못했습니다. 새로고침해주세요.
        </div>
      )}

      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map(({ label, value, Icon, color, bg, link }) => (
            <Link
              key={label}
              to={link}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">{value}</div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">월별 장애 추이</h2>
              {faultTrendData && (
                <Line
                  data={faultTrendData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                  }}
                />
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">설비 상태 분포</h2>
              {equipDistData && (
                <div className="flex justify-center">
                  <div className="w-64">
                    <Doughnut
                      data={equipDistData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">최근 장애</h2>
                <Link to="/faults" className="text-xs text-primary hover:underline">전체보기</Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentFaults.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">장애 내역이 없습니다.</p>
                ) : (
                  data.recentFaults.map((f) => (
                    <Link
                      key={f.id}
                      to={`/faults/${f.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.equipmentName} · {FAULT_STATUS_LABEL[f.status] ?? f.status} · {f.reportedAt}
                        </p>
                      </div>
                      <span className={`ml-3 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_CLS[f.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SEVERITY_LABEL[f.severity] ?? f.severity}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">최근 정비작업</h2>
                <Link to="/maintenance" className="text-xs text-primary hover:underline">전체보기</Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentMaintenance.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">정비 내역이 없습니다.</p>
                ) : (
                  data.recentMaintenance.map((m) => (
                    <Link
                      key={m.id}
                      to={`/maintenance/${m.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {m.taskNo} · {m.scheduledDate ?? '-'}
                        </p>
                      </div>
                      <span className={`ml-3 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${MAINT_STATUS_CLS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {MAINT_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
