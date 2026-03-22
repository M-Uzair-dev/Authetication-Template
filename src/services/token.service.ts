import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { appError } from "../errors/errors.js";
import { errorType } from "../errors/errors.js";
import { v4 as uuid } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) throw new Error("JWT Secret is required!");

type payloadType = {
  id: string;
  email: string;
};

type refreshTokenJWTPayload = payloadType & {
  tokenId: string;
};

// now we include tokenId in refresh token payload to allow direct lookup
const generateTokens = async (
  payload: payloadType,
  device: string,
): Promise<{
  refreshToken: string;
  accessToken: string;
}> => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });

  // accessToken is made. now here is the issue, we need to store the refresh token
  // in the DB but that DB record's id needs to be in the refresh token payload
  // So we basically need to put the record's id in the token and token in the record
  // so for that to be possible, we manually generate a uuid for the record and put it
  // inside of the refresh token payload, this way we can directly look up the record using
  // the uuid without having to do any hashing or comparisons in the DB query which is more
  // efficient and less error prone

  // generate a new uuid
  const refreshTokenId = uuid();

  // create data for the jwt refreshToken
  const refreshTokenPayload: refreshTokenJWTPayload = {
    ...payload,
    tokenId: refreshTokenId,
  };

  // add it in the token payload
  const refreshToken = jwt.sign(refreshTokenPayload, JWT_SECRET, {
    expiresIn: "7d",
  });

  // then hash that token
  const tokenHash = await bcrypt.hash(refreshToken, 10);

  // then use that same id to create a DB record and put the token has inside
  await prisma.token.create({
    data: {
      id: refreshTokenId,
      type: "REFRESH_TOKEN",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      device: device,
      userId: payload.id,
      tokenHash,
    },
  });

  return {
    refreshToken,
    accessToken,
  };
};

const verifyUser = async (
  accessToken: string,
  refreshToken: string,
): Promise<string> => {
  try {
    // at first, we check the access token
    const data = jwt.verify(accessToken, JWT_SECRET!) as payloadType;

    // if access token was invalid, jwt wouldve thrown an error and sent us to the catch block
    // coming here means the access token is valid, so we send back the id

    return data.id;
  } catch (err) {
    try {
      // we are in the catch block, which means the access token is not valid
      // so now we need to throw an error, lets verify the refresh token to see if it's valid

      const decoded = jwt.verify(
        refreshToken,
        JWT_SECRET!,
      ) as refreshTokenJWTPayload;

      // coming here means that refresh token was valid, otherwise jwt would've sent us in catch block
      // now that jwt refresh token is valid, lets see if it exists in our DB and if its expired

      // finding the token using token id inside the refresh token payload, this way we can directly look it up without having to hash and compare
      const validTokenRecord = await prisma.token.findUnique({
        where: {
          id: decoded.tokenId,
        },
      });

      // Lets see if no token was found or the found token is expired

      if (
        !validTokenRecord ||
        validTokenRecord.expiresAt < new Date() ||
        validTokenRecord.type !== "REFRESH_TOKEN"
      ) {
        if (validTokenRecord) {
          // if we have an expired token, then delete it
          await prisma.token.delete({ where: { id: validTokenRecord.id } });
        }

        // throw a refresh token error
        throw new appError(
          401,
          "Session revoked or expired. Please login again.",
          errorType.REFRESH_TOKEN_EXPIRED,
        );
      }

      // so the token exists, lets see if it contains the correct hashed token
      const isTokenValid = await bcrypt.compare(
        refreshToken,
        validTokenRecord.tokenHash,
      );
      if (!isTokenValid)
        throw new appError(
          401,
          "Session revoked or expired. Please login again.",
          errorType.REFRESH_TOKEN_EXPIRED,
        );

      // coming here means we have found a valid refresh token, in that case the access token is the issue and refresh token is fine
      // so we throw a accessToken error
      throw new appError(
        401,
        "Access token expired. Use refresh token to continue.",
        errorType.ACCESS_TOKEN_EXPIRED,
      );
    } catch (refreshErr) {
      // coming here means either it was a jwt error or our custom error
      // if it was our custom appError then throw it
      if (refreshErr instanceof appError) throw refreshErr;

      // if it was anything else then it was refreshToken validation error. in that case we send a refresh token error
      throw new appError(
        401,
        "Invalid session. Please login again.",
        errorType.REFRESH_TOKEN_EXPIRED,
      );
    }
  }
};

export default {
  generateTokens,
  verifyUser,
};
