import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithId } from './express';

interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  requestId: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<RequestWithId>();
    const requestId = request.requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const payload = responseBody as Record<string, unknown>;
        message = typeof payload.message === 'string' ? payload.message : message;
        code = typeof payload.code === 'string' ? payload.code : this.defaultCode(status);
        if (Array.isArray(payload.message)) {
          message = 'Request validation failed';
          details = { fields: payload.message };
          code = 'VALIDATION_FAILED';
        }
      }
      if (code === 'INTERNAL_ERROR') {
        code = this.defaultCode(status);
      }
    } else {
      this.logger.error({
        event: 'unhandled_exception',
        requestId,
        path: request.originalUrl,
        method: request.method,
        exception,
      });
    }

    const body: ApiErrorBody = {
      success: false,
      error: { code, message, details },
      requestId,
    };
    response.status(status).json(body);
  }

  private defaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'REQUEST_FAILED';
    }
  }
}
