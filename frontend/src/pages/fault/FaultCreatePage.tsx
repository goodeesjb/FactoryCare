import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import { equipmentApi } from '../../api/equipment'
import { FAULT_SEVERITY_LABELS, type FaultSeverity } from '../../types/fault'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export default function FaultCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    severity: 'MEDIUM' as FaultSeverity,
  })
  const [error, setError] = useState<string | null>(null)

  const { data: equipmentPage } = useQuery({
    queryKey: ['equipments', { size: 100 }],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      faultApi.create({
        equipmentId: Number(form.equipmentId),
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
      }),
    onSuccess: (res) => navigate(`/faults/${res.id}`),
    onError: () => setError('장애 등록에 실패했습니다.'),
  })

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">장애 등록</h1>
        <p className="text-muted-foreground text-sm mt-1">새 장애를 접수합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>장애 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutate()
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">
                설비 <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={form.equipmentId}
                onChange={(e) => setForm((f) => ({ ...f, equipmentId: e.target.value }))}
                className={inputCls}
              >
                <option value="">설비 선택</option>
                {equipmentPage?.content.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.equipmentNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                제목 <span className="text-destructive">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputCls}
                placeholder="장애 제목을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">긴급도</label>
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, severity: e.target.value as FaultSeverity }))
                }
                className={inputCls}
              >
                {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
                  <option key={s} value={s}>
                    {FAULT_SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="장애 상세 설명 (선택)"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '등록 중...' : '등록'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/faults')}
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
