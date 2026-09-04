import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import type { EquipmentCreateRequest } from '../../types/equipment'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { cn } from '../../lib/utils'

const inputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground'

const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'
const errorClass = 'mt-1 text-xs text-red-500'

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
      toast.success('설비가 등록되었습니다.')
      navigate(`/equipments/${res.id}`)
    },
    onError: () => toast.error('설비 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: EquipmentCreateRequest) => equipmentApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
      toast.success('설비 정보가 수정되었습니다.')
      navigate(`/equipments/${id}`)
    },
    onError: () => toast.error('설비 수정에 실패했습니다.'),
  })

  const onSubmit = (data: EquipmentCreateRequest) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? '설비 수정' : '설비 등록'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit ? '설비 정보를 수정합니다.' : '새로운 설비를 등록합니다.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 필수 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기본 정보</CardTitle>
            <CardDescription>설비를 식별하는 필수 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className={labelClass}>
                설비번호 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('equipmentNo', { required: '설비번호는 필수입니다.' })}
                disabled={isEdit}
                placeholder="예) EQ-001"
                className={cn(inputClass, errors.equipmentNo && 'border-red-400 focus:ring-red-400/20 focus:border-red-400')}
              />
              {errors.equipmentNo && <p className={errorClass}>{errors.equipmentNo.message}</p>}
            </div>

            <div>
              <label className={labelClass}>
                설비명 <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name', { required: '설비명은 필수입니다.' })}
                placeholder="예) CNC 선반 1호기"
                className={cn(inputClass, errors.name && 'border-red-400 focus:ring-red-400/20 focus:border-red-400')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>설비유형</label>
              <select
                {...register('typeId', { setValueAs: (v) => v ? Number(v) : undefined })}
                className={inputClass}
              >
                <option value="">선택 안함</option>
                {types?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 상세 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">상세 정보</CardTitle>
            <CardDescription>제조사, 설치 위치 등 상세 정보를 입력합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>제조사</label>
                <input
                  {...register('manufacturer')}
                  placeholder="예) 현대중공업"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>모델명</label>
                <input
                  {...register('modelName')}
                  placeholder="예) HiECO-400"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>위치</label>
                <input
                  {...register('location')}
                  placeholder="예) 1공장 A라인"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>관리부서</label>
                <input
                  {...register('department')}
                  placeholder="예) 생산관리팀"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>설치일</label>
              <input
                type="date"
                {...register('installedAt')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>설명</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="설비에 대한 추가 설명을 입력하세요."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? '처리 중...' : isEdit ? '수정 완료' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
