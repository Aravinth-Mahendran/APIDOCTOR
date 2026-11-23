
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
  sendPasswordResetEmail,
  sendVerificationEmail
} = require("../services/emailService");

// GENERATE JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password."
      });
    }

    if (name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000
    });

    const verificationUrl =
      `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    try {
      await sendVerificationEmail(
        user.email,
        verificationUrl
      );
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);

      console.error(
        "Verification email error:",
        emailError.message
      );

      return res.status(503).json({
        success: false,
        message: "Unable to send verification email. Please try again later."
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account."
    });

  } catch (error) {
    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed."
    });
  }
};

// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        requiresVerification: true
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
};

// VERIFY EMAIL
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required."
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select(
      "+emailVerificationToken +emailVerificationExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or expired."
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in."
    });

  } catch (error) {
    console.error("Email verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Email verification failed."
    });
  }
};

// RESEND VERIFICATION EMAIL
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    // Generic response avoids revealing account status.
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "If the account exists and needs verification, a verification email will be sent."
      });
    }

    const verificationToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires =
      Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const verificationUrl =
      `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    try {
      await sendVerificationEmail(
        user.email,
        verificationUrl
      );
    } catch (emailError) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      console.error(
        "Resend verification error:",
        emailError.message
      );

      return res.status(503).json({
        success: false,
        message: "Unable to send verification email. Please try again later."
      });
    }

    return res.status(200).json({
      success: true,
      message: "If the account exists and needs verification, a verification email will be sent."
    });

  } catch (error) {
    console.error("Resend verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process verification request."
    });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const genericMessage =
      "If an eligible account exists, a password reset link will be sent.";

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      isEmailVerified: true
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires =
      Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetUrl =
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(
        user.email,
        resetUrl
      );
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error(
        "Password reset email error:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: genericMessage
    });

  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request."
    });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide and confirm your new password."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select(
      "+passwordResetToken +passwordResetExpires"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or expired."
      });
    }

    user.password = await bcrypt.hash(password, 12);

    // Invalidate all previously issued JWT sessions.
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    // Make the reset token one-time use.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in again."
    });

  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Password reset failed."
    });
  }
};

// EXPORT CONTROLLERS
module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
};
