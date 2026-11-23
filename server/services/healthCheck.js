
const axios = require("axios");

const checkAPI = async (monitor) => {
  const startTime = Date.now();

  const {
    url,
    method = "GET",
    headers = {},
    requestBody = null,
    expectedStatusCodes = [],
    responseKeyword = null,
    responseTimeWarningMs = 1000,
    responseTimeCriticalMs = 3000
  } = monitor;

  const normalizedMethod = method.toUpperCase();

  try {
    const allowedMethods = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ];

    if (!allowedMethods.includes(normalizedMethod)) {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Build request configuration
    const requestConfig = {
      url,
      method: normalizedMethod,
      timeout: 5000,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    // Attach request body where supported
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod) &&
      requestBody !== null &&
      requestBody !== undefined
    ) {
      requestConfig.data = requestBody;
    }

    const response = await axios(requestConfig);

    const responseTime = Date.now() - startTime;

    // Validate expected HTTP status
    const isExpectedStatus = expectedStatusCodes.length > 0
      ? expectedStatusCodes.includes(response.status)
      : response.status >= 200 && response.status < 300;

    // Validate optional response keyword
    let keywordMatched = true;

    if (responseKeyword) {
      const responseText =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);

      keywordMatched = responseText.includes(responseKeyword);
    }

    const isUp = isExpectedStatus && keywordMatched;

    let error = null;

    if (!isExpectedStatus) {
      error = `Unexpected HTTP status: ${response.status}`;
    } else if (!keywordMatched) {
      error = `Expected response keyword not found: ${responseKeyword}`;
    }

    // ==========================================
    // CLASSIFY API PERFORMANCE
    // Only successful API checks are classified
    // ==========================================

    let performanceStatus = "UNKNOWN";

    if (isUp) {
      if (responseTime >= responseTimeCriticalMs) {
        performanceStatus = "CRITICAL";
      } else if (responseTime >= responseTimeWarningMs) {
        performanceStatus = "SLOW";
      } else {
        performanceStatus = "HEALTHY";
      }
    }

    return {
      url,
      method: normalizedMethod,
      status: isUp ? "UP" : "DOWN",
      statusCode: response.status,
      responseTime,
      performanceStatus,
      error
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    let errorMessage = error.message;

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      errorMessage = "Request timed out";
    } else if (error.code === "ENOTFOUND") {
      errorMessage = "DNS resolution failed";
    } else if (error.code === "ECONNREFUSED") {
      errorMessage = "Connection refused";
    } else if (error.code === "ECONNRESET") {
      errorMessage = "Connection reset";
    }

    return {
      url,
      method: normalizedMethod,
      status: "DOWN",
      statusCode: error.response
        ? error.response.status
        : null,
      responseTime,
      performanceStatus: "UNKNOWN",
      error: errorMessage
    };
  }
};

module.exports = checkAPI;
