package com.example.demo.controller;

import com.example.demo.model.Role;
import com.example.demo.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "http://localhost:5173")
public class RoleController {
    @Autowired
    private RoleRepository roleRepository;

    @PostMapping("/update-dates")
    public ResponseEntity<?> updateRoleDates(@RequestBody Map<String, String> payload) {
        String roleName = payload.get("role_name");
        String activationDate = payload.get("activation_date");
        String deactivationDate = payload.get("deactivation_date");

        Role role = roleRepository.findByRoleName(roleName).orElse(null);
        if (role == null) return ResponseEntity.badRequest().body("Role not found");

        role.setActivationDate(LocalDate.parse(activationDate));
        role.setDeactivationDate(LocalDate.parse(deactivationDate));
        roleRepository.save(role);

        return ResponseEntity.ok("Updated");
    }
} 