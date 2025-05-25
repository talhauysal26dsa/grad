package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long roleId;

    private String roleName;
    private LocalDate activationDate;
    private LocalDate deactivationDate;

    // Getters and setters
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public LocalDate getActivationDate() { return activationDate; }
    public void setActivationDate(LocalDate activationDate) { this.activationDate = activationDate; }
    public LocalDate getDeactivationDate() { return deactivationDate; }
    public void setDeactivationDate(LocalDate deactivationDate) { this.deactivationDate = deactivationDate; }
} 