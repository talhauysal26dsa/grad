package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    @Autowired
    private JavaMailSender mailSender;

    public void sendVerificationCode(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Your Verification Code");
            message.setText("Your verification code is: " + code);
            mailSender.send(message);
            System.out.println("[MAIL] Verification code sent to: " + to + " | code: " + code);
        } catch (Exception e) {
            System.out.println("[MAIL ERROR] Mail gönderilemedi: " + e.getMessage());
            e.printStackTrace();
        }
    }
} 