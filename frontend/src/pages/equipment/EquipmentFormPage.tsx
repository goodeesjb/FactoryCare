import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import type { EquipmentCreateRequest } from '../../types/equipment'

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EquipmentCreateRequest>()

  const { data: existing } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: types } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: equipmentTypeApi.getAll,
  })

  useEffect(() => {
    if (existing) {
      reset({
        equipmentNo: existing.equipmentNo,
        name: existing.name,
        typeId: existing.type?.id,
        manufacturer: existing.manufacturer ?? '',
        modelName: existing.modelName ?? '',
        installedAt: existing.installedAt ?? '',
        location: existing.location ?? '',
        department: existing.department ?? '',
        assigneeId: existing.assignee?.id,
        description: existing.description ?? '',
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (data: EquipmentCreateRequest) => equipmentApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      navigate(`/equipments/${res.id}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: EquipmentCreateRequest) => equipmentApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
      navigate(`/equipments/${id}`)
    },
  })

  const onSubmit = (data: EquipmentCreateRequest) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        {isEdit ? '설비 수정' : '설비 등록'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비번호 *</label>
          <input
            {...register('equipmentNo', { required: '설비번호는 필수입니다.' })}
            disabled={isEdit}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
          />
          {errors.equipmentNo && <p className="mt-1 text-xs text-red-500">{errors.equipmentNo.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비명 *</label>
          <input
            {...register('name', { required: '설비명은 필수입니다.' })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비유형</label>
          <select {...register('typeId', { setValueAs: (v) => v ? Number(v) : undefined })}
            className="w-full rounded border px-3 py-2 text-sm">
            <option value="">선택 안함</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {[
          { field: 'manufacturer' as const, label: '제조사' },
          { field: 'modelName' as const, label: '모델명' },
          { field: 'location' as const, label: '위치' },
          { field: 'department' as const, label: '관리부서' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input {...register(field)} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설치일</label>
          <input type="date" {...register('installedAt')} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
          <textarea {...register('description')} rows={3} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
