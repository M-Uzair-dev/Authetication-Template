## Please follow these steps to run this on your machine propoerly

## 1. Prerequisites

1. Download and install posgreSQL
2. Download and install Docker
3. Get your gmail app password

### 2. Environment Variables

```bash
cp env_example.txt .env
```

Fill in all values:

| Variable                    | Description                                      | Default              |
| --------------------------- | ------------------------------------------------ | -------------------- |
| `DATABASE_URL`              | PostgreSQL connection string                     | —                    |
| `ACCESS_TOKEN_SECRET`       | JWT signing secret for access tokens             | —                    |
| `ACCESS_TOKEN_EXPIRY`       | Access token lifetime in **milliseconds**        | `900000` (15 min)    |
| `REFRESH_TOKEN_SECRET`      | JWT signing secret for refresh tokens            | —                    |
| `REFRESH_TOKEN_EXPIRY`      | Refresh token lifetime in **milliseconds**       | `604800000` (7 days) |
| `RESET_TOKEN_SECRET`        | JWT signing secret for password reset tokens     | —                    |
| `RESET_TOKEN_EXPIRY`        | Reset token lifetime in **milliseconds**         | `1800000` (30 min)   |
| `VERIFICATION_TOKEN_SECRET` | JWT signing secret for email verification tokens | —                    |
| `VERIFICATION_TOKEN_EXPIRY` | Verification token lifetime in **milliseconds**  | `172800000` (2 days) |
| `MAIL_HOST`                 | SMTP host                                        | `smtp.gmail.com`     |
| `MAIL_PORT`                 | SMTP port                                        | `587`                |
| `MAIL_USER`                 | SMTP username / sender address                   | —                    |
| `MAIL_PASS`                 | SMTP password or app password                    | —                    |
| `REDIS_HOST`                | Redis host                                       | `127.0.0.1`          |
| `REDIS_PORT`                | Redis port                                       | `6379`               |
| `FRONTEND_URL`              | Frontend base URL (used in email links)          | —                    |

> All four JWT secrets must be set or the server will throw on startup. Use long, random strings (32+ characters each).

### 3. Redis

```bash
# First time — downloads the image and starts the container
docker run -d --name redis-server -p 6379:6379 redis

# Subsequent starts
docker start redis-server
```

### 4. Database

```bash
# Apply migrations
npx prisma migrate deploy

# Reset during development
npx prisma migrate reset

# Open Prisma Studio (GUI)
npx prisma studio
```

### 5. Run

```bash
# Development (TypeScript watch + nodemon)
npm run dev

# Production
npm run build
npm start
```

Server starts on `PORT` (default `5000`).
