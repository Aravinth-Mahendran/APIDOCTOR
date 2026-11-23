
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const monitorRoutes = require("./routes/monitorRoutes");
const startMonitoring = require("./services/scheduler");
const incidentRoutes = require("./routes/incidentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to APIWatch API"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "UP",
    message: "APIWatch backend is running"
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);

// Start application
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`APIWatch server running on port ${PORT}`);

      // Start automatic monitoring
      startMonitoring();
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
