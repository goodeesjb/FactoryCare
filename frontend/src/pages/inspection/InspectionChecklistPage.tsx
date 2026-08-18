import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Trash2, X, CheckSquare } from 'lucide-react'
import { inspectionChecklistApi } from '../../api/inspection'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

export default function InspectionChecklistPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemsText, setItemsText] = useState('')

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: inspectionChecklistApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: inspectionChecklistApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-checklists'] })
      setShowForm(false)
      setName('')
      setDescription('')
      setItemsText('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: inspectionChecklistApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection-checklists'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const itemNames = itemsText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (itemNames.length === 0) return alert('점검 항목을 1개 이상 입력하세요.')
    createMutation.mutate({ name, description: description || undefined, itemNames })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">체크리스트 템플릿</h1>
            <p className="text-sm text-muted-foreground">점검 항목 템플릿을 관리합니다</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? 'outline' : 'default'}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              취소
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              체크리스트 추가
            </>
          )}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>새 체크리스트 템플릿</CardTitle>
            <CardDescription>템플릿명과 점검 항목을 입력하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">템플릿명 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="예: 컨베이어 일일 점검"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">설명</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="템플릿 설명 (선택)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  점검 항목 * <span className="text-muted-foreground font-normal">(한 줄에 하나씩)</span>
                </label>
                <textarea
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={'모터 온도\n벨트 장력\n오일 누유'}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? '저장 중...' : '저장'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <span className="text-sm">로딩 중...</span>
        </div>
      ) : checklists?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">등록된 체크리스트가 없습니다.</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              첫 템플릿 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checklists?.map((cl) => (
            <Card key={cl.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-base truncate">{cl.name}</h3>
                      <Badge variant="secondary">{cl.items.length}개 항목</Badge>
                    </div>
                    {cl.description && (
                      <p className="text-sm text-muted-foreground mb-3 ml-6">{cl.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 ml-6 mt-2">
                      {cl.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          <span className="font-mono text-primary/60">{item.itemOrder}.</span>
                          {item.itemName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => {
                      if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(cl.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
