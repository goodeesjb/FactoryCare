package com.factorycare.backend.domain.equipment.entity;

public enum EquipmentStatus {
    NORMAL,            // 정상
    INSPECTION_NEEDED, // 점검필요
    BROKEN,            // 고장
    REPAIRING,         // 수리중
    DISCARDED          // 폐기
}
