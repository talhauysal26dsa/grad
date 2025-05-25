package com.example.demo.config;

import com.example.demo.service.TranscriptParserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ApplicationStartupRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationStartupRunner.class);
    
    @Autowired
    private TranscriptParserService transcriptParserService;
    
    @Override
    public void run(ApplicationArguments args) throws Exception {
        logger.info("Initializing Python environment for transcript parser...");
        transcriptParserService.initPythonEnvironment();
        logger.info("Python environment initialization completed");
    }
} 