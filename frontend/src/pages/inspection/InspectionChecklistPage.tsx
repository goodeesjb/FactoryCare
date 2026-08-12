import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionChecklistApi } from '../../api/inspection'

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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">체크리스트 템플릿</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '+ 새 템플릿'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">템플릿명 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="예: 컨베이어 일일 점검"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              점검 항목 * (한 줄에 하나씩)
            </label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={5}
              className="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder={'모터 온도\n벨트 장력\n오일 누유'}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <div className="space-y-3">
          {checklists?.map((cl) => (
            <div key={cl.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{cl.name}</h3>
                  {cl.description && (
                    <p className="text-sm text-gray-500 mt-1">{cl.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cl.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >
                        {item.itemOrder}. {item.itemName}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(cl.id)
                  }}
                  className="text-sm text-red-500 hover:underline ml-4"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {checklists?.length === 0 && (
            <p className="text-center text-gray-400">등록된 체크리스트가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
