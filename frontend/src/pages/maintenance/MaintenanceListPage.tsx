import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { maintenanceApi } from '../../api/maintenance'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '../../types/maintenance'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const statusVariant: Record<MaintenanceStatus, 'warning' | 'info' | 'success' | 'secondary'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
}

const priorityVariant: Record<MaintenancePriority, 'secondary' | 'warning' | 'orange' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'orange',
  CRITICAL: 'destructive',
}

export default function MaintenanceListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<MaintenanceStatus | ''>('')
  const [priority, setPriority] = useState<MaintenancePriority | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', { status, priority, page }],
    queryFn: () =>
      maintenanceApi.search({
        status: status || undefined,
        priority: priority || undefined,
        page,
      }),
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">유지보수 목록</h1>
        <Button onClick={() => navigate('/maintenance/new')}>작업 등록</Button>
      </div>

      {/* 필터 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MaintenanceStatus | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 상태</option>
              {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map((s) => (
                <option key={s} value={s}>
                  {MAINTENANCE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as MaintenancePriority | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 우선순위</option>
              {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map((p) => (
                <option key={p} value={p}>
                  {MAINTENANCE_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">작업번호</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">제목</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">설비</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">유형</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">우선순위</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">담당자</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">예정일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.content.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {task.taskNo}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/maintenance/${task.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{task.equipmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {MAINTENANCE_TYPE_LABELS[task.taskType]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityVariant[task.priority]}>
                          {MAINTENANCE_PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[task.status]}>
                          {MAINTENANCE_STATUS_LABELS[task.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.assigneeName ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.scheduledDate ?? '-'}
                      </td>
                    </tr>
                  ))}
                  {!data?.content.length && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        등록된 유지보수 작업이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 페이지네이션 */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                이전
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
