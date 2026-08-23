# TICKET-027: Swagger / OpenAPI Documentation

**Feature:** [FEA-010: Public API](../../features/FEA-010-public-api.md)

## Goal
Configure Swagger UI and annotate all API v1 endpoints and DTOs with OpenAPI decorators so the API is self-documenting.

## Scope
- `@nestjs/swagger` setup in `main.ts`
- Decorators on all `ApiV1` controllers and DTOs
- Swagger UI served at `/api/docs`

## Setup (`main.ts`)
```ts
const config = new DocumentBuilder()
  .setTitle('STrackerr API')
  .setDescription('Personal media history tracking API')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'ApiKey')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Controller Decorators
Apply to all `ApiV1` controllers and their route handlers:
- `@ApiTags('log')` / `@ApiTags('media')` / `@ApiTags('stats')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: 201, description: '...' })`
- `@ApiResponse({ status: 401, description: 'Invalid or missing API key' })`
- `@ApiResponse({ status: 409, description: 'Duplicate entry' })` (log POST)
- `@ApiSecurity('ApiKey')` on all handlers

## DTO Decorators
Apply `@ApiProperty()` with `description` and `example` on all request/response DTO fields.

## Acceptance Criteria
- [ ] `GET /api/docs` renders Swagger UI without authentication
- [ ] All API v1 endpoints visible in Swagger UI with descriptions
- [ ] "Authorize" button in Swagger UI accepts an `X-API-Key` value
- [ ] All DTO fields have descriptions and example values
- [ ] Swagger UI "Try it out" works for all endpoints
