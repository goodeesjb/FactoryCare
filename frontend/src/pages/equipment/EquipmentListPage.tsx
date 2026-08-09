import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  type EquipmentSearchParams,
  type EquipmentStatus,
} from '../../types/equipment'

const STATUS_OPTIONS: EquipmentStatus[] = [
  'NORMAL',
  'INSPECTION_NEEDED',
  'BROKEN',
  'REPAIRING',
  'DISCARDED',
]

export default function EquipmentListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<EquipmentSearchParams>({ page: 0, size: 10 })

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">설비 목록</h1>
        <button
          onClick={() => navigate('/equipments/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          설비 등록
        </button>
      </div>

      {/* 검색 필터 */}
      <form onSubmit={handleSearch} className="mb-6 grid grid-cols-3 gap-3 rounded-lg border bg-gray-50 p-4">
        <input name="equipmentNo" placeholder="설비번호" className="rounded border px-3 py-2 text-sm" />
        <input name="name" placeholder="설비명" className="rounded border px-3 py-2 text-sm" />
        <select name="typeId" className="rounded border px-3 py-2 text-sm">
          <option value="">전체 유형</option>
          {types?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="status" className="rounded border px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input name="location" placeholder="위치" className="rounded border px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          검색
        </button>
      </form>

      {/* 목록 테이블 */}
      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['설비번호', '설비명', '유형', '위치', '담당자', '상태', '작업'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.content.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{eq.equipmentNo}</td>
                    <td className="px-4 py-3">{eq.name}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.type?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.assignee?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[eq.status]}`}>
                        {EQUIPMENT_STATUS_LABELS[eq.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/equipments/${eq.id}`)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => navigate(`/equipments/${eq.id}/edit`)}
                        className="mr-2 text-gray-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('비활성화하시겠습니까?')) deleteMutation.mutate(eq.id)
                        }}
                        className="text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              disabled={data?.first}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
            </span>
            <button
              disabled={data?.last}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) + 1 }))}
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
