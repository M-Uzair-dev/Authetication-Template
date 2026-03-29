import z from "zod";

const deviceSchema = z.uuid({
  message:
    "Please include a {device} property with a valid uuid in request, you can generate a random uuid and store it in localstorage, then send it with each request. it is used to allow multiple sessions per user.",
});

const partialUser = z.object({
  name: z.string("Name is required").nonempty("Name is required"),
});

const revokeSessionSchema = z.object({
  tokenId: z.string("tokenId is required").min(1, "TokenId is required"),
});
const getUserSessions = z.object({
  device: deviceSchema,
});

export default {
  partialUser,
  revokeSessionSchema,
  getUserSessions,
};
