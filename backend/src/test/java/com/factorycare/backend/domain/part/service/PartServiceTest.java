package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class PartServiceTest {

    @InjectMocks PartService partService;
    @Mock PartRepository partRepository;

    private Part buildPart(int stock, int minimum) {
        return Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(stock).minimumStock(minimum).build();
    }

    @Test
    @DisplayName("부품 생성 — partNo PT-YYYY-NNN 형식")
    void create_partNoFormat() {
        PartCreateRequest req = new PartCreateRequest("베어링A", "한국부품", 100, 10, "A창고", null);
        given(partRepository.countByCreatedAtBetween(any(), any())).willReturn(0L);
        given(partRepository.save(any(Part.class))).willAnswer(inv -> inv.getArgument(0));

        PartResponse resp = partService.create(req);

        assertThat(resp.partNo()).matches("PT-\\d{4}-\\d{3}");
        assertThat(resp.name()).isEqualTo("베어링A");
    }

    @Test
    @DisplayName("재고 조정 — 새 수량으로 변경")
    void adjustStock_success() {
        Part part = buildPart(50, 10);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        PartResponse resp = partService.adjustStock(1L, new PartStockAdjustRequest(30));

        assertThat(resp.stockQuantity()).isEqualTo(30);
    }

    @Test
    @DisplayName("재고 조정 — 음수 입력 → IllegalArgumentException")
    void adjustStock_negative_throws() {
        Part part = buildPart(50, 10);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        assertThatThrownBy(() -> partService.adjustStock(1L, new PartStockAdjustRequest(-1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("0 이상");
    }

    @Test
    @DisplayName("부품 삭제 — active=false (소프트삭제)")
    void delete_softDelete() {
        Part part = buildPart(10, 5);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        partService.delete(1L);

        assertThat(part.isActive()).isFalse();
        verify(partRepository, never()).delete(any());
    }

    @Test
    @DisplayName("삭제된 부품 조회 → IllegalArgumentException")
    void findById_softDeleted_throws() {
        given(partRepository.findByIdAndActiveTrue(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> partService.findById(999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("부품을 찾을 수 없습니다");
    }
}
