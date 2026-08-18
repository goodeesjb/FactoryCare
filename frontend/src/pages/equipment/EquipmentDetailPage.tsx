import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, ArrowRight, Clock } from 'lucide-react'
import { equipmentApi } from '../../api/equipment'
import { EQUIPMENT_STATUS_LABELS } from '../../types/equipment'
import type { EquipmentStatus } from '../../types/equipment'
import StatusChangeModal from '../../components/equipment/StatusChangeModal'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

const STATUS_BADGE_VARIANT: Record<EquipmentStatus, 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  NORMAL: 'success',
  INSPECTION_NEEDED: 'warning',
  BROKEN: 'destructive',
  REPAIRING: 'info',
  DISCARDED: 'secondary',
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.getById(Number(id)),
    enabled: Boolean(id),
  })

  const { data: histories } = useQuery({
    queryKey: ['equipment-histories', id],
    queryFn: () => equipmentApi.getStatusHistories(Number(id)),
    enabled: Boolean(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => equipmentApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      navigate('/equipments')
    },
  })

  if (isLoading) {
    return <p className="p-6 py-16 text-center text-muted-foreground">로딩 중...</p>
  }
  if (!equipment) {
    return <p className="p-6 py-16 text-center text-red-500">설비를 찾을 수 없습니다.</p>
  }

  const fields = [
    { label: '설비번호', value: equipment.equipmentNo },
    { label: '설비유형', value: equipment.type?.name ?? '—' },
    { label: '제조사', value: equipment.manufacturer ?? '—' },
    { label: '모델명', value: equipment.modelName ?? '—' },
    { label: '설치일', value: equipment.installedAt ?? '—' },
    { label: '위치', value: equipment.location ?? '—' },
    { label: '관리부서', value: equipment.department ?? '—' },
    { label: '담당자', value: equipment.assignee?.name ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{equipment.name}</h1>
          <Badge variant={STATUS_BADGE_VARIANT[equipment.status]}>
            {EQUIPMENT_STATUS_LABELS[equipment.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            상태변경
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/equipments/${id}/edit`)}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('비활성화하시겠습니까?')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
            {fields.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-muted-foreground mb-0.5">{label}</dt>
                <dd className="text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {equipment.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <dt className="text-xs font-medium text-muted-foreground mb-0.5">설명</dt>
              <dd className="text-sm text-foreground leading-relaxed">{equipment.description}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상태변경 이력 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            상태변경 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {histories && histories.length > 0 ? (
            <ul className="space-y-0">
              {histories.map((h, index) => (
                <li key={h.id} className="relative flex gap-4">
                  {/* 타임라인 선 */}
                  {index < histories.length - 1 && (
                    <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />
                  )}
                  {/* 타임라인 도트 */}
                  <div className="relative z-10 mt-1 h-6 w-6 flex-shrink-0 rounded-full border-2 border-border bg-background" />
                  <div className="pb-6 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={STATUS_BADGE_VARIANT[h.previousStatus]}>
                        {EQUIPMENT_STATUS_LABELS[h.previousStatus]}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={STATUS_BADGE_VARIANT[h.newStatus]}>
                        {EQUIPMENT_STATUS_LABELS[h.newStatus]}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(h.changedAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="text-sm text-foreground">{h.reason}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">변경자: {h.changedByName}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">변경 이력이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <StatusChangeModal
          equipmentId={equipment.id}
          currentStatus={equipment.status}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
