
const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getIncidents,
  getActiveIncidents,
  getIncidentById
} = require("../controllers/incidentController");

// All incident routes require authentication
router.use(protect);

router.get("/", getIncidents);
router.get("/active", getActiveIncidents);
router.get("/:id", getIncidentById);

module.exports = router;
