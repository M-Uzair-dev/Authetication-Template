# API Routes Reference

## Base URL

```
http://localhost:5000
```

All routes are prefixed:
- Auth routes: `/auth`
- User routes: `/user`

---

## Authentication

Tokens are stored as **httpOnly cookies** — the browser sends them automatically. You do not need to set Authorization headers.

| Cookie | Contents | Max-Age |
|---|---|---|
| `access_token` | Signed JWT | 30 minutes |
| `refresh_token` | Signed JWT | 7 days |

When the access token expires, call `POST /auth/get-access-token` to silently rotate both tokens using the refresh token cookie.

---

## The `device` Field

Most endpoints require a `device` field in the request body. This must be a **valid UUID v4** that uniquely identifies the client device/browser. Generate one once and persist it (e.g. `localStorage`).

```
"device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

This enables per-device session management — each device gets its own refresh token, allowing multiple simultaneous sessions.

---

## Shared Response Structure

### Success
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable message",
  "type": "ACCESS_TOKEN_EXPIRED"
}
```

### Validation Error (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Must contain at least one uppercase letter" }
  ]
}
```

---

## Error Types

The `type` field in error responses is a string. Use these values on the client to handle specific scenarios programmatically.

| `type` | Description |
|---|---|
| `"ACCESS_TOKEN_EXPIRED"` | Access token has expired. Call `POST /auth/get-access-token` to refresh. |
| `"REFRESH_TOKEN_EXPIRED"` | Refresh token has expired or been revoked. User must log in again. |
| `"INVALID_CREDENTIALS"` | Email or password is incorrect. |
| `"USER_NOT_FOUND"` | No user found for the given identifier. |
| `"BAD_REQUEST"` | Malformed request or missing required data. |
| `"UNAUTHORIZED"` | Request lacks valid authentication. |
| `"TOO_MANY_REQUESTS"` | Rate limit exceeded. |
| `"APP_ERROR"` | Generic application error with no specific type assigned. |
| `"VALIDATION_ERROR"` | Zod validation failed. See `details` array for field-level errors. |

---

## User Object

Returned in login, signup, and user endpoints. The `password` field is never included.

```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "emailVerified": false,
  "createdAt": "2026-03-29T10:00:00.000Z",
  "updatedAt": "2026-03-29T10:00:00.000Z"
}
```

---

---

# Auth Routes — `/auth`

---

## POST /auth/signup

Register a new account. Sets `access_token` and `refresh_token` cookies on success. Sends a verification email asynchronously.

**Rate limit:** 10 requests / 5 minutes

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass1!",
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | Required, non-empty |
| `email` | string | Valid email, trimmed, lowercased |
| `password` | string | 8–100 chars, must contain uppercase, lowercase, digit, special character |
| `device` | string | Valid UUID v4 |

### Response `201`
```json
{
  "success": true,
  "message": "Signup successful",
  "data": {
    "user": { ...User }
  }
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"A user with this email already exists."` | — |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/login

Authenticate with email and password. Sets `access_token` and `refresh_token` cookies on success. Sends a login alert email asynchronously.

**Rate limit:** 10 requests / 5 minutes

### Request Body
```json
{
  "email": "john@example.com",
  "password": "SecurePass1!",
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email |
| `password` | string | 8–100 chars, complexity rules |
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ...User }
  }
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `404` | `"Invalid Credentials"` | `2` |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/forgotPassword

Sends a password reset email. Always returns success regardless of whether the email exists (prevents user enumeration). A Redis lock prevents duplicate emails within 60 seconds for the same account.

**Rate limit:** 3 requests / 5 minutes

### Request Body
```json
{
  "email": "john@example.com",
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email |
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Password reset email sent!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

> The email contains a link to `{FRONTEND_URL}/resetPassword?t={token}`. The token expires per `RESET_TOKEN_EXPIRY`.

---

## POST /auth/resetPassword

Resets the user's password using the token from the reset email. On success, deletes the reset token and all active sessions (forces re-login on all devices).

**Rate limit:** 10 requests / 5 minutes

### Request Body
```json
{
  "token": "<token from email link query param>",
  "newPassword": "NewSecurePass1!"
}
```

| Field | Type | Rules |
|---|---|---|
| `token` | string | Required |
| `newPassword` | string | 8–100 chars, complexity rules |

### Response `200`
```json
{
  "success": true,
  "message": "Password reset Successful, please login!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"Invalid Reset Token"` | — |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/verifyEmail

Verifies a user's email address using the token from the verification email. Sets `emailVerified = true` and deletes the verification token.

**Rate limit:** 10 requests / 5 minutes

### Request Body
```json
{
  "token": "<token from email link query param>"
}
```

| Field | Type | Rules |
|---|---|---|
| `token` | string | Required |

### Response `200`
```json
{
  "success": true,
  "message": "Email verification successful!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"Invalid Verification Token"` | — |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/resendVerificationEmail

Resends the email verification link. Enforces a 5-minute cooldown between requests per user. Always returns success even if the email is not found (prevents enumeration).

**Rate limit:** 3 requests / 5 minutes

### Request Body
```json
{
  "email": "john@example.com",
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email |
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Verification email sent successfully!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `429` | `"Please wait {n} minutes before requesting another email."` | — |
| `500` | `"We couldn't send the email. Please try again in a moment."` | — |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` (rate limiter) | `6` |

---

## POST /auth/logout

Logs out the current device session. Deletes the refresh token from the database and sets a Redis revocation key to block any in-flight access tokens. Clears both cookies.

**Rate limit:** 10 requests / 5 minutes
**Auth required:** Yes (access token cookie)

### Request Body
```json
{
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Logout successful!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `401` | `"Unauthorized"` | `5` |
| `401` | `"Access token expired..."` | `0` |
| `401` | `"Session revoked or expired..."` | `1` |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/logout-all

Logs out all active sessions for the authenticated user across all devices. Expires all refresh tokens in the DB and writes Redis revocation keys for each.

**Rate limit:** 10 requests / 5 minutes
**Auth required:** Yes (access token cookie)

### Request Body
```json
{
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Logout successful!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"User not found!"` | `3` |
| `401` | `"Unauthorized"` | `5` |
| `401` | `"Access token expired..."` | `0` |
| `401` | `"Session revoked or expired..."` | `1` |
| `429` | `"Too many requests"` | `6` |

---

## POST /auth/get-access-token

Silently rotates both tokens using the refresh token cookie. Call this when a request fails with `type: "ACCESS_TOKEN_EXPIRED"`. Sets new `access_token` and `refresh_token` cookies.

> **Theft detection:** If the refresh token's `tokenId` is not found in the database (already consumed), all sessions for that user are immediately wiped.

**Rate limit:** 10 requests / 5 minutes

### Request Body
```json
{
  "device": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Rules |
|---|---|---|
| `device` | string | Valid UUID v4 |

### Response `200`
```json
{
  "success": true,
  "message": "Access token generated successfully"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `401` | `"Refresh token invalid, please login again."` | `1` |
| `401` | `"Session revoked or expired. Please login again."` | `1` |
| `400` | Validation errors | — |
| `429` | `"Too many requests"` | `6` |

---

---

# User Routes — `/user`

All user routes require authentication (access token cookie).

**Common auth errors for all user routes:**

| Status | Message | Type |
|---|---|---|
| `401` | `"Unauthorized"` | `5` |
| `401` | `"Access token expired..."` | `0` |
| `401` | `"Session revoked or expired. Please login again."` | `1` |

---

## GET /user/me

Returns the currently authenticated user. Checks Redis cache first; falls back to database and repopulates cache (TTL: 1 hour).

### Response `200`
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "emailVerified": true,
      "createdAt": "2026-03-29T10:00:00.000Z",
      "updatedAt": "2026-03-29T10:00:00.000Z"
    }
  }
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"User not found!"` | `3` |

---

## PATCH /user/me

Updates the authenticated user's profile. Currently supports updating `name` only. Invalidates and refreshes Redis user cache on success.

### Request Body
```json
{
  "name": "Jane Doe"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | Required, non-empty |

### Response `200`
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": { ...User }
  }
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `404` | `"User not found!"` | `3` |
| `400` | Validation errors | — |

---

## DELETE /user/me

Permanently deletes the authenticated user's account and all associated tokens (cascade). Clears the Redis user cache entry.

### Response `200`
```json
{
  "success": true,
  "message": "User deleted successfully!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `404` | `"User not found!"` | `3` |

---

## GET /user/sessions

Returns all active sessions (refresh tokens) for the authenticated user. `lastActive` is populated from Redis — reflects when that session last made an authenticated request.

### Response `200`
```json
{
  "success": true,
  "message": "Sessions fetched successfully!",
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "deviceName": "Chrome on Windows",
        "lastActive": "2026-03-29T14:30:00.000Z"
      },
      {
        "id": "uuid",
        "deviceName": "Mobile Safari",
        "lastActive": null
      }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Token ID — use this as `tokenId` to revoke the session |
| `deviceName` | string \| null | Parsed from User-Agent at login time |
| `lastActive` | ISO datetime \| null | Last authenticated request timestamp (from Redis) |

---

## POST /user/revoke-session

Revokes a specific session by its token ID. Verifies the session belongs to the authenticated user before revoking (prevents IDOR). Sets a Redis revocation key to block any in-flight access token for that session.

### Request Body
```json
{
  "tokenId": "uuid-of-session-to-revoke"
}
```

| Field | Type | Rules |
|---|---|---|
| `tokenId` | string | Required, non-empty. Obtain from `GET /user/sessions` |

### Response `200`
```json
{
  "success": true,
  "message": "Sessions revoked successfully!"
}
```

### Errors
| Status | Message | Type |
|---|---|---|
| `400` | `"Token not found."` | — |
| `400` | `"Invalid session, please login again!"` | — |
| `401` | `"Unable to revoke token."` | — |
| `400` | Validation errors | — |

---

---

# Recommended Client-Side Token Handling

```
Every request
  └─ If response type === "ACCESS_TOKEN_EXPIRED"
       └─ Call POST /auth/get-access-token  { device }
            ├─ Success → retry original request
            └─ Failure (type === "REFRESH_TOKEN_EXPIRED") → redirect to login
```
