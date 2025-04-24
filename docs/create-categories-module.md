# Task: Create a NestJS Categories Module with Prisma

Create a new NestJS module for managing Categories with the following requirements:

- Place the module in `src/modules/categories/` with the structure defined in `.cursor/rules/nestjs-best-practices.mdc`:
  - Include `categories.module.ts`, `categories.controller.ts`, `categories.service.ts`, and `categories.repository.ts`.
  - Place DTOs in `src/modules/categories/dto/` with files `create-category.dto.ts` and `category.dto.ts`.
- Implement a `POST /v1/categories` endpoint to create a new category, requiring a `name` (string, minimum length 3, must be unique as defined in `prisma/schema.prisma`).
- Implement a `GET /v1/categories/:id` endpoint to retrieve a category by its ID.
- Use Prisma for database operations, referencing the `Category` model in `prisma/schema.prisma`.
- Include DTOs for request (`CreateCategoryDto`) and response (`CategoryDto`) with validation using `class-validator`.
- Add Swagger documentation for all endpoints using `@nestjs/swagger`.
- Handle errors using NestJS built-in exceptions (e.g., `NotFoundException` for non-existent IDs, `BadRequestException` for validation errors).
- Use Dependency Injection to inject `PrismaService` into the repository.
- Strictly adhere to the best practices defined in `.cursor/rules/nestjs-best-practices.mdc`, including API versioning, validation, error handling, and Swagger documentation.
