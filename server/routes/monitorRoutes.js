

const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

// Protect all monitor routes
router.use(protect);

// Keep your existing controller imports
// Keep all your existing routes below

module.exports = router;


// Import controller functions
const {
  createMonitor,
  getMonitors,
  updateMonitor,
  deleteMonitor,
  getMonitorHistory,
  getMonitorStats
} = require("../controllers/monitorController");

// ==========================================
// MONITOR ROUTES
// ==========================================

// CREATE monitor
router.post("/", createMonitor);

// GET all monitors
router.get("/", getMonitors);

// GET monitoring history
router.get("/:id/history", getMonitorHistory);

// GET monitor statistics
router.get("/:id/stats", getMonitorStats);

// UPDATE monitor
router.put("/:id", updateMonitor);

// DELETE monitor
router.delete("/:id", deleteMonitor);

module.exports = router;
