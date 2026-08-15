package com.factorycare.backend.domain.inspection;

import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import com.factorycare.backend.domain.inspection.repository.InspectionChecklistRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InspectionChecklistControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        resultRepository.deleteAll();
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        checklistRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
            .loginId("admin01").password(passwordEncoder.encode("pw"))
            .name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        User worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("MANAGER가 체크리스트 생성 → 201")
    void create_asManager() throws Exception {
        var body = Map.of(
            "name", "컨베이어 일일 점검",
            "itemNames", List.of("모터 온도", "벨트 장력", "오일 누유")
        );
        mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("컨베이어 일일 점검"))
            .andExpect(jsonPath("$.items.length()").value(3));
    }

    @Test
    @DisplayName("WORKER가 체크리스트 생성 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("name", "테스트", "itemNames", List.of("항목1"));
        mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("체크리스트 목록 조회")
    void getAll() throws Exception {
        checklistRepository.save(InspectionChecklist.builder().name("목록A").build());
        checklistRepository.save(InspectionChecklist.builder().name("목록B").build());

        mockMvc.perform(get("/api/inspection-checklists")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("체크리스트 상세 조회 - 항목 포함")
    void getById() throws Exception {
        var body = Map.of("name", "상세조회 테스트", "itemNames", List.of("항목A", "항목B"));
        var result = mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andReturn();
        var id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/inspection-checklists/" + id)
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test
    @DisplayName("ADMIN이 체크리스트 삭제 → 204")
    void delete_asAdmin() throws Exception {
        InspectionChecklist cl = checklistRepository.save(
            InspectionChecklist.builder().name("삭제대상").build());

        mockMvc.perform(delete("/api/inspection-checklists/" + cl.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }
}