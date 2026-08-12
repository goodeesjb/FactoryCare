import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { inspectionScheduleApi } from '../../api/inspection'
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  SCHEDULE_TYPE_LABELS,
  type InspectionScheduleStatus,
} from '../../types/inspection'

const STATUS_OPTIONS: InspectionScheduleStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']

export default function InspectionScheduleListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<{ page: number; size: number; status?: InspectionScheduleStatus }>({
    page: 0,
    size: 10,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inspection-schedules', params],
    queryFn: () => inspectionScheduleApi.search(params),
  })

  const startMutation = useMutation({
    mutationFn: inspectionScheduleApi.start,
    onSuccess: (inspection) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
      navigate(`/inspections/${inspection.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: inspectionScheduleApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">점검 일정</h1>
        <button
          onClick={() => navigate('/inspection-schedules/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          일정 등록
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({ ...p, page: 0, status: (e.target.value as InspectionScheduleStatus) || undefined }))
          }
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{SCHEDULE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['설비', '체크리스트', '담당자', '예정일', '유형', '상태', '작업'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.content.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{s.equipmentName}</td>
                    <td className="px-4 py-3 text-gray-500">{s.checklistName}</td>
                    <td className="px-4 py-3 text-gray-500">{s.assigneeName}</td>
                    <td className="px-4 py-3 font-mono text-sm">{s.scheduledDate}</td>
                    <td className="px-4 py-3 text-gray-500">{SCHEDULE_TYPE_LABELS[s.inspectionType]}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCHEDULE_STATUS_COLORS[s.status]}`}>
                        {SCHEDULE_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {s.status === 'SCHEDULED' && (
                        <button
                          onClick={() => startMutation.mutate(s.id)}
                          className="text-blue-600 hover:underline"
                        >
                          점검 시작
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(s.id) }}
                        className="text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.content.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      등록된 점검 일정이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              disabled={data?.first}
              onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
            </span>
            <button
              disabled={data?.last}
              onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  )
}
