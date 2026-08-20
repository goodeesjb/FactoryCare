package com.factorycare.backend.domain.part.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "parts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String partNo;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String manufacturer;

    @Column(nullable = false)
    private int stockQuantity;

    @Column(nullable = false)
    private int minimumStock = 0;

    @Column(length = 200)
    private String storageLocation;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public Part(String partNo, String name, String manufacturer, int stockQuantity,
                int minimumStock, String storageLocation, String description) {
        this.partNo = partNo;
        this.name = name;
        this.manufacturer = manufacturer;
        this.stockQuantity = stockQuantity;
        this.minimumStock = minimumStock;
        this.storageLocation = storageLocation;
        this.description = description;
    }

    public void update(String name, String manufacturer, Integer minimumStock,
                       String storageLocation, String description) {
        if (name != null) this.name = name;
        if (manufacturer != null) this.manufacturer = manufacturer;
        if (minimumStock != null) this.minimumStock = minimumStock;
        if (storageLocation != null) this.storageLocation = storageLocation;
        if (description != null) this.description = description;
    }

    public void decreaseStock(int quantity) {
        if (this.stockQuantity < quantity) {
            throw new IllegalStateException(
                "재고가 부족합니다. 현재 재고: " + this.stockQuantity + ", 요청 수량: " + quantity);
        }
        this.stockQuantity -= quantity;
    }

    public void increaseStock(int quantity) {
        this.stockQuantity += quantity;
    }

    public void adjustStock(int newQuantity) {
        if (newQuantity < 0) throw new IllegalArgumentException("재고는 0 이상이어야 합니다.");
        this.stockQuantity = newQuantity;
    }

    public void deactivate() {
        this.active = false;
    }

    public StockStatus getStockStatus() {
        if (this.stockQuantity == 0) return StockStatus.OUT;
        if (this.stockQuantity <= this.minimumStock) return StockStatus.LOW;
        return StockStatus.NORMAL;
    }
}
