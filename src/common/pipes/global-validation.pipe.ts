import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const GlobalValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  validationError: { target: false },
  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    const errors = validationErrors.map((error) => {
      const constraints = error.constraints || {};
      const message = Object.values(constraints)[0] || 'Validation failed';
      return {
        field: error.property,
        message,
      };
    });

    return new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      errors,
    });
  },
});