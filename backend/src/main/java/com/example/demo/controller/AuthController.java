package com.example.demo.controller;

import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.example.demo.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Collections;

import com.opencsv.CSVReader;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.lang.StringBuilder;
import java.io.IOException;
import java.nio.file.Files;
import org.springframework.http.MediaType;
import java.util.HashMap;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {
    @Autowired
    private UserService userService;
    @Autowired
    private StudentService studentService;
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private FacultyRepository facultyRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private GraduationUserRepository graduationUserRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private LogRecordService logRecordService;
    @Autowired
    private MailService mailService;

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> payload) {
        System.out.println("[DEBUG] register endpoint çalıştı");
        try {
            String email = (String) payload.get("email");
            String password = (String) payload.get("password");
            String name = (String) payload.get("name");
            String middleName = (String) payload.get("middleName");
            String surname = (String) payload.get("surname");
            String roleName = (String) payload.get("role");
            Long departmentId = payload.get("departmentId") != null ? Long.valueOf(payload.get("departmentId").toString()) : null;
            Long facultyId = payload.get("facultyId") != null ? Long.valueOf(payload.get("facultyId").toString()) : null;

            // Capitalize first letter of name fields
            if (name != null && !name.isEmpty()) {
                name = name.substring(0, 1).toUpperCase() + name.substring(1);
            }
            if (middleName != null && !middleName.isEmpty()) {
                middleName = middleName.substring(0, 1).toUpperCase() + middleName.substring(1);
            }
            if (surname != null && !surname.isEmpty()) {
                surname = surname.substring(0, 1).toUpperCase() + surname.substring(1);
            }

            // Full name birleştir
            String fullName = name + (middleName != null && !middleName.isEmpty() ? " " + middleName : "") + " " + surname;
            // @std.iyte.edu.tr için facultyId ve departmentId zorunlu
            if (email.endsWith("@std.iyte.edu.tr")) {
                if (facultyId == null || departmentId == null) {
                    return ResponseEntity.badRequest().body("Faculty and Department are required for student emails.");
                }
            }
            // Graduation users tablosunda full_name, email, faculty_id ve department_id ile tam eşleşme kontrolü
            if (email.endsWith("@std.iyte.edu.tr")) {
                String studentID = (String) payload.get("studentID");
                if (studentID == null || studentID.isEmpty()) {
                    return ResponseEntity.badRequest().body("Student number required for student emails.");
                }
                if (graduationUserRepository.findByFullNameAndEmailAndFacultyIdAndDepartmentIdAndStudentId(fullName, email, facultyId, departmentId, studentID).isEmpty()) {
                    return ResponseEntity.badRequest().body("This information does not correspond to a valid user.");
                }
            } else {
                if (graduationUserRepository.findByFullNameAndEmailAndFacultyIdAndDepartmentId(fullName, email, facultyId, departmentId).isEmpty()) {
                    return ResponseEntity.badRequest().body("This information does not correspond to a valid user.");
                }
            }

            if (!email.endsWith("@iyte.edu.tr") && !email.endsWith("@std.iyte.edu.tr")) {
                return ResponseEntity.badRequest().body("Invalid email domain.");
            }

            if (userService.findByEmail(email).isPresent()) {
                Optional<User> existingUser = userService.findByEmail(email);
                if (existingUser.get().isVerified()) {
                    return ResponseEntity.badRequest().body("Email already registered.");
                } else {
                    // If user exists but not verified, delete the old record
                    userService.deleteUser(existingUser.get());
                }
            }

            User user = new User();
            user.setEmail(email);
            user.setPassword(password);
            user.setName(name);
            user.setMiddleName(middleName);
            user.setSurname(surname);
            user.setVerified(false);
            String code = generateVerificationCode();
            user.setVerificationCode(code);

            // Role assignment
            Role role;
            if (email.endsWith("@std.iyte.edu.tr")) {
                role = roleRepository.findByRoleName("Student").orElseGet(() -> {
                    Role r = new Role();
                    r.setRoleName("Student");
                    return roleRepository.save(r);
                });
            } else {
                if (roleName == null || roleName.isEmpty()) {
                    return ResponseEntity.badRequest().body("Role is required for iyte.edu.tr emails.");
                }
                role = roleRepository.findByRoleName(roleName).orElseGet(() -> {
                    Role r = new Role();
                    r.setRoleName(roleName);
                    return roleRepository.save(r);
                });
            }
            user.setRole(role);

            // Faculty/Department assignment based on role
            if (email.endsWith("@std.iyte.edu.tr") || (roleName != null && (roleName.equals("Faculty Secretary") || roleName.equals("Department Secretary") || roleName.equals("Advisor")))) {
                if (facultyId == null) return ResponseEntity.badRequest().body("Faculty is required for this role.");
                user.setFaculty(facultyRepository.findById(facultyId).orElse(null));
            }
            if (email.endsWith("@std.iyte.edu.tr") || (roleName != null && (roleName.equals("Department Secretary") || roleName.equals("Advisor")))) {
                if (departmentId == null) return ResponseEntity.badRequest().body("Department is required for this role.");
                user.setDepartment(departmentRepository.findById(departmentId).orElse(null));
            }

            User savedUser = userService.registerUser(user);
            mailService.sendVerificationCode(email, code);
            // LOG KAYDI
            logRecordService.logAction(savedUser.getUserID(), "register");

            if (email.endsWith("@std.iyte.edu.tr")) {
                String studentID = (String) payload.get("studentID");
                if (studentID == null || studentID.isEmpty()) {
                    return ResponseEntity.badRequest().body("Student number required for student emails.");
                }
                Student student = new Student();
                student.setStudentid(studentID);
                student.setUser(savedUser);
                student.setGraduationStatus("false");
                student.setDisengagementStatus("false"); // Varsayılan değer
                
                // Transcript dosyası var mı kontrol et
                String transcriptPathPdf = "uploads/transcripts/" + studentID + ".pdf";
                String transcriptPathCsv = "uploads/transcripts/" + studentID + ".csv";
                File transcriptFilePdf = new File(transcriptPathPdf);
                File transcriptFileCsv = new File(transcriptPathCsv);
                
                if (transcriptFileCsv.exists()) {
                    student.setTranscriptPath(transcriptPathCsv);
                    Map<String, Double> transcriptData = extractTranscriptDataFromCsv(transcriptFileCsv);
                    
                    if (transcriptData.containsKey("gpa") && transcriptData.get("gpa") != null) {
                        Double gpa = transcriptData.get("gpa");
                        student.setGpa(gpa);
                    }
                    
                    if (transcriptData.containsKey("ects") && transcriptData.get("ects") != null) {
                        Double ects = transcriptData.get("ects");
                        student.setTotalEcts(ects);
                    }

                    if (transcriptData.containsKey("credit") && transcriptData.get("credit") != null) {
                        Double credit = transcriptData.get("credit");
                        student.setTotalCredit(credit);
                    }
                } else if (transcriptFilePdf.exists()) {
                    student.setTranscriptPath(transcriptPathPdf);
                } else {
                    System.out.println("Warning: No transcript file found for student: " + studentID + ". Student will need to upload transcript later.");
                }
                
                try {
                    studentService.save(student);
                } catch (Exception e) {
                    System.out.println("Error saving student data: " + e.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Error saving student information. Please try again.");
                }
            }

            return ResponseEntity.ok("Verification code sent to your email.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed.");
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found.");
        }
        User user = userOpt.get();
        if (user.isVerified()) {
            return ResponseEntity.ok("Already verified.");
        }
        if (user.getVerificationCode() != null && user.getVerificationCode().equals(code)) {
            user.setVerified(true);
            user.setVerificationCode(null);
            userService.registerUser(user);
            return ResponseEntity.ok("Email verified successfully.");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid verification code.");
        }
    }

    @PostMapping("/send-verification")
    public ResponseEntity<?> sendVerification(@RequestBody Map<String, String> payload) {
        System.out.println("[DEBUG] send-verification endpoint çalıştı");
        String email = payload.get("email");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found.");
        }
        User user = userOpt.get();
        if (user.isVerified()) {
            return ResponseEntity.ok("Already verified.");
        }
        String code = generateVerificationCode();
        user.setVerificationCode(code);
        userService.registerUser(user);
        mailService.sendVerificationCode(email, code);
        return ResponseEntity.ok("Verification code sent again.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials.");
        }
        User user = userOpt.get();
        if (!userService.checkPassword(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials.");
        }
        if (!user.isVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Please verify your email before logging in.");
        }
        // Role date check
        Role role = user.getRole();
        if (role != null && role.getActivationDate() != null && role.getDeactivationDate() != null) {
            java.time.LocalDate today = java.time.LocalDate.now();
            if (today.isBefore(role.getActivationDate()) || today.isAfter(role.getDeactivationDate())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("System is closed");
            }
        }
        // LOG KAYDI
        logRecordService.logAction(user.getUserID(), "login");
        Map<String, Object> userMap = new java.util.HashMap<>();
        userMap.put("userID", user.getUserID());
        userMap.put("name", user.getName());
        userMap.put("surname", user.getSurname());
        userMap.put("email", user.getEmail());
        userMap.put("role_id", user.getRole() != null ? user.getRole().getRoleId() : null);
        userMap.put("role_name", user.getRole() != null ? user.getRole().getRoleName() : null);
        if (user.getRole() != null && "Faculty Secretary".equalsIgnoreCase(user.getRole().getRoleName())) {
            userMap.put("faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null);
        }
        if (user.getRole() != null && "Department Secretary".equalsIgnoreCase(user.getRole().getRoleName())) {
            userMap.put("department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null);
        }
        return ResponseEntity.ok(userMap);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        System.out.println("[DEBUG] forgot-password endpoint çalıştı");
        String email = payload.get("email");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found.");
        }
        User user = userOpt.get();
        String code = generateVerificationCode();
        user.setResetCode(code);
        userService.registerUser(user);
        mailService.sendVerificationCode(email, code);
        return ResponseEntity.ok("Reset code sent to your email.");
    }

    @PostMapping("/verify-reset-code")
    public ResponseEntity<?> verifyResetCode(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found.");
        }
        User user = userOpt.get();
        if (user.getResetCode() != null && user.getResetCode().equals(code)) {
            return ResponseEntity.ok("Code verified.");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid reset code.");
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");
        String newPassword = payload.get("newPassword");
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("User not found.");
        }
        User user = userOpt.get();
        if (user.getResetCode() != null && user.getResetCode().equals(code)) {
            user.setPassword(newPassword); // Hashlemeyi unutma!
            user.setResetCode(null);
            userService.registerUser(user);
            return ResponseEntity.ok("Password reset successfully.");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid reset code.");
        }
    }

    @GetMapping("/search-user")
    public ResponseEntity<?> searchUser(@RequestParam String query) {
        // Önce student tablosunda ara
        Optional<Student> studentOpt = studentRepository.findByStudentid(query);
        if (studentOpt.isPresent()) {
            User user = studentOpt.get().getUser();
            return ResponseEntity.ok(Map.of(
                "name", user.getName(),
                "surname", user.getSurname(),
                "email", user.getEmail(),
                "studentid", studentOpt.get().getStudentid(),
                "role_role_id", user.getRole() != null ? user.getRole().getRoleId() : null,
                "department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null,
                "faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null
            ));
        }
        // Eğer student tablosunda yoksa, email ile app_user'da ara
        Optional<User> userOpt = userRepository.findByEmail(query);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Student tablosunda kaydı varsa numarasını da ekle
            Optional<Student> st = studentRepository.findByUser(user);
            return ResponseEntity.ok(Map.of(
                "name", user.getName(),
                "surname", user.getSurname(),
                "email", user.getEmail(),
                "studentid", st.map(Student::getStudentid).orElse(""),
                "role_role_id", user.getRole() != null ? user.getRole().getRoleId() : null,
                "department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null,
                "faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null
            ));
        }
        return ResponseEntity.status(404).body("User not found");
    }

    @GetMapping("/users-by-role")
    public ResponseEntity<?> getUsersByRole(@RequestParam Long roleId) {
        var users = userRepository.findAllByRole_RoleId(roleId);
        var result = users.stream().map(user -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("userID", user.getUserID());
            map.put("name", user.getName());
            map.put("middleName", user.getMiddleName());
            map.put("surname", user.getSurname());
            map.put("email", user.getEmail());
            map.put("role", user.getRole());
            map.put("role_role_id", user.getRole() != null ? user.getRole().getRoleId() : null);
            map.put("role_role_name", user.getRole() != null ? user.getRole().getRoleName() : null);
            map.put("department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null);
            map.put("faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null);
            // Eğer öğrenci ise studentid ekle
            String studentid = null;
            if (user.getRole() != null && "Student".equalsIgnoreCase(user.getRole().getRoleName())) {
                var st = studentRepository.findByUser(user);
                if (st.isPresent()) {
                    studentid = st.get().getStudentid();
                    map.put("studentid", studentid);
                    map.put("graduation_status", st.get().getGraduationStatus());
                } else {
                    map.put("studentid", null);
                    map.put("graduation_status", null);
                }
            } else {
                map.put("studentid", null);
                map.put("graduation_status", null);
            }
            String fullname = user.getName() + (user.getMiddleName() != null && !user.getMiddleName().isEmpty() ? " " + user.getMiddleName() : "") + " " + user.getSurname();
            map.put("fullname", fullname);
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/search-users")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        // Önce studentid ile arama yap
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        Optional<Student> studentOpt = studentRepository.findByStudentid(query);
        if (studentOpt.isPresent()) {
            User user = studentOpt.get().getUser();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("userID", user.getUserID());
            map.put("name", user.getName());
            map.put("surname", user.getSurname());
            map.put("email", user.getEmail());
            map.put("studentid", studentOpt.get().getStudentid());
            map.put("graduation_status", studentOpt.get().getGraduationStatus());
            map.put("role_role_id", user.getRole() != null ? user.getRole().getRoleId() : null);
            map.put("role_role_name", user.getRole() != null ? user.getRole().getRoleName() : null);
            map.put("department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null);
            map.put("faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null);
            map.put("role", user.getRole());
            String fullname = user.getName() + (user.getMiddleName() != null && !user.getMiddleName().isEmpty() ? " " + user.getMiddleName() : "") + " " + user.getSurname();
            map.put("fullname", fullname);
            result.add(map);
        }
        // Sonra email, name, surname ile arama yap
        List<User> users = userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(query, query, query);
        for (User user : users) {
            // Eğer zaten eklendiyse tekrar ekleme
            boolean exists = result.stream().anyMatch(m -> m.get("userID").equals(user.getUserID()));
            if (!exists) {
                Optional<Student> st = studentRepository.findByUser(user);
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("userID", user.getUserID());
                map.put("name", user.getName());
                map.put("surname", user.getSurname());
                map.put("email", user.getEmail());
                map.put("studentid", st.map(Student::getStudentid).orElse(""));
                map.put("graduation_status", st.map(Student::getGraduationStatus).orElse(""));
                map.put("role_role_id", user.getRole() != null ? user.getRole().getRoleId() : null);
                map.put("role_role_name", user.getRole() != null ? user.getRole().getRoleName() : null);
                map.put("department_departmentid", user.getDepartment() != null ? user.getDepartment().getDepartmentID() : null);
                map.put("faculty_facultyid", user.getFaculty() != null ? user.getFaculty().getFacultyID() : null);
                map.put("role", user.getRole());
                String fullname = user.getName() + (user.getMiddleName() != null && !user.getMiddleName().isEmpty() ? " " + user.getMiddleName() : "") + " " + user.getSurname();
                map.put("fullname", fullname);
                result.add(map);
            }
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/delete-users")
    public ResponseEntity<?> deleteUsers(@RequestBody Map<String, List<Long>> payload) {
        List<Long> userIds = payload.get("userIds");
        if (userIds == null || userIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No user IDs provided.");
        }
        int deleted = 0;
        for (Long id : userIds) {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isPresent()) {
                userService.deleteUser(userOpt.get());
                deleted++;
            }
        }
        return ResponseEntity.ok(Map.of(
            "deletedCount", deleted,
            "deletedIds", userIds
        ));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<?> verifyPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        Optional<User> userOpt = userService.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found.");
        }
        User user = userOpt.get();
        if (!userService.checkPassword(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Password is incorrect.");
        }
        return ResponseEntity.ok("Password verified.");
    }

    // CSV'den GANO (gpa), TOTAL ECTS ve TOTAL CREDIT okuma fonksiyonu
    private Map<String, Double> extractTranscriptDataFromCsv(File csvFile) {
        Map<String, Double> result = new java.util.HashMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            String line;
            boolean foundGpa = false;
            boolean foundEcts = false;
            boolean foundCredit = false;

            while ((line = br.readLine()) != null) {
                // GPA kontrolü
                if (line.contains("GANO:")) {
                    int idx = line.indexOf("GANO:");
                    if (idx != -1) {
                        String gpaStr = line.substring(idx + 5).trim().replace(",", ".");
                        try {
                            Double gpa = Double.parseDouble(gpaStr);
                            if (gpa >= 0.0 && gpa <= 4.0) {
                                result.put("gpa", gpa);
                                foundGpa = true;
                            }
                        } catch (NumberFormatException e) {}
                    }
                }
                // ECTS kontrolü
                String lowerLine = line.toLowerCase();
                if (lowerLine.contains("total ects:")) {
                    int idx = lowerLine.indexOf("total ects:");
                    if (idx != -1) {
                        String after = line.substring(idx + 11);
                        String[] parts = after.split("[^0-9.,]+");
                        for (String part : parts) {
                            if (!part.isBlank()) {
                                String ectsStr = part.trim().replace(",", ".");
                                try {
                                    Double ects = Double.parseDouble(ectsStr);
                                    if (ects >= 0.0) {
                                        result.put("ects", ects);
                                        foundEcts = true;
                                    }
                                } catch (NumberFormatException e) {}
                                break;
                            }
                        }
                    }
                }
                // Total Credit kontrolü
                if (lowerLine.contains("total credit:")) {
                    int idx = lowerLine.indexOf("total credit:");
                    if (idx != -1) {
                        String after = line.substring(idx + 13);
                        String[] parts = after.split("[^0-9.,]+");
                        for (String part : parts) {
                            if (!part.isBlank()) {
                                String creditStr = part.trim().replace(",", ".");
                                try {
                                    Double credit = Double.parseDouble(creditStr);
                                    if (credit >= 0.0) {
                                        result.put("credit", credit);
                                        foundCredit = true;
                                    }
                                } catch (NumberFormatException e) {}
                                break;
                            }
                        }
                    }
                }
            }
            if (!foundGpa) result.put("gpa", null);
            if (!foundEcts) result.put("ects", null);
            if (!foundCredit) result.put("credit", null);
        } catch (Exception e) {
            result.put("gpa", null);
            result.put("ects", null);
            result.put("credit", null);
        }
        return result;
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, Object> payload) {
        // Kullanıcı ID'si frontendden gönderilmeli
        Long userId = payload.get("userID") != null ? Long.valueOf(payload.get("userID").toString()) : null;
        if (userId == null) {
            return ResponseEntity.badRequest().body("User ID is required for logout.");
        }
        logRecordService.logAction(userId, "logout");
        return ResponseEntity.ok("Logged out successfully.");
    }

    @PostMapping("/test-mail")
    public ResponseEntity<?> testMail(@RequestParam String to) {
        System.out.println("[DEBUG] test-mail endpoint çalıştı");
        mailService.sendVerificationCode(to, "123456");
        return ResponseEntity.ok("Mail gönderildi.");
    }

    @PostMapping("/graduation-status/{userId}")
    @Transactional
    public ResponseEntity<?> checkGraduationStatus(@PathVariable Long userId) {
        Optional<Student> studentOpt = studentRepository.findByUserId(userId);
        if (studentOpt.isPresent()) {
            Student student = studentOpt.get();
            student.setLastCheck(LocalDateTime.now());
            studentRepository.save(student);
            return ResponseEntity.ok(Map.of(
                "graduation_status", student.getGraduationStatus(),
                "lastCheck", student.getLastCheck()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found");
        }
    }

    @GetMapping("/graduation-status/{userId}")
    public ResponseEntity<?> getGraduationStatus(@PathVariable Long userId) {
        Optional<Student> studentOpt = studentRepository.findByUserId(userId);
        if (studentOpt.isPresent()) {
            Student student = studentOpt.get();
            return ResponseEntity.ok(Map.of(
                "graduation_status", student.getGraduationStatus(),
                "lastCheck", student.getLastCheck()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Student not found");
        }
    }

    @PostMapping("/advisor/qualify-students")
    @Transactional
    public ResponseEntity<?> qualifyStudents(@RequestParam Long advisorId) {
        Optional<User> advisorOpt = userRepository.findById(advisorId);
        if (advisorOpt.isEmpty()) return ResponseEntity.badRequest().body("Advisor not found");
        User advisor = advisorOpt.get();
        if (advisor.getDepartment() == null) return ResponseEntity.badRequest().body("Advisor has no department");
        Long departmentId = advisor.getDepartment().getDepartmentID();
        String departmentShortName = advisor.getDepartment().getShortName();
        if (departmentShortName == null) return ResponseEntity.badRequest().body("Department short name not set");

        // 1. O departmandaki tüm öğrencileri bul
        List<Student> students = studentRepository.findAllByUser_Department_DepartmentIDAndUser_Role_RoleName(departmentId, "Student");

        // 2. Curriculum dosyasını bul ve analiz et
        String curriculumFileName = departmentShortName + "_curriculum.csv";
        File curriculumFile = new File("uploads/curriculums/" + curriculumFileName);
        if (!curriculumFile.exists()) return ResponseEntity.badRequest().body("Curriculum file not found: " + curriculumFileName);
        
        Set<String> mandatoryCourses = extractMandatoryCoursesFromCurriculum(curriculumFile);
        if (mandatoryCourses.isEmpty()) {
            return ResponseEntity.badRequest().body("No mandatory courses found in curriculum file");
        }
        
        int curriculumTotalCourses = extractTotalCoursesFromCurriculum(curriculumFile);
        if (curriculumTotalCourses <= 0) {
            return ResponseEntity.badRequest().body("Invalid total course count in curriculum file");
        }

        // 3. Her öğrenci için transcripti karşılaştır
        int qualified = 0, notQualified = 0;
        StringBuilder details = new StringBuilder();
        for (Student student : students) {
            String transcriptPath = student.getTranscriptPath();
            if (transcriptPath == null || !transcriptPath.endsWith(".csv")) {
                student.setGraduationStatus("false");
                studentRepository.save(student);
                notQualified++;
                details.append("\n").append(student.getStudentid()).append(": No valid transcript");
                continue;
            }
            File transcriptFile = new File(transcriptPath);
            if (!transcriptFile.exists()) {
                student.setGraduationStatus("false");
                studentRepository.save(student);
                notQualified++;
                details.append("\n").append(student.getStudentid()).append(": Transcript file missing");
                continue;
            }

            // Zorunlu ders kontrolü
            Set<String> transcriptCourses = extractCoursesFromTranscript(transcriptFile);
            Map<String, String> courseGrades = extractCourseGradesFromTranscript(transcriptFile);
            Set<String> missingCourses = new HashSet<>(mandatoryCourses);
            missingCourses.removeAll(transcriptCourses);
            boolean allMandatoryPresent = missingCourses.isEmpty();

            // Başarısız olunan zorunlu dersleri bul
            Set<String> failedMandatoryCourses = new HashSet<>();
            try (BufferedReader br = new BufferedReader(new FileReader(transcriptFile))) {
                String line;
                boolean dataStarted = false;
                while ((line = br.readLine()) != null) {
                    if (!dataStarted) {
                        if (line.contains("Term;Course Code;Course Name;Credit;ECTS;Grade;Grade Point")) {
                            dataStarted = true;
                        }
                        continue;
                    }
                    if (line.trim().isEmpty() || line.contains("Total Credit:") || line.contains("GANO:")) {
                        continue;
                    }
                    String[] parts = line.split(";");
                    if (parts.length >= 6) {
                        String code = parts[1].trim();
                        String grade = parts[5].trim();
                        if (mandatoryCourses.contains(code) && (grade.equals("FF") || grade.equals("FD"))) {
                            failedMandatoryCourses.add(code);
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Toplam ders sayısı kontrolü
            int transcriptTotalCourses = transcriptCourses.size();
            boolean hasEnoughCourses = transcriptTotalCourses >= curriculumTotalCourses;

            // --- Bölüme özel GPA, ECTS, Credit kontrolleri ---
            boolean meetsDepartmentCriteria = true;
            StringBuilder deptCriteriaMsg = new StringBuilder();
            String dept = departmentShortName.toUpperCase();
            double gpa = student.getGpa() != null ? student.getGpa() : -1;
            double ects = student.getTotalEcts() != null ? student.getTotalEcts() : -1;
            double credit = student.getTotalCredit() != null ? student.getTotalCredit() : -1;
            if (dept.equals("CENG")) {
                if (gpa < 2) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("GPA < 2.0; "); }
                if (ects < 241) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("ECTS < 241; "); }
                if (credit < 133) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("Credit < 133; "); }
            } else if (dept.equals("MATH")) {
                if (gpa < 2) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("GPA < 2.0; "); }
                if (ects < 240) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("ECTS < 240; "); }
                if (credit < 120) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("Credit < 120; "); }
            } else if (dept.equals("CP")) {
                if (gpa < 2) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("GPA < 2.0; "); }
                if (ects < 239) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("ECTS < 239; "); }
                if (credit < 161) { meetsDepartmentCriteria = false; deptCriteriaMsg.append("Credit < 161; "); }
            }

            // Her iki koşul da sağlanmalı (mandatory+total ve bölüm kriterleri)
            boolean isQualified = allMandatoryPresent && hasEnoughCourses && meetsDepartmentCriteria;
            student.setGraduationStatus(isQualified ? "true" : "false");
            studentRepository.save(student);

            // --- RAPOR DETAYLARI ---
            details.append("\n").append(student.getStudentid()).append(": ");
            if (isQualified) {
                qualified++;
                details.append("QUALIFIED");
            } else {
                notQualified++;
                details.append("NOT QUALIFIED - ");
                boolean prev = false;
                if (!allMandatoryPresent || !failedMandatoryCourses.isEmpty()) {
                    details.append("Missing or failed mandatory courses: ");
                    Set<String> allMissingCourses = new HashSet<>(missingCourses);
                    allMissingCourses.addAll(failedMandatoryCourses);
                    details.append(String.join(", ", allMissingCourses));
                    prev = true;
                }
                if (!hasEnoughCourses) {
                    if (prev) details.append(" and ");
                    details.append("Not enough total courses (has ").append(transcriptTotalCourses)
                          .append(", needs ").append(curriculumTotalCourses).append(")");
                    prev = true;
                }
                if (!meetsDepartmentCriteria) {
                    if (prev) details.append(" and ");
                    details.append("Department criteria not met: ").append(deptCriteriaMsg.toString());
                }
            }
            // --- Aldığı dersler ve harf notları ---
            details.append("\n  Courses taken: ");
            if (courseGrades.isEmpty()) {
                details.append("None");
            } else {
                details.append(courseGrades.entrySet().stream()
                    .map(e -> e.getKey() + ": " + e.getValue())
                    .sorted()
                    .reduce((a, b) -> a + ", " + b).orElse("None"));
            }
        }
        // Mezun öğrencileri bul ve CSV olarak advisor'a özel klasöre yaz
        try {
            List<Student> graduated = studentRepository.findAllByGraduationStatusAndUser_Department_DepartmentID("true", departmentId);
            StringBuilder sb = new StringBuilder();
            sb.append("Student Number,GPA,Term Count\n");
            for (Student s : graduated) {
                sb.append(s.getStudentid()).append(",");
                sb.append(s.getGpa() != null ? s.getGpa() : "").append(",");
                sb.append(s.getTermCount() != null ? s.getTermCount() : "").append("\n");
            }
            String dirPath = "uploads/graduated_students/" + advisorId;
            java.nio.file.Files.createDirectories(java.nio.file.Paths.get(dirPath));
            java.nio.file.Files.write(java.nio.file.Paths.get(dirPath + "/graduated_students.csv"), sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ResponseEntity.ok("Qualification completed. Qualified: " + qualified + ", Not qualified: " + notQualified + details.toString());
    }

    private Set<String> extractMandatoryCoursesFromCurriculum(File curriculumFile) {
        Set<String> courses = new HashSet<>();
        try (BufferedReader br = new BufferedReader(new FileReader(curriculumFile))) {
            String line;
            boolean headerFound = false;
            while ((line = br.readLine()) != null) {
                if (!headerFound) {
                    if (line.contains("Type;Course Code;Course Name;Credit;ECTS")) {
                        headerFound = true;
                    }
                    continue;
                }
                String[] parts = line.split(";");
                if (parts.length >= 2 && parts[0].trim().equalsIgnoreCase("Mandatory")) {
                    String code = parts[1].trim();
                    if (!code.isEmpty()) {
                        courses.add(code);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return courses;
    }

    private Set<String> extractCoursesFromTranscript(File transcriptFile) {
        // Her dersin en son alınan harf notunu dikkate al
        java.util.LinkedHashMap<String, String> lastGrades = new java.util.LinkedHashMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(transcriptFile))) {
            String line;
            boolean dataStarted = false;
            while ((line = br.readLine()) != null) {
                if (!dataStarted) {
                    if (line.contains("Term;Course Code;Course Name;Credit;ECTS;Grade;Grade Point")) {
                        dataStarted = true;
                    }
                    continue;
                }
                if (line.trim().isEmpty() || line.contains("Total Credit:") || line.contains("GANO:")) {
                    continue;
                }
                String[] parts = line.split(";");
                if (parts.length >= 6) {
                    String code = parts[1].trim();
                    String grade = parts[5].trim();
                    if (!code.isEmpty()) {
                        lastGrades.put(code, grade); // Her zaman en sonuncusu kalır
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // Sadece FF/FD olmayanları döndür
        Set<String> courses = new HashSet<>();
        for (var entry : lastGrades.entrySet()) {
            String grade = entry.getValue();
            if (!grade.equalsIgnoreCase("FF") && !grade.equalsIgnoreCase("FD") && !grade.equalsIgnoreCase("U")) {
                courses.add(entry.getKey());
            }
        }
        return courses;
    }

    private int extractTotalCoursesFromCurriculum(File curriculumFile) {
        try (BufferedReader br = new BufferedReader(new FileReader(curriculumFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("Total;")) {
                    String[] parts = line.split(";");
                    if (parts.length >= 2) {
                        try {
                            return Integer.parseInt(parts[1].trim());
                        } catch (NumberFormatException e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1; // Hata durumu
    }

    // Yardımcı fonksiyon: transkriptteki ders kodu ve harf notlarını döndür (en son alınan not)
    private Map<String, String> extractCourseGradesFromTranscript(File transcriptFile) {
        java.util.LinkedHashMap<String, String> courseGrades = new java.util.LinkedHashMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(transcriptFile))) {
            String line;
            boolean dataStarted = false;
            while ((line = br.readLine()) != null) {
                if (!dataStarted) {
                    if (line.contains("Term;Course Code;Course Name;Credit;ECTS;Grade;Grade Point")) {
                        dataStarted = true;
                    }
                    continue;
                }
                if (line.trim().isEmpty() || line.contains("Total Credit:") || line.contains("GANO:")) {
                    continue;
                }
                String[] parts = line.split(";");
                if (parts.length >= 6) {
                    String code = parts[1].trim();
                    String grade = parts[5].trim();
                    if (!code.isEmpty()) {
                        courseGrades.put(code, grade); // En sonuncusu kalır
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return courseGrades;
    }

    @GetMapping("/graduated-students-csv")
    public ResponseEntity<byte[]> getGraduatedStudentsCsv(@RequestParam Long advisorId) {
        try {
            String filePath = "uploads/graduated_students/" + advisorId + "/graduated_students.csv";
            byte[] csvBytes = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(filePath));
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=graduated_students.csv");
            headers.set(HttpHeaders.CONTENT_TYPE, "text/csv");
            return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/department-advisors-files")
    public ResponseEntity<?> getDepartmentAdvisorsFiles(@RequestParam Long secretaryId) {
        Optional<User> secretaryOpt = userRepository.findById(secretaryId);
        if (secretaryOpt.isEmpty() || secretaryOpt.get().getDepartment() == null) {
            return ResponseEntity.badRequest().body("Secretary or department not found");
        }
        Long departmentId = secretaryOpt.get().getDepartment().getDepartmentID();
        List<User> advisors = userRepository.findAllByDepartment_DepartmentIDAndRole_RoleId(departmentId, 3L);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (User advisor : advisors) {
            Long advisorId = advisor.getUserID();
            String filePath = System.getProperty("user.dir") + "/uploads/graduated_students/" + advisorId + "/graduated_students.csv";
            boolean hasFile = new java.io.File(filePath).exists();
            System.out.println("Checking file: " + filePath + " exists: " + hasFile);
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("userID", advisorId);
            map.put("name", advisor.getName() + " " + advisor.getSurname());
            map.put("hasFile", hasFile);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/save-sorted-students")
    public ResponseEntity<?> saveSortedStudents(@RequestBody Map<String, Object> payload) {
        try {
            Long departmentId = payload.get("departmentId") != null ? Long.valueOf(payload.get("departmentId").toString()) : null;
            String csv = (String) payload.get("csv");
            String filename = payload.get("filename") != null ? payload.get("filename").toString() : "sorted_students.csv";
            if (departmentId == null || csv == null) {
                return ResponseEntity.badRequest().body("departmentId and csv required");
            }
            String dirPath = "uploads/sorting/" + departmentId;
            java.nio.file.Files.createDirectories(java.nio.file.Paths.get(dirPath));
            java.nio.file.Files.write(java.nio.file.Paths.get(dirPath + "/" + filename), csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return ResponseEntity.ok("Saved");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving sorted students");
        }
    }

    @GetMapping("/department-files-status")
    public ResponseEntity<?> getDepartmentFilesStatus(@RequestParam Long secretaryId) {
        Optional<User> secretaryOpt = userRepository.findById(secretaryId);
        if (secretaryOpt.isEmpty() || secretaryOpt.get().getFaculty() == null) {
            return ResponseEntity.badRequest().body("Secretary or faculty not found");
        }
        Long facultyId = secretaryOpt.get().getFaculty().getFacultyID();
        List<Department> departments = departmentRepository.findByFaculty_FacultyID(facultyId);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Department dept : departments) {
            Long departmentId = dept.getDepartmentID();
            String filePath = System.getProperty("user.dir") + "/uploads/sorting/" + departmentId + "/sorted_students.csv";
            boolean hasFile = new java.io.File(filePath).exists();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("departmentId", departmentId);
            map.put("departmentName", dept.getName());
            map.put("hasFile", hasFile);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/department-sorted-students-csv")
    public ResponseEntity<?> getDepartmentSortedStudentsCsv(@RequestParam Long departmentId) {
        String filePath = System.getProperty("user.dir") + "/uploads/sorting/" + departmentId + "/sorted_students.csv";
        File file = new File(filePath);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] content = Files.readAllBytes(file.toPath());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "sorted_students.csv");
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to read file");
        }
    }

    @PostMapping("/faculty-secretary/sort-all-students")
    public ResponseEntity<?> sortAllStudents(@RequestParam Long facultyId) {
        List<Department> departments = departmentRepository.findByFaculty_FacultyID(facultyId);
        List<Map<String, Object>> allStudents = new java.util.ArrayList<>();
        for (Department dept : departments) {
            String filePath = System.getProperty("user.dir") + "/uploads/sorting/" + dept.getDepartmentID() + "/sorted_students.csv";
            File file = new File(filePath);
            if (!file.exists()) continue; // SADECE DOSYASI OLANLAR
            try (BufferedReader br = new BufferedReader(new FileReader(file))) {
                String line;
                boolean first = true;
                while ((line = br.readLine()) != null) {
                    if (first) { first = false; continue; } // skip header
                    String[] parts = line.split(",");
                    if (parts.length < 3) continue;
                    Map<String, Object> student = new HashMap<>();
                    student.put("studentid", parts[0]);
                    student.put("gpa", parts[1].isEmpty() ? null : Double.valueOf(parts[1]));
                    student.put("termCount", parts[2].isEmpty() ? null : Integer.valueOf(parts[2]));
                    allStudents.add(student);
                }
            } catch (Exception e) { e.printStackTrace(); }
        }
        // Sıralama
        List<Map<String, Object>> groupA = allStudents.stream()
            .filter(s -> s.get("termCount") != null && ((Integer)s.get("termCount")) <= 8)
            .sorted((a, b) -> Double.compare(
                b.get("gpa") == null ? 0 : (Double)b.get("gpa"),
                a.get("gpa") == null ? 0 : (Double)a.get("gpa")
            ))
            .toList();
        List<Map<String, Object>> groupB = allStudents.stream()
            .filter(s -> s.get("termCount") != null && ((Integer)s.get("termCount")) > 8)
            .sorted((a, b) -> {
                int tcA = (Integer)a.get("termCount");
                int tcB = (Integer)b.get("termCount");
                if (tcA != tcB) return Integer.compare(tcA, tcB);
                double gpaA = a.get("gpa") == null ? 0 : (Double)a.get("gpa");
                double gpaB = b.get("gpa") == null ? 0 : (Double)b.get("gpa");
                return Double.compare(gpaB, gpaA);
            })
            .toList();
        List<Map<String, Object>> sorted = new ArrayList<>();
        sorted.addAll(groupA);
        sorted.addAll(groupB);
        // CSV oluştur
        StringBuilder sb = new StringBuilder();
        sb.append("Student Number,GPA,Term Count\n");
        for (Map<String, Object> s : sorted) {
            sb.append(s.get("studentid")).append(",");
            sb.append(s.get("gpa") != null ? s.get("gpa") : "").append(",");
            sb.append(s.get("termCount") != null ? s.get("termCount") : "").append("\n");
        }
        // Kaydet
        String dirPath = System.getProperty("user.dir") + "/uploads/faculty_sorts/" + facultyId;
        new File(dirPath).mkdirs();
        try {
            Files.write(new File(dirPath + "/sorted_students.csv").toPath(), sb.toString().getBytes());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("File write error");
        }
        return ResponseEntity.ok("Sorted and saved");
    }

    @GetMapping("/faculty-sorted-students-csv")
    public ResponseEntity<?> getFacultySortedStudentsCsv(@RequestParam Long facultyId) {
        String filePath = System.getProperty("user.dir") + "/uploads/faculty_sorts/" + facultyId + "/sorted_students.csv";
        File file = new File(filePath);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] content = java.nio.file.Files.readAllBytes(file.toPath());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "sorted_students.csv");
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to read file");
        }
    }

    @PostMapping("/student-affairs/sort-all-students")
    public ResponseEntity<?> sortAllStudentsForStudentAffairs() {
        String basePath = System.getProperty("user.dir") + "/uploads/faculty_sorts/";
        File facultySortsDir = new File(basePath);
        if (!facultySortsDir.exists() || !facultySortsDir.isDirectory()) {
            return ResponseEntity.status(500).body("Faculty sorts directory not found");
        }
        List<Map<String, Object>> allStudents = new java.util.ArrayList<>();
        for (File facultyDir : facultySortsDir.listFiles()) {
            File csvFile = new File(facultyDir, "sorted_students.csv");
            if (!csvFile.exists()) continue;
            try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
                String line;
                boolean first = true;
                while ((line = br.readLine()) != null) {
                    if (first) { first = false; continue; }
                    String[] parts = line.split(",");
                    if (parts.length < 3) continue;
                    Map<String, Object> student = new java.util.HashMap<>();
                    student.put("studentid", parts[0]);
                    student.put("gpa", parts[1].isEmpty() ? null : Double.valueOf(parts[1]));
                    student.put("termCount", parts[2].isEmpty() ? null : Integer.valueOf(parts[2]));
                    allStudents.add(student);
                }
            } catch (Exception e) { e.printStackTrace(); }
        }
        // Sıralama
        List<Map<String, Object>> groupA = allStudents.stream()
            .filter(s -> s.get("termCount") != null && ((Integer)s.get("termCount")) <= 8)
            .sorted((a, b) -> Double.compare(
                b.get("gpa") == null ? 0 : (Double)b.get("gpa"),
                a.get("gpa") == null ? 0 : (Double)a.get("gpa")
            ))
            .toList();
        List<Map<String, Object>> groupB = allStudents.stream()
            .filter(s -> s.get("termCount") != null && ((Integer)s.get("termCount")) > 8)
            .sorted((a, b) -> {
                int tcA = (Integer)a.get("termCount");
                int tcB = (Integer)b.get("termCount");
                if (tcA != tcB) return Integer.compare(tcA, tcB);
                double gpaA = a.get("gpa") == null ? 0 : (Double)a.get("gpa");
                double gpaB = b.get("gpa") == null ? 0 : (Double)b.get("gpa");
                return Double.compare(gpaB, gpaA);
            })
            .toList();
        List<Map<String, Object>> sorted = new java.util.ArrayList<>();
        sorted.addAll(groupA);
        sorted.addAll(groupB);
        // CSV oluştur
        StringBuilder sb = new StringBuilder();
        sb.append("Student Number,GPA,Term Count\n");
        for (Map<String, Object> s : sorted) {
            sb.append(s.get("studentid")).append(",");
            sb.append(s.get("gpa") != null ? s.get("gpa") : "").append(",");
            sb.append(s.get("termCount") != null ? s.get("termCount") : "").append("\n");
        }
        // Kaydet
        String dirPath = System.getProperty("user.dir") + "/uploads/student_affairs_sort";
        new File(dirPath).mkdirs();
        try {
            java.nio.file.Files.write(new File(dirPath + "/sorted_students.csv").toPath(), sb.toString().getBytes());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("File write error");
        }
        return ResponseEntity.ok("Sorted and saved");
    }

    @GetMapping("/student-affairs/sorted-students-csv")
    public ResponseEntity<?> getStudentAffairsSortedStudentsCsv() {
        String filePath = System.getProperty("user.dir") + "/uploads/student_affairs_sort/sorted_students.csv";
        File file = new File(filePath);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] content = java.nio.file.Files.readAllBytes(file.toPath());
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "sorted_students.csv");
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to read file");
        }
    }

    @GetMapping("/student-affairs/top-three-students-csv")
    public ResponseEntity<?> getStudentAffairsTopThreeStudentsCsv() {
        String filePath = System.getProperty("user.dir") + "/uploads/student_affairs_sort/sorted_students.csv";
        File file = new File(filePath);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            List<String> lines = Files.readAllLines(file.toPath());
            if (lines.size() <= 1) { // Only header or empty
                return ResponseEntity.notFound().build();
            }
            
            // Get header and first 3 students (after header)
            StringBuilder sb = new StringBuilder();
            sb.append(lines.get(0)).append("\n"); // Header
            for (int i = 1; i < Math.min(4, lines.size()); i++) {
                sb.append(lines.get(i)).append("\n");
            }
            
            byte[] content = sb.toString().getBytes();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "top_three_students.csv");
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to read file");
        }
    }
} 