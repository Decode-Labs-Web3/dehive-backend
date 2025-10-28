export class ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;

  constructor(success: boolean, statusCode: number, message: string, data: T) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static ok<T>(data: T, message = "Operation successful"): ApiResponse<T> {
    return new ApiResponse(true, 200, message, data);
  }

  static error<T>(
    statusCode: number,
    message: string,
    data: T = null as T,
  ): ApiResponse<T> {
    return new ApiResponse(false, statusCode, message, data);
  }
}
