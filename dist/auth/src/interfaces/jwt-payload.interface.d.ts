export interface ServicesJwtPayload {
    from_service: string;
    to_service: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}
