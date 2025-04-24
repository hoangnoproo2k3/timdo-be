# Task: Fix Errors in Categories Module

The Categories module in `src/modules/categories/` has several issues that need to be fixed. Please address the following problems while adhering to the best practices defined in `.cursor/rules/nestjs-best-practices.mdc`:

1. **Incorrect Import Paths for DTOs**:

   - In `categories.controller.ts`, the DTOs (`CreateCategoryDto`, `CategoryDto`) are imported from `./wrong-path`.
   - Fix the imports to use the correct path `./dto`, as the DTOs are located in `src/modules/categories/dto/`.

2. **Missing Validation in CreateCategoryDto**:

   - In `dto/create-category.dto.ts`, the `name` field is missing validation.
   - Add validation using `class-validator` to ensure `name` is a string and has a minimum length of 3 (`@IsString()`, `@MinLength(3)`).

3. **Missing Error Handling in Service**:
   - In `categories.service.ts`, the `findOne` method does not throw a `NotFoundException` when the category is not found.
   - Add error handling to throw a `NotFoundException` with the message `Category with ID ${id} not found` if the category is null.

Please fix these issues and ensure the module adheres to the structure, validation, error handling, and Swagger documentation rules defined in `.cursor/rules/nestjs-best-practices.mdc`.
