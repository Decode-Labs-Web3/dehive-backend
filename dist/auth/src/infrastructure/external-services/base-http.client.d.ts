import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { Response } from '../../interfaces/response.interface';
export declare abstract class BaseHttpClient {
    protected readonly httpService: HttpService;
    protected baseURL: string;
    protected readonly logger: Logger;
    constructor(httpService: HttpService, baseURL: string);
    protected get<T>(url: string, config?: AxiosRequestConfig): Promise<Response<T>>;
    protected post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<Response<T>>;
    protected put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<Response<T>>;
    protected delete<T>(url: string, config?: AxiosRequestConfig): Promise<Response<T>>;
    private handleError;
}
