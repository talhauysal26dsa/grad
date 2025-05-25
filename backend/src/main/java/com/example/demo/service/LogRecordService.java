package com.example.demo.service;

import com.example.demo.model.LogRecord;
import com.example.demo.repository.LogRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class LogRecordService {
    @Autowired
    private LogRecordRepository logRecordRepository;

    public void logAction(Long userId, String action) {
        LogRecord log = new LogRecord();
        log.setUserId(userId);
        log.setActionTaken(action);
        log.setDateTime(LocalDateTime.now());
        logRecordRepository.save(log);
    }
} 