import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionApi, inspectionChecklistApi, inspectionScheduleApi } from '../../api/inspection'
import { RESULT_COLORS, type InspectionResultValue } from '../../types/inspection'
import type { InspectionChecklist } from '../../types/inspection'

const RESULT_OPTIONS: InspectionResultValue[] = ['PASS', 'FAIL', 'SKIPPED']
const RESULT_LABELS: Record<InspectionResultValue, string> = { PASS: '정상', FAIL: '이상', SKIPPED: '미실시' }

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspectionApi.getById(Number(id)),
  })

  const [resultMap, setResultMap] = useState<Record<number, { result: InspectionResultValue; note: string }>>({})

  const completeMutation = useMutation({
    mutationFn: (data: Parameters<typeof inspectionApi.complete>[1]) =>
      inspectionApi.complete(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection', id] })
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
    },
  })

  if (isLoading) return <div className="p-6 text-center text-gray-500">로딩 중...</div>
  if (!inspection) return <div className="p-6 text-center text-red-500">점검을 찾을 수 없습니다.</div>

  const isCompleted = inspection.status === 'COMPLETED'

  const handleComplete = () => {
    const results = Object.entries(resultMap).map(([itemId, v]) => ({
      checklistItemId: Number(itemId),
      result: v.result,
      note: v.note || undefined,
    }))
    if (results.length === 0) {
      alert('점검 결과를 입력하세요.')
      return
    }
    completeMutation.mutate({ results })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">점검 수행</h1>
        <p className="text-sm text-gray-500 mt-1">담당자: {inspection.inspectorName}</p>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isCompleted ? '완료' : '진행중'}
          </span>
          {isCompleted && inspection.hasAbnormality && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              이상 발견
            </span>
          )}
        </div>
      </div>

      {isCompleted ? (
        <div className="space-y-3">
          <h2 className="font-medium text-gray-700">점검 결과</h2>
          {inspection.results.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{r.itemName}</p>
                {r.note && <p className="text-xs text-gray-500 mt-1">{r.note}</p>}
                {r.needsFaultReport && (
                  <span className="text-xs text-red-600 font-medium">⚠ 장애 보고 필요</span>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_COLORS[r.result]}`}>
                {RESULT_LABELS[r.result]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ChecklistForm
          scheduleId={inspection.scheduleId}
          resultMap={resultMap}
          setResultMap={setResultMap}
          onComplete={handleComplete}
          isPending={completeMutation.isPending}
        />
      )}

      <button onClick={() => navigate(-1)} className="mt-6 text-sm text-gray-500 hover:underline">
        ← 돌아가기
      </button>
    </div>
  )
}

function ChecklistForm({
  scheduleId,
  resultMap,
  setResultMap,
  onComplete,
  isPending,
}: {
  scheduleId: number
  resultMap: Record<number, { result: InspectionResultValue; note: string }>
  setResultMap: React.Dispatch<React.SetStateAction<Record<number, { result: InspectionResultValue; note: string }>>>
  onComplete: () => void
  isPending: boolean
}) {
  const { data: checklist } = useQuery<InspectionChecklist | null>({
    queryKey: ['schedule-checklist', scheduleId],
    queryFn: async () => {
      const schedule = await inspectionScheduleApi.getById(scheduleId)
      const cl = await inspectionChecklistApi.getById(schedule.checklistId)
      return cl
    },
  })

  return (
    <div className="space-y-3">
      <h2 className="font-medium text-gray-700">점검 항목 입력</h2>
      {checklist?.items.map((item) => {
        const val = resultMap[item.id] ?? { result: 'PASS' as InspectionResultValue, note: '' }
        return (
          <div key={item.id} className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">
              {item.itemOrder}. {item.itemName}
            </p>
            <div className="flex gap-2">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setResultMap((m) => ({ ...m, [item.id]: { ...val, result: opt } }))
                  }
                  className={`rounded px-3 py-1 text-xs font-medium border transition-colors ${
                    val.result === opt
                      ? RESULT_COLORS[opt] + ' border-transparent'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {RESULT_LABELS[opt]}
                </button>
              ))}
            </div>
            {val.result === 'FAIL' && (
              <input
                value={val.note}
                onChange={(e) =>
                  setResultMap((m) => ({ ...m, [item.id]: { ...val, note: e.target.value } }))
                }
                placeholder="이상 내용 입력"
                className="w-full rounded border px-3 py-1 text-sm text-red-700"
              />
            )}
          </div>
        )
      })}
      {!checklist && <p className="text-gray-400 text-sm">체크리스트 항목 로딩 중...</p>}
      <button
        onClick={onComplete}
        disabled={isPending || !checklist}
        className="mt-4 rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '저장 중...' : '점검 완료'}
      </button>
    </div>
  )
}