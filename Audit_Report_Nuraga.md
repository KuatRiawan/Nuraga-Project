# Audit Report: Nuraga System Architecture Analysis

**Date:** June 2, 2026  
**Auditor:** Senior QA & Systems Architect  
**Scope:** Full-stack architecture analysis (Frontend & Backend)

---

## Executive Summary

This report provides a comprehensive analysis of the Nuraga Safety Management System, focusing on four critical areas: Authentication & Security, Real-Time Communication, Data Fetching & State Management, and Database Architecture. The system demonstrates a modern architecture with React Query for state management, Socket.io for real-time communication, and a refresh token mechanism for security. However, several potential issues and areas for improvement have been identified.

---

## 1. Authentication & Security Flow

### Process Flow Analysis

**Backend Flow:**
1. **Login Process** (`authController.js`):
   - User submits email/password to `/api/auth/login`
   - Backend validates credentials using bcrypt
   - Generates access token (1h expiry) and refresh token (7d expiry)
   - Stores refresh token in database (`User.refresh_token`, `User.refresh_token_expires`)
   - Returns both tokens to frontend
   - Records audit log for login event

2. **Token Refresh Process** (`authController.js`):
   - Frontend sends refresh token to `/api/auth/refresh-token`
   - Backend verifies refresh token signature and expiry
   - Validates refresh token matches database value
   - Generates new access token and rotates refresh token
   - Updates database with new refresh token
   - Returns new tokens to frontend

3. **Logout Process** (`authController.js`):
   - Frontend calls `/api/auth/logout`
   - Backend clears refresh token from database
   - Records audit log for logout event

4. **Route Protection** (`authMiddleware.js`):
   - `protect` middleware extracts Bearer token from headers or query params
   - Verifies JWT signature using `JWT_SECRET`
   - Attaches decoded user data to `req.user`
   - `authorize` middleware checks role-based access

**Frontend Flow:**
1. **Login Process** (`AuthContext.jsx`):
   - Clears existing auth state before new login
   - Stores access token and refresh token in localStorage
   - Sets user state from response
   - Clears Authorization header from axios defaults

2. **Token Management** (`axios.js`):
   - Request interceptor adds Bearer token from localStorage
   - Response interceptor catches 401 errors
   - On 401, attempts to refresh token using refresh token
   - On successful refresh, updates localStorage and retries original request
   - On refresh failure, clears tokens and redirects to login

3. **Session Initialization** (`AuthContext.jsx`):
   - On app load, checks for existing token in localStorage
   - Calls `/api/auth/me` to fetch user data
   - On error, clears tokens and sets user to null

### Security Findings

#### Critical Issues:

1. **JWT Secret Validation is Incomplete**
   - **Location:** `server.js` line 30-33
   - **Issue:** JWT_SECRET validation only checks if it exists, but doesn't validate strength or complexity
   - **Risk:** Weak secrets can be brute-forced, compromising all tokens
   - **Recommendation:** Add minimum length check (e.g., 32 characters) and entropy validation

2. **Refresh Token Stored in Database Without Hashing**
   - **Location:** `authController.js` line 73-75
   - **Issue:** Refresh tokens are stored in plaintext in database
   - **Risk:** Database compromise exposes all active refresh tokens
   - **Recommendation:** Hash refresh tokens before storing (similar to passwords)

3. **No Rate Limiting on Auth Endpoints**
   - **Location:** `authRoutes.js`
   - **Issue:** No rate limiting on login, refresh, or registration endpoints
   - **Risk:** Brute force attacks on login, refresh token abuse
   - **Recommendation:** Implement rate limiting using express-rate-limit

4. **Token Expiry Not Enforced on Access Token**
   - **Location:** `authMiddleware.js` line 13
   - **Issue:** JWT verification checks signature but doesn't explicitly check expiry (handled by jwt.verify but no custom handling)
   - **Risk:** Expired tokens might be accepted if clock skew is significant
   - **Recommendation:** Add explicit expiry check with clock skew tolerance

#### Medium Issues:

5. **Query Parameter Token Acceptance**
   - **Location:** `authMiddleware.js` line 7-9
   - **Issue:** Accepts token from query parameter in addition to Bearer header
   - **Risk:** Tokens can be logged in server access logs, browser history, and referer headers
   - **Recommendation:** Remove query parameter token acceptance, only use Bearer header

6. **No Token Blacklisting Mechanism**
   - **Location:** System-wide
   - **Issue:** No mechanism to invalidate access tokens before expiry
   - **Risk:** Compromised access tokens remain valid until expiry
   - **Recommendation:** Implement token blacklist in Redis or database with TTL

7. **localStorage for Token Storage**
   - **Location:** `AuthContext.jsx` and `axios.js`
   - **Issue:** Tokens stored in localStorage are vulnerable to XSS attacks
   - **Risk:** Malicious scripts can steal tokens and impersonate users
   - **Recommendation:** Use httpOnly cookies for token storage

#### Code Smells:

8. **Hardcoded Fallback REWARDS_CONFIG in Multiple Places**
   - **Location:** `authController.js` line 252-257 and line 339-344
   - **Issue:** Same rewards configuration duplicated in `redeemPoints` and `getRewards`
   - **Risk:** Inconsistency if one is updated but not the other
   - **Recommendation:** Use single source of truth (SystemConfig) only

9. **Inconsistent Error Messages**
   - **Location:** Various auth endpoints
   - **Issue:** Some return "Invalid credentials" for both missing user and wrong password
   - **Risk:** Information leakage is good, but inconsistent handling
   - **Recommendation:** Standardize error handling across all auth endpoints

---

## 2. Real-Time Communication Flow (WebSocket/Socket.io)

### Process Flow Analysis

**Backend Setup:**
1. **Socket.io Initialization** (`server.js` line 134-141):
   - Creates Socket.io server with CORS configuration
   - Sets maxHttpBufferSize to 1MB to prevent memory bomb attacks
   - Attaches io instance to Express app for controller access

2. **Authentication Middleware** (`server.js` line 144-158):
   - Extracts token from handshake auth or headers
   - Verifies JWT signature
   - Attaches decoded user to socket object
   - Rejects connection on authentication failure

3. **Connection Handler** (`server.js` line 160-165):
   - Logs user connection with user ID
   - Logs user disconnection
   - No custom event handlers at server level (events emitted from controllers)

**Frontend Setup:**
1. **Socket Connection** (`useSocket.js`):
   - Creates singleton socket instance (module-level variable)
   - Connects on first hook invocation
   - Uses JWT token from localStorage for authentication
   - Sets connection state tracking

2. **Event Listeners** (`App.jsx` EmergencyListener component):
   - Listens for 11 different event types
   - Shows browser notifications for each event type
   - Plays audio alert for emergency events
   - Properly cleans up listeners on unmount

3. **Event Emission** (Controllers):
   - Hazard controller emits: HAZARD_CREATED, HAZARD_UPDATED
   - Incident controller emits: INCIDENT_CREATED, INCIDENT_UPDATED
   - Audit controller emits: AUDIT_CREATED
   - CAPA controller emits: ACTION_CREATED, ACTION_UPDATED

### Security Findings

#### Critical Issues:

1. **Singleton Socket Without Cleanup**
   - **Location:** `useSocket.js` line 4, 10-11
   - **Issue:** Socket is stored as module-level singleton and never disconnected
   - **Risk:** Memory leak on page refreshes, multiple connections accumulate
   - **Recommendation:** Implement proper disconnect logic or use React context for socket lifecycle

2. **No Socket Reconnection Strategy**
   - **Location:** `useSocket.js`
   - **Issue:** No reconnection configuration or exponential backoff
   - **Risk:** Connection drops result in permanent disconnection until page refresh
   - **Recommendation:** Configure reconnection with exponential backoff and max retries

3. **Audio Context Not Properly Cleaned**
   - **Location:** `App.jsx` line 53-62
   - **Issue:** AudioContext and oscillator created but not explicitly closed
   - **Risk:** Memory leak with repeated emergency alerts
   - **Recommendation:** Explicitly close AudioContext and stop oscillator after playback

#### Medium Issues:

4. **No Event Acknowledgment**
   - **Location:** All controller WebSocket emissions
   - **Issue:** Events are emitted without acknowledgment mechanism
   - **Risk:** No guarantee events were delivered to clients
   - **Recommendation:** Use socket.io acknowledgment pattern for critical events

5. **No Room-Based Segmentation**
   - **Location:** System-wide
   - **Issue:** All events broadcast to all connected users
   - **Risk:** Unnecessary network traffic, privacy concerns
   - **Recommendation:** Implement rooms for role-based or department-based event filtering

6. **Notification Permission Request on Every Event**
   - **Location:** `App.jsx` line 89-91
   - **Issue:** Requests notification permission on every PTW event if not granted
   - **Risk:** Repeated permission requests annoy users
   - **Recommendation:** Request permission once on app initialization

#### Code Smells:

7. **Hardcoded Event Names**
   - **Location:** Multiple files
   - **Issue:** Event names hardcoded as strings throughout codebase
   - **Risk:** Typos cause silent failures, no type safety
   - **Recommendation:** Create constants file for all event names

8. **Console.log in Production Code**
   - **Location:** `App.jsx` multiple lines
   - **Issue:** Console.log statements for event data
   - **Risk:** Performance impact, potential information leakage
   - **Recommendation:** Remove or replace with proper logging library

---

## 3. Data Fetching & State Management

### Process Flow Analysis

**React Query Integration:**
1. **Query Setup** (Various pages):
   - HazardPage uses `useQuery` for hazards list
   - AuditPage uses `useQuery` for audits and checklist templates
   - GamificationPage uses manual fetch functions (not React Query)
   - CertificationPage, AttendancePage, SettingsPage use React Query

2. **Mutation Setup** (Various pages):
   - HazardPage uses `useMutation` for create, verify, override
   - AuditPage uses `useMutation` for create/update
   - Mutations invalidate queries on success

3. **Cache Management**:
   - Query keys: `['hazards']`, `['audits']`, `['checklistTemplates']`, etc.
   - Manual invalidation using `queryClient.invalidateQueries()`
   - No cache time configuration visible (using defaults)

**API Configuration:**
1. **Axios Instance** (`axios.js`):
   - Base URL from environment variable
   - Request interceptor adds Authorization header
   - Response interceptor handles token refresh
   - No retry logic for network failures

2. **Error Handling**:
   - Token refresh on 401 errors
   - Force logout on refresh failure
   - No global error boundary for unexpected errors

### State Management Findings

#### Critical Issues:

1. **Inconsistent State Management Patterns**
   - **Location:** GamificationPage vs other pages
   - **Issue:** GamificationPage uses manual useState + useEffect instead of React Query
   - **Risk:** Inconsistent caching, no automatic refetching, race conditions
   - **Recommendation:** Migrate GamificationPage to use React Query for all data fetching

2. **No Global Error Boundary**
   - **Location:** Frontend root
   - **Issue:** No error boundary to catch React errors
   - **Risk:** Unhandled errors crash entire app, poor UX
   - **Recommendation:** Add ErrorBoundary component at app root

3. **No Request Cancellation**
   - **Location:** All React Query hooks
   - **Issue:** No cancellation of in-flight requests on component unmount
   - **Risk:** Memory leaks, state updates on unmounted components
   - **Recommendation:** React Query handles this automatically, but verify configuration

#### Medium Issues:

4. **No Optimistic Updates**
   - **Location:** All mutation hooks
   - **Issue:** Mutations don't use optimistic updates
   - **Risk:** Slower perceived performance, UI flicker
   - **Recommendation:** Implement optimistic updates for better UX

5. **No Cache Time Configuration**
   - **Location:** QueryClient setup
   - **Issue:** No staleTime or cacheTime configured
   - **Risk:** Using defaults may not be optimal for all data types
   - **Recommendation:** Configure appropriate cache times per query type

6. **Hardcoded REWARDS in Frontend**
   - **Location:** `GamificationPage.jsx` line 13-18
   - **Issue:** REWARDS array hardcoded despite backend having SystemConfig
   - **Risk:** Frontend and backend can become out of sync
   - **Recommendation:** Remove hardcoded REWARDS, use API data only

7. **No Loading State for Socket Reconnection**
   - **Location:** `useSocket.js`
   - **Issue:** No visual indication when socket is disconnected/reconnecting
   - **Risk:** Users don't know real-time features are down
   - **Recommendation:** Add connection status indicator in UI

#### Code Smells:

8. **Duplicate Logic for Camera Handling**
   - **Location:** HazardPage and IncidentPage
   - **Issue:** Similar camera start/stop/capture logic duplicated
   - **Risk:** Maintenance burden, potential inconsistencies
   - **Recommendation:** Extract to custom hook `useCamera`

9. **No Request Deduplication**
   - **Location:** API calls
   - **Issue:** Multiple simultaneous requests for same data not deduplicated
   - **Risk:** Unnecessary server load
   - **Recommendation:** React Query handles this, but verify configuration

---

## 4. Database Architecture & Configuration

### Process Flow Analysis

**Database Setup:**
1. **Sequelize Configuration** (`db.js`):
   - PostgreSQL connection with environment variables
   - Connection pooling configured (max: 20, min: 2)
   - Fail-fast validation for required environment variables
   - Logging disabled in production

2. **Model Associations** (`server.js` line 52-98):
   - CASCADE delete for most User relationships
   - SET NULL for optional relationships (approver, responder, audit logs)
   - Hooks enabled for cascade operations

3. **Database Sync** (`server.js` line 187):
   - Currently using `sequelize.sync({ alter: true })` (TEMPORARY)
   - Should be `sequelize.sync({ force: false })` for production
   - Manual migrations for column additions

**Configuration Management:**
1. **SystemConfig Model** (`SystemConfig.js`):
   - Key-value pair storage for system-wide configuration
   - Used for: WhatsApp settings, AI endpoints, rewards, checklist templates
   - Seeded on first run if empty

2. **Safety Migrations** (`server.js` line 196-267):
   - Manual column additions with IF NOT EXISTS
   - Enum value additions for PostgreSQL
   - Data migrations (Operator → Staff role)

### Database Findings

#### Critical Issues:

1. **sync({ alter: true }) in Production Code**
   - **Location:** `server.js` line 187
   - **Issue:** Currently using alter: true (temporary fix for missing columns)
   - **Risk:** Can cause unexpected schema changes in production, data loss
   - **Recommendation:** Revert to `force: false` and use proper migration system

2. **No Database Backup Strategy**
   - **Location:** System-wide
   - **Issue:** No automated backup or restore mechanism visible
   - **Risk:** Data loss from accidental deletion, corruption, or disaster
   - **Recommendation:** Implement automated backup strategy (pg_dump, WAL archiving)

3. **No Transaction Isolation Configuration**
   - **Location:** `db.js`
   - **Issue:** No transaction isolation level specified
   - **Risk:** Default isolation may not be appropriate for all operations
   - **Recommendation:** Configure appropriate isolation level (READ COMMITTED or higher)

#### Medium Issues:

4. **Connection Pool May Be Too Small**
   - **Location:** `db.js` line 34-39
   - **Issue:** Max pool size of 20 may be insufficient for high traffic
   - **Risk:** Connection exhaustion under load
   - **Recommendation:** Monitor connection usage and adjust pool size accordingly

5. **No Database Index Strategy Visible**
   - **Location:** Model definitions
   - **Issue:** No explicit indexes defined for frequently queried fields
   - **Risk:** Slow queries as data grows
   - **Recommendation:** Add indexes on foreign keys, email, frequently filtered fields

6. **Manual Migrations Instead of Migration Framework**
   - **Location:** `server.js` line 196-267
   - **Issue:** Manual SQL migrations mixed with Sequelize sync
   - **Risk:** Hard to track schema changes, no rollback mechanism
   - **Recommendation:** Use proper migration framework (Sequelize CLI migrations)

7. **No Data Validation at Database Level**
   - **Location:** Model definitions
   - **Issue:** Limited use of Sequelize validators (only allowNull, type checks)
   - **Risk:** Invalid data can enter database
   - **Recommendation:** Add validators (length, format, custom validators)

#### Code Smells:

8. **Hardcoded Enum Values in Multiple Places**
   - **Location:** Models and frontend
   - **Issue:** Enum values hardcoded in both backend and frontend
   - **Risk:** Inconsistency if one is updated
   - **Recommendation:** Create shared constants or API endpoint for enum values

9. **No Soft Delete Implementation**
   - **Location:** All models
   - **Issue:** All deletions are hard deletes (CASCADE)
   - **Risk:** Permanent data loss, no audit trail for deletions
   - **Recommendation:** Consider soft delete for critical data (add deletedAt column)

10. **SystemConfig Value Parsing Without Validation**
    - **Location:** `configController.js` line 69-74
    - **Issue:** JSON.parse without schema validation
    - **Risk:** Invalid JSON can crash server, malformed data accepted
    - **Recommendation:** Add JSON schema validation before parsing

---

## 5. Cross-Cutting Concerns

### Performance Issues:

1. **No Image Optimization**
   - Images uploaded without compression or resizing
   - Recommendation: Add image processing middleware (sharp)

2. **No CDN for Static Assets**
   - Static files served from backend
   - Recommendation: Use CDN for production

3. **No Response Compression**
   - No gzip/brotli compression configured
   - Recommendation: Add compression middleware

### Monitoring & Logging:

1. **No Structured Logging**
   - Console.log used throughout
   - Recommendation: Use structured logging library (winston, pino)

2. **No Performance Monitoring**
   - No APM or performance tracking
   - Recommendation: Add APM (New Relic, Datadog)

3. **No Error Tracking**
   - No error tracking service (Sentry, Bugsnag)
   - Recommendation: Add error tracking for production

### Testing:

1. **No Tests Visible**
   - No unit tests, integration tests, or E2E tests
   - Recommendation: Add test suite with Jest, React Testing Library

---

## 6. Recommendations Summary

### High Priority (Security & Stability):

1. **Revert sequelize.sync({ alter: true }) to force: false** - Critical production risk
2. **Hash refresh tokens in database** - Security vulnerability
3. **Implement rate limiting on auth endpoints** - Brute force protection
4. **Fix singleton socket memory leak** - Stability issue
5. **Add proper socket cleanup and reconnection strategy** - Reliability
6. **Implement token blacklisting** - Security enhancement
7. **Add global error boundary** - UX and stability

### Medium Priority (Code Quality & Maintainability):

1. **Migrate GamificationPage to React Query** - Consistency
2. **Remove hardcoded REWARDS from frontend** - Data consistency
3. **Implement proper migration framework** - Maintainability
4. **Add database indexes** - Performance
5. **Extract camera logic to custom hook** - Code reuse
6. **Create event name constants** - Type safety
7. **Add structured logging** - Observability

### Low Priority (Enhancement):

1. **Implement optimistic updates** - UX improvement
2. **Add room-based socket segmentation** - Performance
3. **Configure cache times** - Performance tuning
4. **Add image optimization** - Performance
5. **Add compression middleware** - Performance
6. **Implement testing suite** - Quality assurance

---

## Conclusion

The Nuraga system demonstrates a solid modern architecture with good separation of concerns and use of modern technologies. The refresh token mechanism and React Query integration show attention to security and user experience. However, several critical issues need immediate attention, particularly around database schema management, token security, and WebSocket memory management. Addressing the high-priority recommendations will significantly improve system security, stability, and maintainability.

**Overall Assessment:** Good architecture with critical security and stability issues that require immediate attention before production deployment.
