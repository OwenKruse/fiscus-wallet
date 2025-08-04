# Authentication API Routes

This directory contains the authentication API routes for the Plaid-Nile integration. All routes use Nile DB for authentication and session management.

## Available Routes

### POST /api/auth/signin
Authenticates a user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "tenant-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Sign in successful"
}
```

Sets an HTTP-only cookie `auth-token` with the JWT token.

### POST /api/auth/signup
Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "company": "Example Corp"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "tenant-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Account created successfully"
}
```

**Password Requirements:**
- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number

### POST /api/auth/signout
Signs out the current user and invalidates their session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Sign out successful"
}
```

Clears the `auth-token` cookie.

### GET /api/auth/me
Returns the current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "company": "Example Corp",
    "tenantId": "tenant-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/auth/validate
Validates the current session and returns user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "tenant-id"
  }
}
```

## Authentication Methods

The API supports multiple authentication methods:

1. **Authorization Header**: `Authorization: Bearer <token>`
2. **HTTP-Only Cookie**: `auth-token=<token>`
3. **Custom Header**: `X-Auth-Token: <token>`

## Error Responses

All routes return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Middleware

The routes use several middleware functions:

- **Authentication Middleware**: Validates tokens and provides user context
- **Audit Logging**: Logs all authentication events
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Handles cross-origin requests
- **Validation**: Validates request bodies

## Security Features

- JWT tokens with configurable expiration
- Secure HTTP-only cookies
- Password hashing with bcrypt
- Session management with database storage
- Multi-tenant isolation
- Rate limiting protection
- Audit logging for security events

## Testing

Unit tests are available in the `__tests__` directory:

```bash
npm run test -- app/api/auth
```

The tests cover:
- Input validation
- Error handling
- Token extraction
- Response formatting
- Security features