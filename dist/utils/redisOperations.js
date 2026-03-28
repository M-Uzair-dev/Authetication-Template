import { redis } from "../lib/redis.js";
import z from "zod";
const userSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    id: z.uuid(),
    emailVerified: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
const getUserFromCache = async (key) => {
    try {
        const res = await redis.get(key);
        if (!res)
            return null;
        try {
            return JSON.parse(res);
        }
        catch (parseError) {
            console.error(`Cache corruption for key ${key}:`, parseError);
            await redis.del(key).catch(() => { });
            return null;
        }
    }
    catch (e) {
        console.error("REDIS_GET_ERROR:", e);
        return null;
    }
};
//# sourceMappingURL=redisOperations.js.map