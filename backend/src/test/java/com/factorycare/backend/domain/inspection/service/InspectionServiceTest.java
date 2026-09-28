package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.fault.service.FaultService;
import com.factorycare.backend.domain.inspection.dto.InspectionCompleteRequest;
import com.factorycare.backend.domain.inspection.dto.InspectionResultRequest;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import com.factorycare.backend.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class InspectionServiceTest {

    @InjectMocks InspectionService inspectionService;
    @Mock InspectionRepository inspectionRepository;
    @Mock InspectionResultRepository resultRepository;
    @Mock InspectionChecklistItemRepository checklistItemRepository;
    @Mock InspectionScheduleRepository scheduleRepository;
    @Mock FaultService faultService;

    Inspection inspection;
    InspectionSchedule schedule;
    User inspector;
    InspectionChecklistItem item1, item2;

    @BeforeEach
    void setUp() {
        inspector = mock(User.class);

        schedule = mock(InspectionSchedule.class);

        inspection = Inspection.builder().schedule(schedule).inspector(inspector).build();

        item1 = mock(InspectionChecklistItem.class);
        item2 = mock(InspectionChecklistItem.class);

        given(inspectionRepository.findById(1L)).willReturn(Optional.of(inspection));
    }

    @Test
    @DisplayName("FAIL 결과 포함 완료 → faultService.createFromInspectionResult 호출")
    void complete_withFail_callsFaultService() {
        given(inspector.getId()).willReturn(1L);
        given(item1.getId()).willReturn(1L);
        given(item1.getItemName()).willReturn("모터 온도");
        given(item2.getId()).willReturn(2L);
        given(item2.getItemName()).willReturn("오일 누유");

        given(resultRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(checklistItemRepository.findById(1L)).willReturn(Optional.of(item1));
        given(checklistItemRepository.findById(2L)).willReturn(Optional.of(item2));

        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.PASS, null),
            new InspectionResultRequest(2L, InspectionResultValue.FAIL, "오일 누유 발견")
        ));

        inspectionService.complete(1L, req);

        verify(faultService, times(1)).createFromInspectionResult(any(InspectionResult.class), eq(inspector));
        assertThat(inspection.getStatus()).isEqualTo(InspectionStatus.COMPLETED);
        assertThat(inspection.isHasAbnormality()).isTrue();
    }

    @Test
    @DisplayName("PASS만 완료 → faultService 미호출, hasAbnormality=false")
    void complete_allPass_noFaultCreated() {
        given(inspector.getId()).willReturn(1L);
        given(item1.getId()).willReturn(1L);
        given(item1.getItemName()).willReturn("모터 온도");
        given(item2.getId()).willReturn(2L);
        given(item2.getItemName()).willReturn("오일 누유");

        given(resultRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(checklistItemRepository.findById(1L)).willReturn(Optional.of(item1));
        given(checklistItemRepository.findById(2L)).willReturn(Optional.of(item2));

        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.PASS, null),
            new InspectionResultRequest(2L, InspectionResultValue.PASS, null)
        ));

        inspectionService.complete(1L, req);

        verify(faultService, never()).createFromInspectionResult(any(), any());
        assertThat(inspection.isHasAbnormality()).isFalse();
    }

    @Test
    @DisplayName("FAIL 2개 완료 → faultService 2번 호출")
    void complete_twoFails_calledTwice() {
        given(inspector.getId()).willReturn(1L);
        given(item1.getId()).willReturn(1L);
        given(item1.getItemName()).willReturn("모터 온도");
        given(item2.getId()).willReturn(2L);
        given(item2.getItemName()).willReturn("오일 누유");

        given(resultRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(checklistItemRepository.findById(1L)).willReturn(Optional.of(item1));
        given(checklistItemRepository.findById(2L)).willReturn(Optional.of(item2));

        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.FAIL, "고온"),
            new InspectionResultRequest(2L, InspectionResultValue.FAIL, "누유")
        ));

        inspectionService.complete(1L, req);

        verify(faultService, times(2)).createFromInspectionResult(any(InspectionResult.class), eq(inspector));
    }

    @Test
    @DisplayName("이미 완료된 점검 재완료 시도 → IllegalStateException")
    void complete_alreadyCompleted_throws() {
        inspection.complete(false);

        assertThatThrownBy(() ->
            inspectionService.complete(1L, new InspectionCompleteRequest(List.of(
                new InspectionResultRequest(1L, InspectionResultValue.PASS, null)
            ))))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("이미 완료된 점검");
    }
}
