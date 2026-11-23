
const dns = require("dns");

// Use Google's public DNS
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dns.resolveSrv(
  "_mongodb._tcp.cluster0.ycqtnby.mongodb.net",
  (error, addresses) => {
    if (error) {
      console.error("DNS Error:", error.message);
      return;
    }

    console.log("MongoDB SRV records found:");
    console.log(addresses);
  }
);
