import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { partApi } from '../../api/parts'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    manufacturer: '',
    stockQuantity: 0,
    minimumStock: 0,
    storageLocation: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['parts', id],
    queryFn: () => partApi.getById(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        manufacturer: existing.manufacturer ?? '',
        stockQuantity: existing.stockQuantity,
        minimumStock: existing.minimumStock,
        storageLocation: existing.storageLocation ?? '',
        description: existing.description ?? '',
      })
    }
  }, [existing])

  const createMutation = useMutation({
    mutationFn: () =>
      partApi.create({
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        stockQuantity: form.stockQuantity,
        minimumStock: form.minimumStock,
        storageLocation: form.storageLocation || undefined,
        description: form.description || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('부품이 등록되었습니다.')
      navigate(`/parts/${res.id}`)
    },
    onError: () => {
      setError('부품 등록에 실패했습니다.')
      toast.error('부품 등록에 실패했습니다.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      partApi.update(Number(id), {
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        minimumStock: form.minimumStock,
        storageLocation: form.storageLocation || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('부품 정보가 수정되었습니다.')
      navigate(`/parts/${id}`)
    },
    onError: () => {
      setError('부품 수정에 실패했습니다.')
      toast.error('부품 수정에 실패했습니다.')
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? '부품 수정' : '부품 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              isEdit ? updateMutation.mutate() : createMutation.mutate()
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">부품명 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="볼베어링 6204"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">제조사</label>
              <input
                value={form.manufacturer}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                className={inputCls}
                placeholder="NSK"
              />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">초기 재고수량 *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))
                  }
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">최소재고 (경고 기준)</label>
              <input
                type="number"
                min={0}
                value={form.minimumStock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minimumStock: Number(e.target.value) }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">보관위치</label>
              <input
                value={form.storageLocation}
                onChange={(e) => setForm((f) => ({ ...f, storageLocation: e.target.value }))}
                className={inputCls}
                placeholder="A-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit ? `/parts/${id}` : '/parts')}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
