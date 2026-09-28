package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class PartRepositoryTest {

    @Autowired PartRepository partRepository;

    private Part savePart(String partNo, String name, int stock, int minimum, boolean active) {
        Part part = Part.builder()
            .partNo(partNo).name(name).manufacturer("제조사")
            .stockQuantity(stock).minimumStock(minimum).storageLocation("A창고").build();
        if (!active) part.deactivate();
        return partRepository.save(part);
    }

    @Test
    @DisplayName("keyword 검색 — name 부분일치")
    void search_byKeyword_name() {
        savePart("PT-2026-001", "베어링A", 10, 5, true);
        savePart("PT-2026-002", "오일필터", 20, 3, true);

        PartSearchCondition cond = new PartSearchCondition("베어링", null, null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("베어링A");
    }

    @Test
    @DisplayName("stockStatus=LOW — 재고 <= minimumStock이고 0 초과인 부품")
    void search_byStockStatus_low() {
        savePart("PT-2026-001", "저재고부품", 3, 5, true);  // LOW: stock(3) <= min(5)
        savePart("PT-2026-002", "정상부품", 20, 5, true);   // NORMAL
        savePart("PT-2026-003", "품절부품", 0, 5, true);    // OUT

        PartSearchCondition cond = new PartSearchCondition(null, null, StockStatus.LOW);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("저재고부품");
    }

    @Test
    @DisplayName("stockStatus=OUT — 재고 0인 부품")
    void search_byStockStatus_out() {
        savePart("PT-2026-001", "품절부품", 0, 5, true);
        savePart("PT-2026-002", "정상부품", 10, 5, true);

        PartSearchCondition cond = new PartSearchCondition(null, null, StockStatus.OUT);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("품절부품");
    }

    @Test
    @DisplayName("soft delete된 부품은 search에서 제외")
    void search_softDeleted_excluded() {
        savePart("PT-2026-001", "활성부품", 10, 5, true);
        savePart("PT-2026-002", "비활성부품", 10, 5, false);

        PartSearchCondition cond = new PartSearchCondition(null, null, null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("활성부품");
    }

    @Test
    @DisplayName("findByIdAndActiveTrue — soft delete된 부품은 Optional.empty()")
    void findByIdAndActiveTrue_softDeleted_returnsEmpty() {
        Part part = savePart("PT-2026-001", "삭제부품", 10, 5, true);
        part.deactivate();
        partRepository.save(part);

        Optional<Part> result = partRepository.findByIdAndActiveTrue(part.getId());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("storageLocation 필터 — A창고만 조회")
    void search_byStorageLocation() {
        savePart("PT-2026-001", "부품A", 10, 5, true); // A창고
        Part b = Part.builder().partNo("PT-2026-002").name("부품B").manufacturer("제조사")
            .stockQuantity(5).minimumStock(1).storageLocation("B창고").build();
        partRepository.save(b);

        PartSearchCondition cond = new PartSearchCondition(null, "A창고", null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("부품A");
    }
}
