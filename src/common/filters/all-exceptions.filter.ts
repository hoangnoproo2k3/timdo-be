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
    let errors: ErrorResponse[] = [{ message: 'Internal server error' }];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        errors = [{ message: exceptionResponse }];
      } else {
        if ('message' in exceptionResponse) {
          if (
            'errors' in exceptionResponse &&
            Array.isArray((exceptionResponse as ValidationErrorResponse).errors)
          ) {
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
          } else {
            errors = [
              {
                message:
                  (exceptionResponse as SingleErrorResponse).message || message,
              },
            ];
          }
        }
      }
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
