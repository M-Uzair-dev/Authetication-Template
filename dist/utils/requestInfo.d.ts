import type { Request } from "express";
export interface RequestMetadata {
    ipAddress: string;
    location: string;
    deviceName: string;
}
export declare function extractRequestMetadata(req: Request): RequestMetadata;
//# sourceMappingURL=requestInfo.d.ts.map