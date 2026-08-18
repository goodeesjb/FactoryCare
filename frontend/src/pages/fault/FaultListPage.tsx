import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_STATUS_LABELS,
  type FaultSeverity,
  type FaultStatus,
} from '../../types/fault'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const severityVariant: Record<FaultSeverity, 'secondary' | 'warning' | 'orange' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'orange',
  CRITICAL: 'destructive',
}

const statusVariant: Record<FaultStatus, 'info' | 'warning' | 'success' | 'secondary' | 'outline'> = {
  REPORTED: 'info',
  CONFIRMED: 'outline',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}

export default function FaultListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<FaultStatus | ''>('')
  const [severity, setSeverity] = useState<FaultSeverity | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['faults', { status, severity, page }],
    queryFn: () =>
      faultApi.search({
        status: status || undefined,
        severity: severity || undefined,
        page,
      }),
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">장애 목록</h1>
        <Button onClick={() => navigate('/faults/new')}>장애 등록</Button>
      </div>

      {/* 필터 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as FaultStatus | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 상태</option>
              {(Object.keys(FAULT_STATUS_LABELS) as FaultStatus[]).map((s) => (
                <option key={s} value={s}>
                  {FAULT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as FaultSeverity | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 긴급도</option>
              {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
                <option key={s} value={s}>
                  {FAULT_SEVERITY_LABELS[s]}
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">제목</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">설비</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">긴급도</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">등록자</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">등록일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.content.map((fault) => (
                    <tr key={fault.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/faults/${fault.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {fault.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fault.equipmentName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant[fault.severity]}>
                          {FAULT_SEVERITY_LABELS[fault.severity]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[fault.status]}>
                          {FAULT_STATUS_LABELS[fault.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fault.reportedByName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(fault.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                  {!data?.content.length && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        등록된 장애가 없습니다.
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
