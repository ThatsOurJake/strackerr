import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

const WEB_ERROR_MESSAGES: Record<number, string> = {
  [HttpStatus.FORBIDDEN]: "You don't have permission to view this",
  [HttpStatus.NOT_FOUND]: "Page not found",
  [HttpStatus.TOO_MANY_REQUESTS]: "Too many requests",
};

@Catch()
export class WebExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WebExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `Request failed: ${request.method} ${request.originalUrl}`,
        stack,
      );
    }

    if (response.headersSent) {
      return;
    }

    if (request.path.startsWith("/api/")) {
      response.status(statusCode).json({
        statusCode,
        message:
          statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
            ? "Internal server error"
            : this.getExceptionMessage(exception),
      });
      return;
    }

    if (statusCode === HttpStatus.UNAUTHORIZED) {
      response.redirect("/login");
      return;
    }

    response.status(statusCode).render("error", {
      title: `Error ${statusCode}`,
      statusCode,
      message:
        statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? "Something went wrong"
          : (WEB_ERROR_MESSAGES[statusCode] ?? this.getExceptionMessage(exception)),
    });
  }

  private getExceptionMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return "Internal server error";
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") {
      return exceptionResponse;
    }

    const message = (exceptionResponse as { message: string | string[] }).message;
    return Array.isArray(message) ? message.join(", ") : message;
  }
}
