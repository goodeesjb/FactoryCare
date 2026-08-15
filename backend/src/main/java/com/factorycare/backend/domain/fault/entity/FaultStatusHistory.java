package com.factorycare.backend.domain.fault.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "fault_status_histories")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FaultStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fault_id", nullable = false)
    private Fault fault;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_id", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @Builder
    public FaultStatusHistory(Fault fault, User changedBy, FaultStatus fromStatus,
                               FaultStatus toStatus, String reason) {
        this.fault = fault;
        this.changedBy = changedBy;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.reason = reason;
    }
}