import type { Response } from "express";
import { ZodError } from "zod";
declare let handleError: (e: Error | ZodError, res: Response) => Response<any, Record<string, any>> | undefined;
export default handleError;
//# sourceMappingURL=handleError.d.ts.map