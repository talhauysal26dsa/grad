package com.example.demo.repository;

import com.example.demo.model.LogRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRecordRepository extends JpaRepository<LogRecord, Long> {
    void deleteByUserId(Long userId);
} 