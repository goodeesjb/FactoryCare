import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import {
  EQUIPMENT_STATUS_LABELS,
  type EquipmentSearchParams,
  type EquipmentStatus,
} from '../../types/equipment'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

const STATUS_OPTIONS: EquipmentStatus[] = [
  'NORMAL',
  'INSPECTION_NEEDED',
  'BROKEN',
  'REPAIRING',
  'DISCARDED',
]

const STATUS_BADGE_VARIANT: Record<EquipmentStatus, 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  NORMAL: 'success',
  INSPECTION_NEEDED: 'warning',
  BROKEN: 'destructive',
  REPAIRING: 'info',
  DISCARDED: 'secondary',
}

const inputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

export default function EquipmentListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<EquipmentSearchParams>({ page: 0, size: 10 })
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['equipments', params],
    queryFn: () => equipmentApi.search(params),
  })

  const { data: types } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: equipmentTypeApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => equipmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      setDeleteTargetId(null)
      toast.success('설비가 삭제되었습니다.')
    },
    onError: () => {
      setDeleteTargetId(null)
      toast.error('설비 삭제에 실패했습니다.')
    },
  })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setParams({
      page: 0,
      size: 10,
      equipmentNo: (fd.get('equipmentNo') as string) || undefined,
      name: (fd.get('name') as string) || undefined,
      typeId: fd.get('typeId') ? Number(fd.get('typeId')) : undefined,
      status: (fd.get('status') as EquipmentStatus) || undefined,
      location: (fd.get('location') as string) || undefined,
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">설비 목록</h1>
          <p className="mt-1 text-sm text-muted-foreground">등록된 설비를 검색하고 관리합니다.</p>
        </div>
        <Button onClick={() => navigate('/equipments/new')}>
          <Plus className="mr-2 h-4 w-4" />
          설비 등록
        </Button>
      </div>

      {/* 검색 필터 */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="grid grid-cols-3 gap-3">
            <input
              name="equipmentNo"
              placeholder="설비번호"
              className={inputClass}
            />
            <input
              name="name"
              placeholder="설비명"
              className={inputClass}
            />
            <select name="typeId" className={inputClass}>
              <option value="">전체 유형</option>
              {types?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select name="status" className={inputClass}>
              <option value="">전체 상태</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <input
              name="location"
              placeholder="위치"
              className={inputClass}
            />
            <Button type="submit" variant="secondary" className="h-9">
              <Search className="mr-2 h-4 w-4" />
              검색
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 목록 테이블 */}
      {isLoading ? (
        <p className="py-16 text-center text-muted-foreground">로딩 중...</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {['설비번호', '설비명', '유형', '위치', '담당자', '상태', '작업'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.content.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                    {data?.content.map((eq) => (
                      <tr key={eq.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{eq.equipmentNo}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{eq.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{eq.type?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{eq.location ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{eq.assignee?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE_VARIANT[eq.status]}>
                            {EQUIPMENT_STATUS_LABELS[eq.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/equipments/${eq.id}`)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              상세
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/equipments/${eq.id}/edit`)}
                              className="h-7 px-2 text-xs"
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              수정
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTargetId(eq.id)}
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data?.first}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) - 1 }))}
            >
              이전
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data?.last}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) + 1 }))}
            >
              다음
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="설비 삭제"
        description="설비를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={() => deleteTargetId !== null && deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
