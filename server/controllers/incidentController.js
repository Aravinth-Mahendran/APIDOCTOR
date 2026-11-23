
const Incident = require("../models/incident");
const Monitor = require("../models/Monitor");

// ==========================================
// GET ALL INCIDENTS
// ==========================================

const getIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({
      userId: req.user.id
    })
      .populate("monitorId", "name url method")
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });

  } catch (error) {
    console.error("Get incidents error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch incidents."
    });
  }
};

// ==========================================
// GET ACTIVE INCIDENTS
// ==========================================

const getActiveIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({
      userId: req.user.id,
      status: "OPEN"
    })
      .populate("monitorId", "name url method")
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents
    });

  } catch (error) {
    console.error("Get active incidents error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active incidents."
    });
  }
};

// ==========================================
// GET INCIDENT BY ID
// ==========================================

const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate("monitorId", "name url method");

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found."
      });
    }

    res.status(200).json({
      success: true,
      incident
    });

  } catch (error) {
    console.error("Get incident details error:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID."
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch incident details."
    });
  }
};

module.exports = {
  getIncidents,
  getActiveIncidents,
  getIncidentById
};
