
const checkAPI = require("./services/healthCheck");

const testMonitoring = async () => {
  const urls = [
    "https://api.github.com",
    "https://jsonplaceholder.typicode.com",
    "https://www.google.com"
  ];

  for (const url of urls) {
    const result = await checkAPI(url);

    console.log("\n-------------------------");
    console.log("URL:", result.url);
    console.log("Status:", result.status);
    console.log("HTTP Code:", result.statusCode);
    console.log("Response Time:", result.responseTime, "ms");
    console.log("Error:", result.error || "None");
  }
};

testMonitoring();
