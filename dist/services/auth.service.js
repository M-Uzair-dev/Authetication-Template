import prisma from "../lib/prisma.js";
import { appError } from "../errors/errors.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import bcrypt from "bcrypt";
import { getLoginMeta } from "../utils/getLoginInfo.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
const frontend = process.env.FRONTEND_URL;
if (!frontend)
    throw new Error("Frontend url was not found in env");
const Signup = async (name, email, userPassword, device) => {
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (existingUser)
        throw new appError(400, "A user with this email already exists.");
    const hashedPassword = await bcrypt.hash(userPassword, 12);
    let response = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        const tokens = await tokenService.generateTokens({
            id: newUser.id,
            email,
        }, device, tx);
        return { user: newUser, tokens };
    });
    // generate and send token via email
    // TODO: Create a worker queue that will handle these requests rather than slowing down requests
    // failure of this email is not an issue, user can request a new one
    const token = await tokenService.generateVerificationToken(response.user.id, device);
    await emailService.sendVerificationEmail(response.user.email, `${frontend}/verifyEmail?t=${token}`);
    const { password, ...rest } = response.user;
    return { user: rest, tokens: response.tokens };
};
const Login = async (email, userPassword, device, req) => {
    const user = await prisma.user.findUnique({ where: { email } });
    const dummyHash = "$2a$12$R9h/cIPz0gi.URQHeNHGaOTmMiYeL7WrgfU8tBvGvN/7oW6Lp2T3.";
    const isMatch = await bcrypt.compare(userPassword, user?.password || dummyHash);
    if (!user || !isMatch)
        throw new appError(404, "Invalid Credentials");
    const tokens = await tokenService.generateTokens({
        id: user.id,
        email,
    }, device);
    try {
        // TODO: create a worker queue to handle these operations ratehr than slowing down the request
        // But for now, lets keep it this way
        const loginData = await getLoginMeta(req);
        await emailService.sendLoginAlertEmail(user.email, loginData);
    }
    catch (error) {
        console.error("Failed to send login alert:", error);
    }
    const { password, ...rest } = user;
    return {
        user: rest,
        tokens,
    };
};
//   device: string,
// ): Promise<boolean> => {
//   const user = await prisma.user.findUnique({
//     where: { email },
//   });
//   if (!user)
//     throw new appError(
//       200,
//       "Check your inbox. If an account is associated with that email, we've sent you a link to continue.",
//     );
//   await prisma.$transaction(async (tx) => {
//     const token = await tokenService.generateForgotPasswordToken(
//       user.id,
//       device,
//     );
//     await emailService.sendResetPasswordEmail(
//       user.email,
//       `${frontend}/resetPassword?t=${token}`,
//     );
//   });
//   return true;
// };
const forgotPassword = async (email, device) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (user) {
        // User exists - generate token and send real email
        const token = await tokenService.generateForgotPasswordToken(user.id, device);
        await emailService.sendResetPasswordEmail(user.email, `${frontend}/resetPassword?t=${token}`);
    }
    else {
        // User doesn't exist - simulate the same operations to take similar time
        // Generate a dummy token (not stored)
        const dummyToken = jwt.sign({ dummy: true }, "DummySecret", {
            expiresIn: 3600,
        });
        crypto.createHash("sha256").update(dummyToken).digest("hex");
        // Maybe add a small delay to match DB operations
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // Always return success with the same message
    return true;
};
export default {
    Signup,
    Login,
    forgotPassword,
};
//# sourceMappingURL=auth.service.js.map