# Security Hardening Action Plan

## Executive Summary

This document outlines a comprehensive action plan to address all security vulnerabilities identified in the security review. The plan is organized by priority with specific implementation steps, timelines, and verification procedures.

**Project**: Banco Gamer
**Target Date for Complete Remediation**: 3 months
**Review Date**: February 17, 2026

---

## Phase 1: Critical Issues (Weeks 1-2)

### Objective: Eliminate immediate security risks that could lead to complete system compromise

---

### 1.1: Implement Firebase Security Rules
**Priority**: CRITICAL
**Effort**: 2-3 days
**Owner**: Backend Developer

#### Implementation Steps:

**Step 1: Understand Data Structure (Day 1)**
- Document all Firebase database paths
- Identify data access patterns
- Map user roles and permissions needed

**Step 2: Draft Security Rules (Day 1-2)**
Create `firestore.rules` or `database.rules.json`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - owner can read/write their own data
    match /usuarios/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
      
      // Movimientos subcollection
      match /movimientos/{movementId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Global data - admin only or authenticated for read
    match /mercado {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    match /solicitudes {
      allow read: if isAuthenticated() && isOwner(request.auth.uid);
      allow write: if isAuthenticated() && isOwner(request.auth.uid);
    }
    
    match /loteria {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    match /duelos/{duelId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    match /banco_central {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    match /evento_global {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}
```

**Step 3: Test and Deploy Rules (Day 2-3)**
- Use Firebase Console Rules Simulator to test
- Deploy rules using Firebase CLI: `firebase deploy --only firestore:rules`
- Monitor for application errors

#### Verification:
- [ ] Unauthorized users cannot read user data
- [ ] Users can only read/write their own data
- [ ] Admin operations still work correctly
- [ ] No errors in Firebase Console
- [ ] Application functions normally

---

### 1.2: Implement Firebase Authentication
**Priority**: CRITICAL
**Effort**: 3-4 days
**Owner**: Full-Stack Developer

#### Implementation Steps:

**Step 1: Setup Firebase Auth (Day 1)**
- Enable Firebase Authentication in Firebase Console
- Select Email/Password authentication provider

**Step 2: Update Registration Flow (Day 1-2)**
Modify `script.js:139-171` to use Firebase Auth:

```javascript
async function crearCuenta() {
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const nombre = document.getElementById('regNombre').value.trim();
    const pin = document.getElementById('regPin').value;

    if (password.length < 8) {
        alert("⚠️ La contraseña debe tener al menos 8 caracteres.");
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        await db.ref('usuarios/' + uid).set({
            nombreReal: nombre,
            pin: pin,
            email: email,
            saldo: 10000
        });

        alert("¡Cuenta creada exitosamente!");
        mostrarPantalla('pantalla-login');
    } catch (error) {
        handleAuthError(error);
    }
}
```

**Step 3: Update Login Flow (Day 2)**
Modify `script.js:176-212` to use Firebase Auth with PIN verification.

**Step 4: Add Session Management (Day 3)**
Implement Firebase Auth state observer for session management.

**Step 5: Add Password Reset (Day 3-4)**
Implement `recuperarPassword()` function using Firebase Auth's built-in password reset.

**Step 6: Update HTML Forms (Day 4)**
Add email and password fields to registration and login forms.

#### Verification:
- [ ] Users can register with email/password
- [ ] Users can login with valid credentials
- [ ] Invalid credentials are rejected
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly
- [ ] Password reset email is sent

---

### 1.3: Remove Hardcoded Credentials
**Priority**: CRITICAL
**Effort**: 1 day
**Owner**: DevOps Engineer

#### Implementation Steps:

**Step 1: Move Firebase Config (Day 1)**
Create `.env` file (add to `.gitignore`) with Firebase config values.

**Step 2: Create Config File (Day 1)**
Create `config.js` that reads from environment variables.

**Step 3: Remove Admin Credentials (Day 1)**
Delete hardcoded `ADMIN_USER` and `ADMIN_PIN` from client-side code.

**Step 4: Implement Admin Authentication (Day 1)**
Use Firebase Custom Claims or admin collection for admin verification.

**Step 5: Update .gitignore (Day 1)**
Add: config.js, .env, .env.local, *.key, firebase-adminsdk-*.json

#### Verification:
- [ ] No credentials in committed code
- [ ] Config file exists and is gitignored
- [ ] Application works with environment variables
- [ ] Admin functionality works without hardcoded credentials

---

### 1.4: Implement Server-Side Validation
**Priority**: CRITICAL
**Effort**: 3-4 days
**Owner**: Backend Developer

#### Implementation Steps:

**Step 1: Set Up Firebase Cloud Functions (Day 1)**
```bash
firebase init functions
cd functions
npm install --save firebase-functions firebase-admin
```

**Step 2: Create Validation Utilities (Day 1)**
Create `functions/utils/validators.js` with input validation functions.

**Step 3: Create Transfer Validation Function (Day 1-2)**
Create `functions/transfers.js` with `validarTransferencia` and `realizarTransferencia` callable functions.

**Step 4: Create Casino Validation (Day 2)**
Create `functions/casino.js` with bet validation and rate limiting.

**Step 5: Update Client-Side Code (Day 3)**
Update transfer function to call server-side validation before execution.

**Step 6: Deploy Cloud Functions (Day 4)**
```bash
firebase deploy --only functions
```

#### Verification:
- [ ] Cloud Functions deployed successfully
- [ ] Client can call functions
- [ ] Invalid transfers are rejected by server
- [ ] Rate limiting prevents abuse
- [ ] Transaction atomicity maintained

---

## Phase 2: High Priority Issues (Weeks 3-5)

### Objective: Protect against common attack vectors and improve data integrity

---

### 2.1: Implement XSS Protection
**Priority**: HIGH
**Effort**: 2-3 days
**Owner**: Frontend Developer

#### Implementation Steps:

**Step 1: Add DOMPurify Library (Day 1)**
Add to `index.html`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"></script>
```

**Step 2: Create Safe Display Functions (Day 1)**
Add `safeDisplay()`, `safeSetText()`, and `safeSetHtml()` functions to script.js.

**Step 3: Update User Display (Day 1-2)**
Replace innerHTML usage with safe methods in ranking, movements, and user displays.

**Step 4: Implement Content Security Policy (Day 2)**
Add CSP meta tag to `index.html` header.

**Step 5: Create Input Validation Utility (Day 3)**
Add validation functions for username, PIN, and amounts.

#### Verification:
- [ ] DOMPurify library loaded successfully
- [ ] All user inputs sanitized before display
- [ ] CSP header blocks unauthorized scripts
- [ ] XSS test cases fail to execute
- [ ] Application functionality unchanged

---

### 2.2: Implement Comprehensive Rate Limiting
**Priority**: HIGH
**Effort**: 2-3 days
**Owner**: Backend Developer

#### Implementation Steps:

**Step 1: Design Rate Limiting Strategy (Day 1)**
Define rate limits per operation (transfers: 10/min, casino bets: 10/min, login: 5 per 5 min).

**Step 2: Create Rate Limiting Cloud Function (Day 1-2)**
Create `functions/rate-limiter.js` with `isRateLimited()` and `rateLimiter()` middleware.

**Step 3: Apply Rate Limiting (Day 2)**
Apply rate limiting to transfer, casino, and login functions.

**Step 4: Implement Client-Side Cooldowns (Day 3)**
Add cooldown tracking and visual feedback in the UI.

**Step 5: Create Database Indexes (Day 3)**
Create `firestore.indexes.json` and deploy for rate limiting queries.

#### Verification:
- [ ] Rate limiting prevents excessive requests
- [ ] Login attempts limited after failures
- [ ] User sees appropriate error messages
- [ ] Cooldown displays correctly
- [ ] Normal operations not affected

---

### 2.3: Fix Transaction Atomicity
**Priority**: HIGH
**Effort**: 2 days
**Owner**: Backend Developer

#### Implementation Steps:

**Step 1: Review Current Logic (Day 1)**
Analyze transfer function for non-atomic operations.

**Step 2: Implement Atomic Multi-Path Update (Day 1-2)**
Create `transferirDineroAtomico()` using Firestore batched writes.

**Step 3: Add Rollback Handling (Day 2)**
Implement compensating transaction logic for failures.

**Step 4: Implement Retry Logic (Day 2)**
Add `executeWithRetry()` function with exponential backoff.

**Step 5: Update Security Rules (Day 2)**
Add rules to prevent negative balances and unauthorized modifications.

#### Verification:
- [ ] Transfers execute atomically
- [ ] Money is not lost if transaction fails
- [ ] Both balances update simultaneously
- [ ] Rollback works when needed
- [ ] No race conditions observed

---

## Phase 3: Medium Priority Issues (Weeks 6-8)

### Objective: Enhance security posture and compliance

---

### 3.1: Enforce HTTPS and Security Headers
**Priority**: MEDIUM
**Effort**: 1-2 days
**Owner**: DevOps Engineer

#### Implementation Steps:

**Step 1: Configure Firebase Hosting (Day 1)**
Update `firebase.json` with security headers (HSTS, X-Frame-Options, CSP, etc.).

**Step 2: Deploy to Firebase Hosting (Day 1)**
```bash
firebase deploy --only hosting
```

**Step 3: Verify HTTPS (Day 1)**
Confirm SSL certificates are valid and HTTP redirects to HTTPS.

**Step 4: Update CSP (Day 2)**
Enhance Content-Security-Policy meta tag with strict directives.

#### Verification:
- [ ] Application loads over HTTPS only
- [ ] All security headers present
- [ ] CSP blocks unauthorized scripts
- [ ] No mixed content warnings
- [ ] SSL certificate valid

---

### 3.2: Improve Session Management
**Priority**: MEDIUM
**Effort**: 2 days
**Owner**: Frontend Developer

#### Implementation Steps:

**Step 1: Implement Session Timeout (Day 1)**
Add 30-minute inactivity timeout with warning at 25 minutes.

**Step 2: Implement Token Refresh (Day 1)**
Add automatic token refresh every 30 minutes.

**Step 3: Improve Logout (Day 1-2)**
Update `cerrarSesion()` to clear all state and listeners properly.

**Step 4: Use Session Storage (Day 2)**
Replace localStorage with sessionStorage for sensitive data.

**Step 5: Implement Concurrent Session Limit (Day 2)**
Add detection and warning for concurrent sessions.

#### Verification:
- [ ] Session timeout triggers after inactivity
- [ ] Warning appears before timeout
- [ ] Tokens refresh automatically
- [ ] Logout clears all state
- [ ] Concurrent sessions detected

---

### 3.3: Implement CSRF Protection
**Priority**: MEDIUM
**Effort**: 1-2 days
**Owner**: Security Engineer

#### Implementation Steps:

**Step 1: Generate CSRF Tokens (Day 1)**
Create `generateCSRFToken()`, `saveCSRFToken()`, and `validateCSRFToken()` functions.

**Step 2: Add Tokens to Forms (Day 1)**
Add hidden CSRF input to all forms and validate on submission.

**Step 3: Validate in AJAX Requests (Day 2)**
Wrap Firebase function calls with CSRF validation.

**Step 4: Server-Side Validation (Day 2)**
Add CSRF token validation in Cloud Functions.

**Step 5: Add SameSite Attributes (Day 2)**
Configure cookie attributes for any custom cookies.

#### Verification:
- [ ] CSRF tokens generated on page load
- [ ] Tokens included in all forms
- [ ] Tokens validated before submission
- [ ] Invalid tokens reject requests
- [ ] AJAX requests include tokens

---

### 3.4: Add Comprehensive Input Sanitization
**Priority**: MEDIUM
**Effort**: 1-2 days
**Owner**: Security Engineer

#### Implementation Steps:

**Step 1: Create Sanitization Library (Day 1)**
Create `Sanitization` object with clean(), stripHtml(), escapeForDb(), and validation methods.

**Step 2: Update Registration (Day 1)**
Apply sanitization to all registration inputs.

**Step 3: Update Transfer (Day 1-2)**
Apply sanitization to transfer recipient and amount inputs.

**Step 4: Update All User Inputs (Day 2)**
Apply sanitization to money requests, duels, and other user inputs.

**Step 5: Server-Side Validation (Day 2)**
Add input validation in Cloud Functions using validator library.

#### Verification:
- [ ] All inputs sanitized before use
- [ ] HTML stripped from user input
- [ ] Max lengths enforced
- [ ] Server-side validation matches client-side
- [ ] No XSS vulnerabilities in sanitized inputs

---

## Phase 4: Low Priority & Infrastructure (Weeks 9-11)

### Objective: Improve monitoring, logging, and long-term security posture

---

### 4.1: Implement Comprehensive Logging
**Priority**: LOW
**Effort**: 2-3 days
**Owner**: DevOps Engineer

#### Implementation Steps:

**Step 1: Set Up Cloud Logging (Day 1)**
Create `functions/logging.js` with Logger utility for security, auth, transaction, and error logs.

**Step 2: Update Functions with Logging (Day 1-2)**
Add logging calls to all critical functions.

**Step 3: Create Client-Side Logging (Day 2)**
Implement `ClientLogger` class for error tracking and user actions.

**Step 4: Set Up Log Retention (Day 2-3)**
Create Cloud Function to clean old logs based on retention policy.

**Step 5: Create Logging Dashboard (Day 3)**
Add admin interface for viewing and filtering logs.

#### Verification:
- [ ] Security events logged
- [ ] Auth events tracked
- [ ] Transactions logged
- [ ] Errors captured
- [ ] Old logs cleaned up automatically

---

### 4.2: Create Monitoring and Alerting
**Priority**: LOW
**Effort**: 2-3 days
**Owner**: DevOps Engineer

#### Implementation Steps:

**Step 1: Set Up Firebase Analytics (Day 1)**
Initialize Firebase Analytics and track custom events.

**Step 2: Create Real-Time Monitoring (Day 1-2)**
Implement `Monitoring` class to track active users, transfers, bets, and errors.

**Step 3: Create Alerting System (Day 2)**
Create `AlertRules` array and `evaluarAlertas()` Cloud Function.

**Step 4: Create Admin Dashboard (Day 2-3)**
Add interface for viewing and resolving alerts.

**Step 5: Set Up Uptime Monitoring (Day 3)**
Create health check endpoint and scheduled monitoring function.

#### Verification:
- [ ] Analytics events tracked
- [ ] Metrics collected and reported
- [ ] Alerts triggered on conditions
- [ ] Dashboard displays alerts
- [ ] Health checks running

---

### 4.3: Implement Backup and Recovery
**Priority**: LOW
**Effort**: 2 days
**Owner**: DevOps Engineer

#### Implementation Steps:

**Step 1: Set Up Automatic Backups (Day 1)**
Configure Firebase Firestore backups with daily schedule.

**Step 2: Create Backup Verification (Day 1-2)**
Create scheduled function to verify backup integrity.

**Step 3: Create Manual Backup (Day 2)**
Create callable function for manual backup creation.

**Step 4: Implement Restore Function (Day 2)**
Create callable function for restoring from backup.

**Step 5: Create Backup Dashboard (Day 2)**
Add admin interface for managing backups.

#### Verification:
- [ ] Automatic backups configured
- [ ] Backups created daily
- [ ] Backup verification passes
- [ ] Manual backup works
- [ ] Restore function works

---

## Phase 5: Documentation and Compliance (Week 12)

### Objective: Complete documentation and ensure compliance readiness

---

### 5.1: Create Security Documentation
**Priority**: MEDIUM
**Effort**: 2-3 days
**Owner**: Security Engineer

#### Implementation Steps:

**Step 1: Create Security Policy (Day 1)**
Create `SECURITY_POLICY.md` covering authentication, data protection, access control, and incident response.

**Step 2: Create Incident Response Plan (Day 1-2)**
Create `INCIDENT_RESPONSE.md` with severity levels, response team, and procedures.

**Step 3: Create API Security Documentation (Day 2)**
Create `API_SECURITY.md` with authentication, rate limits, input validation, and security headers.

**Step 4: Create Developer Security Guide (Day 2-3)**
Create `DEVELOPER_SECURITY.md` with secure coding practices and common pitfalls.

#### Verification:
- [ ] Security policy documented
- [ ] Incident response plan complete
- [ ] API security documented
- [ ] Developer guide created
- [ ] All documentation reviewed

---

### 5.2: Complete Testing and Validation
**Priority**: HIGH
**Effort**: 3-4 days
**Owner**: QA Engineer

#### Implementation Steps:

**Step 1: Create Test Suite (Day 1-2)**
Create comprehensive security tests for authentication, authorization, input validation, XSS, CSRF, and rate limiting.

**Step 2: Run Penetration Testing (Day 2-3)**
Use OWASP ZAP or manual testing to identify vulnerabilities.

**Step 3: Performance Testing (Day 3)**
Test that security measures don't impact performance.

**Step 4: Security Review (Day 3-4)**
Conduct final security review and create remediation report.

**Step 5: Sign-Off (Day 4)**
Get sign-off from security team and stakeholders.

#### Verification:
- [ ] All security tests pass
- [ ] No critical vulnerabilities found
- [ ] Performance impact acceptable
- [ ] Security review approved
- [ ] Project signed off

---

## Summary of Deliverables

### Documentation Files
- FIREBASE_RULES.md
- CLOUD_FUNCTIONS.md
- SECURITY_HEADERS.md
- SECURITY_POLICY.md
- INCIDENT_RESPONSE.md
- API_SECURITY.md
- DEVELOPER_SECURITY.md

### Code Changes
- Firebase Security Rules
- Cloud Functions for validation and logging
- Updated client-side authentication
- XSS protection implementation
- Rate limiting implementation
- CSRF protection implementation

### Infrastructure
- Firebase Hosting configuration with security headers
- Automated backups configured
- Monitoring and alerting system
- Logging infrastructure

---

## Timeline Overview

| Phase | Duration | Key Deliverables |
|--------|-----------|-------------------|
| Phase 1 | Weeks 1-2 | Security rules, Authentication, No hardcoded credentials, Server validation |
| Phase 2 | Weeks 3-5 | XSS protection, Rate limiting, Transaction atomicity |
| Phase 3 | Weeks 6-8 | HTTPS/Headers, Session management, CSRF, Input sanitization |
| Phase 4 | Weeks 9-11 | Logging, Monitoring, Backup/Recovery |
| Phase 5 | Week 12 | Documentation, Testing, Final review |

---

## Success Criteria

All remediation is considered successful when:

1. **All Critical Issues Resolved**
   - [ ] Firebase Security Rules implemented and tested
   - [ ] Firebase Authentication fully implemented
   - [ ] No hardcoded credentials in code
   - [ ] Server-side validation in place

2. **All High Priority Issues Resolved**
   - [ ] XSS protection implemented and tested
   - [ ] Rate limiting functional across all operations
   - [ ] All transactions atomic

3. **All Medium Priority Issues Resolved**
   - [ ] HTTPS enforced with security headers
   - [ ] Proper session management implemented
   - [ ] CSRF protection in place
   - [ ] Comprehensive input sanitization

4. **All Low Priority Issues Resolved**
   - [ ] Comprehensive logging system
   - [ ] Monitoring and alerting functional
   - [ ] Backup and recovery tested

5. **Documentation Complete**
   - [ ] All security documentation created
   - [ ] Developer guide available
   - [ ] Incident response plan documented

6. **Testing Complete**
   - [ ] All security tests passing
   - [ ] Penetration testing completed
   - [ ] Performance impact within acceptable limits

---

## Risk Mitigation

### During Implementation

1. **Progressive Rollout**: Implement changes incrementally rather than all at once
2. **Feature Flags**: Use feature flags to enable/disable security features
3. **A/B Testing**: Test new security measures with subset of users
4. **Monitoring**: Intensive monitoring during implementation phase
5. **Rollback Plans**: Detailed rollback procedures for each change

### Post-Implementation

1. **Security Audits**: Schedule quarterly security audits
2. **Penetration Testing**: Annual penetration testing
3. **Code Reviews**: Mandatory security code reviews for all changes
4. **Training**: Regular security training for development team
5. **Stay Updated**: Monitor security advisories and update dependencies

---

## Next Steps

1. **Immediate Actions (This Week)**
   - Assign team members to each phase
   - Set up development and staging environments
   - Create project management board
   - Begin Phase 1 implementation

2. **Short-term Actions (Month 1)**
   - Complete Phase 1 and Phase 2
   - Conduct initial security testing
   - Gather feedback on implemented changes
   - Adjust approach as needed

3. **Long-term Actions (Months 2-3)**
   - Complete remaining phases
   - Final security review
   - Documentation and knowledge transfer
   - Establish ongoing security processes

---

**Document Version**: 1.0
**Last Updated**: February 17, 2026
**Next Review**: Monthly during implementation, quarterly post-implementation
