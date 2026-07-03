// Re-export JWT signing utilities for backward compatibility
export { signToken, verifyToken, createSessionToken, TOKEN_NAME } from '@/lib/jwt'

// Import the session store utilities
export { generateJti, revokeToken, isTokenRevoked } from '@/lib/session-store'

// Import 2FA utilities
export { generateTOTPSecret, verifyTOTP, enableTwoFactor, verifyTwoFactorCode, disableTwoFactor } from '@/lib/twofa'
