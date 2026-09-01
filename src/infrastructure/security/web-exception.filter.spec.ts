import { ArgumentsHost, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { WebExceptionFilter } from "./web-exception.filter";

const createHost = (path: string) => {
  const response = {
    status: jest.fn(),
    render: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
    headersSent: false,
  };
  response.status.mockReturnValue(response);
  const request = { path, method: "GET", originalUrl: path };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
};

describe("WebExceptionFilter", () => {
  it("renders friendly web errors", () => {
    const { host, response } = createHost("/admin/users");

    new WebExceptionFilter().catch(new ForbiddenException("internal detail"), host);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.render).toHaveBeenCalledWith("error", expect.objectContaining({
      statusCode: 403,
      message: "You don't have permission to view this",
    }));
  });

  it("keeps API errors as JSON", () => {
    const { host, response } = createHost("/api/v1/logs");

    new WebExceptionFilter().catch(new ForbiddenException("Denied"), host);

    expect(response.json).toHaveBeenCalledWith({ statusCode: 403, message: "Denied" });
    expect(response.render).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated web requests before rendering", () => {
    const { host, response } = createHost("/history");

    new WebExceptionFilter().catch(new UnauthorizedException(), host);

    expect(response.redirect).toHaveBeenCalledWith("/login");
    expect(response.render).not.toHaveBeenCalled();
  });

  it("does not write a second response after headers are sent", () => {
    const { host, response } = createHost("/history");
    response.headersSent = true;

    new WebExceptionFilter().catch(new ForbiddenException(), host);

    expect(response.render).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
  });
});
