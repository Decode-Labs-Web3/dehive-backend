declare const _default: (() => {
    secret: {
        servicesToken: string | undefined;
    };
    servicesToken: {
        expiresIn: string;
        algorithm: string;
        issuer: string;
        audience: string;
        servicesIssuer: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: {
        servicesToken: string | undefined;
    };
    servicesToken: {
        expiresIn: string;
        algorithm: string;
        issuer: string;
        audience: string;
        servicesIssuer: string;
    };
}>;
export default _default;
