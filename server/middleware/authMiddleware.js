
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in."
      });
    }

    // Verify JWT signature and expiry.
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Load the current user from MongoDB.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists."
      });
    }

    // Reject tokens issued before the latest password reset.
    if (
      decoded.tokenVersion !== (user.tokenVersion || 0)
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again."
      });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email
    };

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
};

module.exports = { protect };
