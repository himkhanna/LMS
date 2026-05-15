# Backend Technology Stack

## Core Stack

- Java 21
- Spring Boot 3
- Spring Security
- Spring Cloud
- Spring AI
- Hibernate / JPA
- Gradle or Maven
- REST + GraphQL APIs

### Why Java

- Enterprise-grade scalability
- Excellent Kubernetes support
- Strong async processing
- Mature security ecosystem
- Better suitability for workflow-heavy enterprise systems
- Easier integration with enterprise IAM and middleware

---

## AI Architecture (Plug-and-Play AI Providers)

### Objective

The platform must support dynamic AI provider configuration from the Admin Portal without code changes.

Administrators should be able to:

- Configure AI providers using API keys
- Enable/disable providers
- Select default providers
- Configure provider routing
- Set token limits and budgets
- Monitor AI usage
- Switch models dynamically

The AI architecture must be provider-agnostic.

---

## Supported AI Providers

Initial providers:

- Azure OpenAI
- OpenAI
- Anthropic Claude
- Google Gemini
- AWS Bedrock
- Ollama (self-hosted)
- Groq
- Cohere

Future providers should be easily pluggable.

---

## AI Use Cases

The AI engine should support:

- Course generation
- Quiz generation
- Summarization
- Translation
- Speech generation
- AI tutor/chat
- Recommendation engine
- Learning path generation
- Skill extraction
- Compliance analysis
- Transcript generation

---

## AI Provider Abstraction Layer

### Architecture

```
Frontend
    |
AI Gateway Service
    |
Provider Abstraction Layer
    |
------------------------------------------------
| OpenAI | Azure OpenAI | Claude | Gemini | etc |
------------------------------------------------
```

The application must never directly call providers from business services.

All AI calls should pass through:

- AI Gateway
- Prompt orchestration layer
- Provider abstraction layer

---

## AI Gateway Responsibilities

The AI Gateway Service should:

- Route requests to providers
- Handle retries/fallbacks
- Enforce rate limits
- Manage token budgets
- Log prompts/responses
- Apply content safety checks
- Handle observability
- Track AI cost analytics

---

## Admin Features for AI Management

### AI Provider Management Screen

Admin should be able to:

- Add provider
- Enter API key
- Test connection
- Enable/disable provider
- Configure model mappings
- Configure fallback providers
- Configure temperature/max tokens
- View usage analytics

---

## AI Configuration Database Schema

Tables:

- `ai_provider`
- `ai_model`
- `ai_usage_log`
- `ai_prompt_template`
- `ai_budget_policy`
- `ai_rate_limit_policy`

---

## Spring AI Integration

Use:

- Spring AI abstraction layer
- WebClient for provider calls
- Reactive processing where applicable

Suggested modules:

- `spring-ai-openai`
- `spring-ai-azure-openai`
- custom Anthropic integration
- custom Gemini integration

---

## AI Prompt Framework

Prompt templates should be configurable from database/admin UI.

Examples:

- Quiz generation prompt
- Course summary prompt
- Learning objective prompt
- Translation prompt

Prompts should support:

- Versioning
- Variables
- Localization
- Testing sandbox

---

## AI Safety & Governance

The platform must support:

- Prompt logging
- PII masking
- Toxicity filtering
- Prompt injection protection
- Audit trails
- Human approval workflows

Azure services:

- Azure AI Content Safety
- Microsoft Purview

---

## AI Processing Pipeline

1. User uploads document
2. Content extraction service processes file
3. AI orchestration service selects provider
4. Prompt templates applied
5. Provider generates content
6. Moderation checks run
7. Human review workflow triggered
8. Final content published

---

## Recommended Java Microservices

- `auth-service`
- `user-service`
- `course-service`
- `ai-gateway-service`
- `ai-orchestration-service`
- `assessment-service`
- `notification-service`
- `analytics-service`
- `workflow-service`
- `reporting-service`
- `search-service`

---

## Event-Driven Architecture

Use:

- Azure Service Bus
- Kafka (optional, for large-scale streaming)

Events:

- `file-uploaded`
- `ai-processing-started`
- `quiz-generated`
- `course-published`
- `assessment-completed`
- `certificate-issued`

---

## Recommended Java Libraries

### Security

- Spring Security
- OAuth2 Resource Server

### API

- Spring WebFlux
- OpenFeign

### Data

- Spring Data JPA
- Hibernate

### Observability

- Micrometer
- OpenTelemetry

### Messaging

- Spring Cloud Stream

### Testing

- Testcontainers
- JUnit 5

---

## Kubernetes Recommendations

AKS should run:

- Stateless APIs
- AI workers
- Background processors
- Event consumers

Use:

- HPA autoscaling
- KEDA
- Separate GPU node pools for AI workloads

---

## Future AI Enhancements

- AI avatar instructors
- Voice tutors
- Real-time translation
- Personalized learning AI agents
- Skill graph AI
- Auto-generated learning paths
- AI coaching assistant
