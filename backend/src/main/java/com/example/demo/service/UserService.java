package com.example.demo.service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.LogRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentService studentService;

    @Autowired
    private LogRecordRepository logRecordRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public User registerUser(User user) {
        String raw = user.getPassword();
        if (raw == null || !raw.startsWith("$2a$")) { // bcrypt hash değilse
            user.setPassword(passwordEncoder.encode(raw));
        }
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email.trim());
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        System.out.println("Raw password: " + rawPassword);
        System.out.println("Encoded password: " + encodedPassword);
        boolean match = passwordEncoder.matches(rawPassword, encodedPassword);
        System.out.println("Password match: " + match);
        return match;
    }

    @Transactional
    public void deleteUser(User user) {
        // Önce log kayıtlarını sil
        logRecordRepository.deleteByUserId(user.getUserID());
        // Sonra student kaydını sil
        studentService.deleteByUser(user.getUserID());
        // Sonra user kaydını sil
        userRepository.delete(user);
    }
} 