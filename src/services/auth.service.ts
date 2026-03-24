import type { User } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { appError } from "../errors/errors.js";
import tokenService from "./token.service.js";
import bcrypt from "bcrypt";

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const Signup = async (
  name: string,
  email: string,
  userPassword: string,
  device: string,
): Promise<{
  user: Omit<User, "password">;
  tokens: Tokens;
}> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (existingUser)
    throw new appError(400, "A user with this email already exists.");
  const hashedPassword = await bcrypt.hash(userPassword, 10);

  let response = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    const tokens = await tokenService.generateTokens(
      {
        id: newUser.id,
        email,
      },
      device,
      tx,
    );

    // Verification token generation logic comes here

    // verification email sending logic comes here we will use nodemailer

    return { user: newUser, tokens };
  });

  const { password, ...rest } = response.user;
  return { user: rest, tokens: response.tokens };
};

const Login = async (
  email: string,
  userPassword: string,
  device: string,
): Promise<{
  user: Omit<User, "password">;
  tokens: Tokens;
}> => {
  const user = await prisma.user.findUnique({ where: { email } });

  const dummyHash =
    "$2a$12$R9h/cIPz0gi.URQHeNHGaOTmMiYeL7WrgfU8tBvGvN/7oW6Lp2T3.";

  const isMatch = await bcrypt.compare(
    userPassword,
    user?.password || dummyHash,
  );
  if (!user || !isMatch) throw new appError(404, "Invalid Credentials");

  const tokens = await prisma.$transaction(async (tx) => {
    let record = await tokenService.generateTokens(
      {
        id: user.id,
        email,
      },
      device,
      tx,
    );
    // here, we will add logic to send user an email that someone logged in
    // using nodemailer
    return record;
  });
  const { password, ...rest } = user;
  return {
    user: rest,
    tokens,
  };
};
const forgotPassword = async (
  email: string,
  device: string,
): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user)
    throw new appError(
      200,
      "Check your inbox. If an account is associated with that email, we've sent you a link to continue.",
    );
  await prisma.$transaction(async (tx) => {
    const resetPasswordToken = await tokenService.generateForgotPasswordToken(
      user.id,
      device,
    );
    // here we will add the logic to send reset password email via nodmemailer
  });
  return true;
};
export default {
  Signup,
  Login,
  forgotPassword,
};
