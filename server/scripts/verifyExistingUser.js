require("dotenv").config();

const mongoose = require("mongoose");
const dns = require("dns");
const User = require("../models/User");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const verifyExistingUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await User.updateOne(
      { email: "aravinthkumarv001@gmail.com" },
      {
        $set: {
          isEmailVerified: true
        }
      }
    );

    console.log("Migration result:", result);

    const user = await User.findOne({
      email: "aravinthkumarv001@gmail.com"
    }).select("email isEmailVerified");

    console.log("Updated account:", user);

  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

verifyExistingUser();