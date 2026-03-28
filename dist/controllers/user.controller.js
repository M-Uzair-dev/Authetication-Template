import handleError from "../utils/handleError.js";
import userService from "../services/user.service.js";
import { appError, errorType } from "../errors/errors.js";
import userSchema from "../schemas/user.schema.js";
import { redis } from "../lib/redis.js";
const getCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "User not found!", errorType.USER_NOT_FOUND);
        const userKey = `user-${req.userId}`;
        // get chached user
        try {
            const existingUser = await redis.get(userKey);
            if (existingUser) {
                return res.status(200).json({
                    success: true,
                    message: "User retrieved successfully",
                    data: {
                        user: JSON.parse(existingUser),
                    },
                });
            }
        }
        catch (e) {
            // if redis fails, log the error and move over to DB
            console.log("REDIS USER FETCH ERROR: ", e);
        }
        const user = await userService.getUser(req.userId);
        try {
            await redis.set(userKey, JSON.stringify(user), "EX", 3600);
        }
        catch (e) {
            console.log("REDIS FAILED TO ADD USER DATA:", e);
        }
        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: {
                user,
            },
        });
    }
    catch (e) {
        handleError(e, res);
    }
};
const updateCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const partialData = userSchema.partialUser.parse(req.body);
        const user = await userService.editUser(req.userId, partialData);
        if (user) {
            const userKey = `user-${req.userId}`;
            try {
                await redis.set(userKey, JSON.stringify(user), "EX", 3600);
            }
            catch (e) {
                console.log("REDIS USER UPDATING ERROR:", e);
            }
            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: {
                    user,
                },
            });
        }
        throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
    }
    catch (e) {
        handleError(e, res);
    }
};
const deleteCurrentUser = async (req, res) => {
    try {
        if (!req.userId)
            throw new appError(400, "Please login", errorType.BAD_REQUEST);
        const success = await userService.deleteUser(req.userId);
        if (success) {
            const userKey = `user-${req.userId}`;
            try {
                await redis.del(userKey);
            }
            catch (e) {
                console.log("REDIS FAILED TO DELETE USER:", e);
            }
            return res.status(200).json({
                success: true,
                message: "User deleted successfully!",
            });
        }
        throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
    }
    catch (e) {
        handleError(e, res);
    }
};
export default {
    getCurrentUser,
    deleteCurrentUser,
    updateCurrentUser,
};
//# sourceMappingURL=user.controller.js.map