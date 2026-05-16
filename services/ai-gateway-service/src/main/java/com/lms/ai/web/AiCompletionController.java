package com.lms.ai.web;

import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.CompletionResponse;
import com.lms.ai.service.AiGatewayService;
import com.lms.ai.web.dto.CompletionApiRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiCompletionController {

    private final AiGatewayService gateway;

    public AiCompletionController(AiGatewayService gateway) {
        this.gateway = gateway;
    }

    @PostMapping("/completions")
    public CompletionResponse complete(@Valid @RequestBody CompletionApiRequest req,
                                       @AuthenticationPrincipal Jwt jwt) {
        CompletionRequest providerReq = new CompletionRequest(
                req.model(), req.messages(), req.temperature(), req.maxTokens());
        String userId = jwt != null ? jwt.getSubject() : null;
        return gateway.complete(providerReq, req.providerId(), req.useCase(), userId);
    }
}
