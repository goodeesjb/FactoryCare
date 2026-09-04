import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { maintenanceApi } from '../../api/maintenance'
import { partApi, partUsageApi } from '../../api/parts'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '../../types/maintenance'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

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

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStartModal, setShowStartModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAddPartModal, setShowAddPartModal] = useState(false)
  const [startContent, setStartContent] = useState('')
  const [completeContent, setCompleteContent] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [partKeyword, setPartKeyword] = useState('')
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('')
  const [partQuantity, setPartQuantity] = useState(1)
  const [partNote, setPartNote] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemovePartId, setConfirmRemovePartId] = useState<number | null>(null)

  const { data: task, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getById(Number(id)),
  })

  const { data: partUsages } = useQuery({
    queryKey: ['maintenance', id, 'parts'],
    queryFn: () => partUsageApi.list(Number(id)),
    enabled: !!id,
  })

  const { data: partSearchResult } = useQuery({
    queryKey: ['parts', 'search', partKeyword],
    queryFn: () => partApi.search({ keyword: partKeyword || undefined, size: 20 }),
    enabled: showAddPartModal,
  })

  const selectedPart = partSearchResult?.content.find((p) => p.id === selectedPartId)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['maintenance', id] })

  const startMutation = useMutation({
    mutationFn: () => maintenanceApi.start(Number(id), { content: startContent }),
    onSuccess: () => {
      setShowStartModal(false)
      setStartContent('')
      invalidate()
      toast.success('작업이 시작되었습니다.')
    },
    onError: () => toast.error('작업 시작에 실패했습니다.'),
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      maintenanceApi.complete(Number(id), {
        content: completeContent,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      }),
    onSuccess: () => {
      setShowCompleteModal(false)
      setCompleteContent('')
      setDurationMinutes('')
      invalidate()
      toast.success('작업이 완료되었습니다.')
    },
    onError: () => toast.error('작업 완료 처리에 실패했습니다.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => maintenanceApi.cancel(Number(id)),
    onSuccess: () => {
      invalidate()
      setConfirmCancel(false)
      toast.success('작업이 취소되었습니다.')
    },
    onError: () => {
      setConfirmCancel(false)
      toast.error('작업 취소에 실패했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceApi.delete(Number(id)),
    onSuccess: () => {
      toast.success('작업이 삭제되었습니다.')
      navigate('/maintenance')
    },
    onError: () => {
      setConfirmDelete(false)
      toast.error('작업 삭제에 실패했습니다.')
    },
  })

  const addPartMutation = useMutation({
    mutationFn: () =>
      partUsageApi.create(Number(id), {
        partId: Number(selectedPartId),
        quantity: partQuantity,
        note: partNote || undefined,
      }),
    onSuccess: () => {
      setShowAddPartModal(false)
      setSelectedPartId('')
      setPartQuantity(1)
      setPartNote('')
      setPartKeyword('')
      queryClient.invalidateQueries({ queryKey: ['maintenance', id, 'parts'] })
      toast.success('부품이 추가되었습니다.')
    },
    onError: () => toast.error('부품 추가에 실패했습니다.'),
  })

  const removePartMutation = useMutation({
    mutationFn: (usageId: number) => partUsageApi.delete(Number(id), usageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id, 'parts'] })
      setConfirmRemovePartId(null)
      toast.success('부품 사용이 취소되었습니다.')
    },
    onError: () => {
      setConfirmRemovePartId(null)
      toast.error('부품 사용 취소에 실패했습니다.')
    },
  })

  if (isLoading) return <p className="p-6 text-muted-foreground">로딩 중...</p>
  if (!task) return <p className="p-6 text-muted-foreground">작업을 찾을 수 없습니다.</p>

  const isPending = task.status === 'PENDING'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isDone = task.status === 'COMPLETED' || task.status === 'CANCELLED'

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono mb-1">{task.taskNo}</p>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={statusVariant[task.status]}>{MAINTENANCE_STATUS_LABELS[task.status]}</Badge>
            <Badge variant={priorityVariant[task.priority]}>{MAINTENANCE_PRIORITY_LABELS[task.priority]}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{task.equipmentName}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {isPending && <Button onClick={() => setShowStartModal(true)}>작업 시작</Button>}
          {isInProgress && (
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => setShowCompleteModal(true)}
            >작업 완료</Button>
          )}
          {!isDone && (
            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => setConfirmCancel(true)}
            >취소</Button>
          )}
          {isPending && (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >삭제</Button>
          )}
        </div>
      </div>

      {/* 작업 정보 */}
      <Card className="mb-6">
        <CardHeader><CardTitle>작업 정보</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">상태</p>
              <Badge variant={statusVariant[task.status]}>{MAINTENANCE_STATUS_LABELS[task.status]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">우선순위</p>
              <Badge variant={priorityVariant[task.priority]}>{MAINTENANCE_PRIORITY_LABELS[task.priority]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">작업 유형</p>
              <p className="text-sm font-medium">{MAINTENANCE_TYPE_LABELS[task.taskType]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">담당자</p>
              <p className="text-sm font-medium">{task.assigneeName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">예정일</p>
              <p className="text-sm">{task.scheduledDate ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">등록자</p>
              <p className="text-sm">{task.createdByName}</p>
            </div>
            {task.faultId && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">연관 장애</p>
                <Link to={`/faults/${task.faultId}`} className="text-sm text-primary hover:underline">
                  장애 #{task.faultId} 보기
                </Link>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">완료일시</p>
                <p className="text-sm">{new Date(task.completedAt).toLocaleString('ko-KR')}</p>
              </div>
            )}
          </div>
          {task.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">설명</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사용 부품 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>사용 부품</CardTitle>
            {!isDone && (
              <Button size="sm" onClick={() => setShowAddPartModal(true)}>부품 추가</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!partUsages?.length ? (
            <p className="text-sm text-muted-foreground">등록된 사용 부품이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">부품명</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">부품번호</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">수량</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">메모</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록자</th>
                    {!isDone && <th className="pb-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {partUsages.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2">
                        <Link to={`/parts/${u.partId}`} className="text-primary hover:underline">
                          {u.partName}
                        </Link>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{u.partNo}</td>
                      <td className="py-2 font-medium">{u.quantity}</td>
                      <td className="py-2 text-muted-foreground">{u.note ?? '-'}</td>
                      <td className="py-2 text-muted-foreground">{u.usedByName}</td>
                      {!isDone && (
                        <td className="py-2">
                          <button
                            onClick={() => setConfirmRemovePartId(u.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            취소
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 작업 이력 */}
      <Card>
        <CardHeader><CardTitle>작업 이력</CardTitle></CardHeader>
        <CardContent>
          {task.histories.length === 0 ? (
            <p className="text-sm text-muted-foreground">이력이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {task.histories.map((h) => (
                <li
                  key={h.id}
                  className={`border-l-4 pl-4 py-2 ${h.type === 'START' ? 'border-blue-400' : 'border-green-400'}`}
                >
                  <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.type === 'START' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {h.type === 'START' ? '시작' : '완료'}
                    </span>
                    <span className="text-muted-foreground text-xs">by {h.recordedByName}</span>
                    {h.durationMinutes && (
                      <span className="text-muted-foreground text-xs">· {h.durationMinutes}분 소요</span>
                    )}
                    <span className="text-muted-foreground/60 text-xs ml-auto">
                      {new Date(h.recordedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{h.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 작업 시작 모달 */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>작업 시작</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={startContent}
                onChange={(e) => setStartContent(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="작업 시작 내용을 입력하세요 *"
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button onClick={() => startMutation.mutate()} disabled={!startContent.trim() || startMutation.isPending} className="flex-1">시작</Button>
              <Button variant="outline" onClick={() => setShowStartModal(false)} className="flex-1">취소</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 작업 완료 모달 */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>작업 완료</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                value={completeContent}
                onChange={(e) => setCompleteContent(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="작업 결과 및 소견을 입력하세요 *"
              />
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className={inputCls}
                placeholder="소요 시간 (분, 선택)"
                min={1}
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button className="bg-green-600 text-white hover:bg-green-700 flex-1" onClick={() => completeMutation.mutate()} disabled={!completeContent.trim() || completeMutation.isPending}>완료</Button>
              <Button variant="outline" onClick={() => setShowCompleteModal(false)} className="flex-1">취소</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 부품 추가 모달 */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>부품 추가</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">부품 검색</label>
                <input
                  value={partKeyword}
                  onChange={(e) => { setPartKeyword(e.target.value); setSelectedPartId('') }}
                  className={inputCls}
                  placeholder="부품명 또는 제조사"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">부품 선택 *</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">부품을 선택하세요</option>
                  {partSearchResult?.content.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.partNo}) — 재고: {p.stockQuantity}
                    </option>
                  ))}
                </select>
                {selectedPart && (
                  <p className={`text-xs mt-1 ${selectedPart.stockStatus === 'OUT' ? 'text-destructive' : selectedPart.stockStatus === 'LOW' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    현재 재고: {selectedPart.stockQuantity}개
                    {selectedPart.stockStatus === 'LOW' && ' (부족)'}
                    {selectedPart.stockStatus === 'OUT' && ' (소진)'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">수량 *</label>
                <input
                  type="number"
                  min={1}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">메모</label>
                <input
                  value={partNote}
                  onChange={(e) => setPartNote(e.target.value)}
                  className={inputCls}
                  placeholder="선택 사항"
                />
              </div>
            </CardContent>
            <CardFooter className="gap-3">
              <Button
                onClick={() => addPartMutation.mutate()}
                disabled={!selectedPartId || partQuantity < 1 || addPartMutation.isPending}
                className="flex-1"
              >
                {addPartMutation.isPending ? '추가 중...' : '추가'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowAddPartModal(false); setSelectedPartId(''); setPartKeyword('') }}
                className="flex-1"
              >
                취소
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="작업 취소"
        description="작업을 취소하시겠습니까?"
        confirmLabel="취소 처리"
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancel(false)}
        loading={cancelMutation.isPending}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="작업 삭제"
        description="작업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={confirmRemovePartId !== null}
        title="부품 사용 취소"
        description="사용 취소 시 재고가 복구됩니다. 취소하시겠습니까?"
        confirmLabel="취소 처리"
        onConfirm={() => confirmRemovePartId !== null && removePartMutation.mutate(confirmRemovePartId)}
        onCancel={() => setConfirmRemovePartId(null)}
        loading={removePartMutation.isPending}
      />
    </div>
  )
}
