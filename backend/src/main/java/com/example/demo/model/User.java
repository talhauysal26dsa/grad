package com.example.demo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "app_user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userID;

    @NotBlank
    private String name;
    private String middleName;
    @NotBlank
    private String surname;

    @Email
    @NotBlank
    @Column(unique = true)
    private String email;

    @NotBlank
    private String password;

    @ManyToOne
    private Department department;

    @ManyToOne
    private Faculty faculty;

    @ManyToOne
    private Role role;

    private String verificationCode;
    private boolean verified = false;
    private String resetCode;

    // Getters and setters
    public Long getUserID() { return userID; }
    public void setUserID(Long userID) { this.userID = userID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getMiddleName() { return middleName; }
    public void setMiddleName(String middleName) { this.middleName = middleName; }
    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
    public Faculty getFaculty() { return faculty; }
    public void setFaculty(Faculty faculty) { this.faculty = faculty; }
    public String getVerificationCode() { return verificationCode; }
    public void setVerificationCode(String verificationCode) { this.verificationCode = verificationCode; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getResetCode() { return resetCode; }
    public void setResetCode(String resetCode) { this.resetCode = resetCode; }
} 