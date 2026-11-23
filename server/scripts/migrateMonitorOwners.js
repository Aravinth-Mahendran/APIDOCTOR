
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Monitor = require("../models/Monitor");
const User = require("../models/User");

const migrateMonitorOwners = async () => {
  try {
    await connectDB();

    const userId = "6b026f4c8143d32889b97c93";

    // Verify that the target user exists
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Target user does not exist");
    }

    // Migrate monitors without an owner
    const result = await Monitor.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: user._id } }
    );

    console.log("Migration completed!");
    console.log("Matched:", result.matchedCount);
    console.log("Modified:", result.modifiedCount);

    // Verify no monitors are missing an owner
    const remaining = await Monitor.countDocuments({
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });

    console.log("Monitors without owner:", remaining);

  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

migrateMonitorOwners();
