import type { Request } from "express";
export type LoginMeta = {
    ip: string;
    location: string;
    browser: string;
    device: string;
    time: string;
};
export declare const getLoginMeta: (req: Request) => Promise<LoginMeta>;
//# sourceMappingURL=getLoginInfo.d.ts.map