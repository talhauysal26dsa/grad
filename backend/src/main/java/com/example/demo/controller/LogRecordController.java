package com.example.demo.controller;

import com.example.demo.model.LogRecord;
import com.example.demo.repository.LogRecordRepository;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

@RestController
@RequestMapping("/api/log-records")
public class LogRecordController {
    @Autowired
    private LogRecordRepository logRecordRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllLogs() {
        List<LogRecord> logs = logRecordRepository.findAll();
        List<Map<String, Object>> result = logs.stream().map(log -> {
            User user = userRepository.findById(log.getUserId()).orElse(null);
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("dateTime", log.getDateTime());
            map.put("name", user != null ? user.getName() : "");
            map.put("middleName", user != null ? user.getMiddleName() : "");
            map.put("surname", user != null ? user.getSurname() : "");
            map.put("email", user != null ? user.getEmail() : "");
            map.put("role", user != null && user.getRole() != null ? user.getRole().getRoleName() : "");
            map.put("actionTaken", log.getActionTaken());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
} 