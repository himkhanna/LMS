package com.lms.ai.web;

import com.lms.ai.domain.AiUsageLog;
import com.lms.ai.repository.AiUsageLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/usage")
public class AdminUsageController {

    private final AiUsageLogRepository logs;

    public AdminUsageController(AiUsageLogRepository logs) {
        this.logs = logs;
    }

    @GetMapping
    public Page<AiUsageLog> list(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "50") int size) {
        return logs.findAllByOrderByCreatedAtDesc(PageRequest.of(page, Math.min(size, 200)));
    }
}
