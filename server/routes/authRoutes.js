
const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

const {
  loginLimiter,
  forgotPasswordLimiter,
  registerLimiter
} = require("../middleware/rateLimitMiddleware");

// REGISTER
router.post(
  "/register",
  registerLimiter,
  registerUser
);

// LOGIN
router.post(
  "/login",
  loginLimiter,
  loginUser
);

// VERIFY EMAIL
router.get(
  "/verify-email/:token",
  verifyEmail
);

// RESEND VERIFICATION EMAIL
router.post(
  "/resend-verification",
  forgotPasswordLimiter,
  resendVerificationEmail
);

// FORGOT PASSWORD
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

// RESET PASSWORD
router.post(
  "/reset-password/:token",
  resetPassword
);

module.exports = router;
