import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_STATUS_LABELS,
  type FaultSeverity,
  type FaultStatus,
} from '../../types/fault'
import FaultStatusModal from './FaultStatusModal'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
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

export default function FaultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const faultId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showStatusModal, setShowStatusModal] = useState(false)

  const { data: fault, isLoading } = useQuery({
    queryKey: ['fault', faultId],
    queryFn: () => faultApi.getById(faultId),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => faultApi.delete(faultId),
    onSuccess: () => navigate('/faults'),
    onError: () => alert('삭제에 실패했습니다.'),
  })

  if (isLoading) return <p className="p-6 text-muted-foreground">로딩 중...</p>
  if (!fault) return <p className="p-6 text-muted-foreground">장애를 찾을 수 없습니다.</p>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={severityVariant[fault.severity]}>
              {FAULT_SEVERITY_LABELS[fault.severity]}
            </Badge>
            <Badge variant={statusVariant[fault.status]}>
              {FAULT_STATUS_LABELS[fault.status]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{fault.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{fault.equipmentName}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => navigate(`/maintenance/new?faultId=${fault.id}`)}
          >
            정비작업 생성
          </Button>
          <Button variant="outline" onClick={() => setShowStatusModal(true)}>
            상태변경
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('삭제하시겠습니까?')) deleteMutation.mutate()
            }}
            disabled={deleteMutation.isPending}
          >
            삭제
          </Button>
        </div>
      </div>

      {/* 정보 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>장애 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">상태</p>
              <Badge variant={statusVariant[fault.status]}>
                {FAULT_STATUS_LABELS[fault.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">긴급도</p>
              <Badge variant={severityVariant[fault.severity]}>
                {FAULT_SEVERITY_LABELS[fault.severity]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">등록자</p>
              <p className="text-sm font-medium">{fault.reportedByName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">담당자</p>
              <p className="text-sm font-medium">{fault.assignedToName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">등록일</p>
              <p className="text-sm">{new Date(fault.createdAt).toLocaleString('ko-KR')}</p>
            </div>
            {fault.resolvedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">해결일</p>
                <p className="text-sm">{new Date(fault.resolvedAt).toLocaleString('ko-KR')}</p>
              </div>
            )}
          </div>

          {fault.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">설명</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{fault.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상태 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>상태변경 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {fault.statusHistories.length === 0 ? (
            <p className="text-sm text-muted-foreground">이력이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {fault.statusHistories.map((h) => (
                <li key={h.id} className="border-l-4 border-primary/40 pl-4 py-1">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Badge variant={statusVariant[h.fromStatus]}>
                      {FAULT_STATUS_LABELS[h.fromStatus]}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant={statusVariant[h.toStatus]}>
                      {FAULT_STATUS_LABELS[h.toStatus]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">by {h.changedByName}</span>
                    <span className="text-muted-foreground/60 text-xs ml-auto">
                      {new Date(h.changedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {h.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{h.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showStatusModal && (
        <FaultStatusModal
          fault={fault}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false)
            queryClient.invalidateQueries({ queryKey: ['fault', faultId] })
          }}
        />
      )}
    </div>
  )
}
