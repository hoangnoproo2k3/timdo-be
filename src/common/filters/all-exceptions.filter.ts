import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  field?: string;
  message: string;
}

interface SingleErrorResponse {
  message: string;
}

interface ValidationErrorResponse {
  message: string;
  errors: Array<ValidationError | { field: string; message: string }>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let errors: ErrorResponse[] = [{ message }];

    // Case 1: NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = exception.message;

      if (typeof exceptionResponse === 'string') {
        errors = [{ message: exceptionResponse }];
      } else if (typeof exceptionResponse === 'object') {
        if (
          'message' in exceptionResponse &&
          'errors' in exceptionResponse &&
          Array.isArray((exceptionResponse as Record<string, unknown>).errors)
        ) {
          // Validation error with errors array
          errors = (exceptionResponse as ValidationErrorResponse).errors.map(
            (err) => ({
              field:
                'property' in err
                  ? err.property
                  : 'field' in err
                    ? err.field
                    : undefined,
              message:
                'message' in err
                  ? err.message || 'Validation failed'
                  : Object.values(err.constraints || {})[0] ||
                    'Validation failed',
            }),
          );
        } else if ('message' in exceptionResponse) {
          errors = [
            {
              message:
                (exceptionResponse as SingleErrorResponse).message || message,
            },
          ];
        }
      }
    }

    // Case 2: JWT hoặc Passport lỗi xác thực
    else if (
      typeof exception === 'object' &&
      exception &&
      'name' in exception &&
      'message' in exception &&
      exception.name === 'UnauthorizedError'
    ) {
      status = 401;
      message = 'Unauthorized';
      errors = [
        {
          message:
            (exception as { message: string }).message ||
            'Invalid or missing authentication token',
        },
      ];
    }

    // Case 3: Lỗi thường khác
    else if (exception instanceof Error) {
      message = exception.message;
      errors = [{ message }];
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      errors,
    });
  }
}
