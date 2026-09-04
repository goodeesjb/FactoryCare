import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { partApi } from '../../api/parts'
import { STOCK_STATUS_LABELS } from '../../types/parts'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStockModal, setShowStockModal] = useState(false)
  const [newQuantity, setNewQuantity] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: part, isLoading } = useQuery({
    queryKey: ['parts', id],
    queryFn: () => partApi.getById(Number(id)),
  })

  const { data: usages } = useQuery({
    queryKey: ['parts', id, 'usages'],
    queryFn: () => partApi.getUsages(Number(id)),
    enabled: !!id,
  })

  const adjustStockMutation = useMutation({
    mutationFn: () => partApi.adjustStock(Number(id), { newQuantity: Number(newQuantity) }),
    onSuccess: () => {
      setShowStockModal(false)
      setNewQuantity('')
      queryClient.invalidateQueries({ queryKey: ['parts', id] })
      toast.success('재고가 조정되었습니다.')
    },
    onError: () => toast.error('재고 조정에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => partApi.delete(Number(id)),
    onSuccess: () => {
      toast.success('부품이 삭제되었습니다.')
      navigate('/parts')
    },
    onError: () => {
      setConfirmDelete(false)
      toast.error('부품 삭제에 실패했습니다.')
    },
  })

  if (isLoading) return <p className="p-6 text-muted-foreground">로딩 중...</p>
  if (!part) return <p className="p-6 text-muted-foreground">부품을 찾을 수 없습니다.</p>

  const stockVariant =
    part.stockStatus === 'OUT'
      ? 'destructive'
      : part.stockStatus === 'LOW'
        ? 'orange'
        : 'success'

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">{part.partNo}</p>
          <h1 className="text-2xl font-bold tracking-tight">{part.name}</h1>
          {part.manufacturer && (
            <p className="text-sm text-muted-foreground mt-1">{part.manufacturer}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => navigate(`/parts/${id}/edit`)}>
            수정
          </Button>
          <Button onClick={() => setShowStockModal(true)}>재고 조정</Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            삭제
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>부품 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">현재 재고</p>
              <p className="text-2xl font-bold">{part.stockQuantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">재고 상태</p>
              <Badge variant={stockVariant}>{STOCK_STATUS_LABELS[part.stockStatus]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">최소재고</p>
              <p className="text-sm font-medium">{part.minimumStock}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">보관위치</p>
              <p className="text-sm font-medium">{part.storageLocation ?? '-'}</p>
            </div>
          </div>
          {part.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">설명</p>
              <p className="text-sm whitespace-pre-wrap">{part.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {!usages?.length ? (
            <p className="text-sm text-muted-foreground">사용 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">작업번호</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">수량</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">메모</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록자</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usages.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2">
                        <Link
                          to={`/maintenance/${u.maintenanceTaskId}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {u.maintenanceTaskNo}
                        </Link>
                      </td>
                      <td className="py-2 font-medium">{u.quantity}</td>
                      <td className="py-2 text-muted-foreground">{u.note ?? '-'}</td>
                      <td className="py-2 text-muted-foreground">{u.usedByName}</td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {new Date(u.usedAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>재고 조정</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                현재 재고: <span className="font-bold text-foreground">{part.stockQuantity}</span>
              </p>
              <input
                type="number"
                min={0}
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className={inputCls}
                placeholder="새 재고 수량"
                autoFocus
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button
                onClick={() => adjustStockMutation.mutate()}
                disabled={newQuantity === '' || adjustStockMutation.isPending}
                className="flex-1"
              >
                {adjustStockMutation.isPending ? '처리 중...' : '확인'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStockModal(false)
                  setNewQuantity('')
                }}
                className="flex-1"
              >
                취소
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="부품 삭제"
        description="부품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
