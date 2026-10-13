export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status = 400, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}
