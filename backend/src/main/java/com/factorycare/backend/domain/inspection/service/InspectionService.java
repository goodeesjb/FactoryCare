package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InspectionService {

    private final InspectionRepository inspectionRepository;
    private final InspectionResultRepository resultRepository;
    private final InspectionChecklistItemRepository checklistItemRepository;
    private final InspectionScheduleRepository scheduleRepository;

    public InspectionService(InspectionRepository inspectionRepository,
                             InspectionResultRepository resultRepository,
                             InspectionChecklistItemRepository checklistItemRepository,
                             InspectionScheduleRepository scheduleRepository) {
        this.inspectionRepository = inspectionRepository;
        this.resultRepository = resultRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.scheduleRepository = scheduleRepository;
    }

    @Transactional(readOnly = true)
    public List<InspectionResponse> findAll() {
        return inspectionRepository.findAll().stream()
            .map(InspectionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InspectionResponse findById(Long id) {
        Inspection inspection = getInspection(id);
        List<InspectionResultResponse> results = resultRepository
            .findByInspectionIdOrderByChecklistItemItemOrderAsc(id)
            .stream().map(InspectionResultResponse::from).toList();
        return InspectionResponse.from(inspection, results);
    }

    @Transactional
    public InspectionResponse complete(Long id, InspectionCompleteRequest req) {
        Inspection inspection = getInspection(id);
        if (inspection.getStatus() == InspectionStatus.COMPLETED) {
            throw new IllegalStateException("이미 완료된 점검입니다.");
        }

        List<InspectionResult> results = req.results().stream().map(r -> {
            InspectionChecklistItem item = checklistItemRepository.findById(r.checklistItemId())
                .orElseThrow(() -> new IllegalArgumentException("점검 항목을 찾을 수 없습니다. id=" + r.checklistItemId()));
            return InspectionResult.builder()
                .inspection(inspection).checklistItem(item)
                .itemName(item.getItemName()).result(r.result()).note(r.note())
                .build();
        }).toList();

        resultRepository.saveAll(results);

        boolean hasAbnormality = results.stream()
            .anyMatch(r -> r.getResult() == InspectionResultValue.FAIL);
        inspection.complete(hasAbnormality);

        inspection.getSchedule().complete();
        scheduleRepository.save(inspection.getSchedule());

        List<InspectionResultResponse> resultResponses = results.stream()
            .map(InspectionResultResponse::from).toList();
        return InspectionResponse.from(inspection, resultResponses);
    }

    private Inspection getInspection(Long id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("점검을 찾을 수 없습니다. id=" + id));
    }
}