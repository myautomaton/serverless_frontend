// 'use strict';

// const { strict } = require("assert");

// exports.handler = async (event, context) => {
//   const request = event.Records[0].cf.request;
//   const headers = request.headers || {};

//   // Extract Host header
//   const hostHeader = headers.host && headers.host[0] ? headers.host[0].value : "";
//   console.log("Incoming Host:", hostHeader);

//   // Extract subdomain from host (e.g., api.example.com → api)
//   const subdomainMatch = hostHeader.match(/^([a-z0-9-]+)\./i);
//   const subdomain = subdomainMatch ? subdomainMatch[1] : "";
//   console.log("Detected Subdomain:", subdomain);

//   // Defaults
//   let origin = {
//     domainName: 'cdn.kubdev.com.s3.amazonaws.com',
//     port: 443,
//     protocol: 'https',
//     path: '',
//     sslProtocols: ['TLSv1.2'],
//     readTimeout: 5,
//     keepaliveTimeout: 5,
//     customHeaders: {}
//   };
//   let s3 = {
//     domainName: "cdn.kubdev.com.s3.eu-central-1.amazonaws.com",
//     authMethod: "none",
//     region: "eu-central-1",
//     originPath: "",
//     customHeaders: {}
//   };
//   // define newHost so it's available for logging and potential future use
//   let newHost = s3.domainName;
//   // let newHost = "cdn.kubdev.com.s3-website.eu-central-1.amazonaws.com";

//   // // Route based on subdomain
//   // switch (subdomain) {
//   //   case "cdn":
//   //     console.log("Routing to CDN origin");
//   //     origin = {
//   //       s3: {
//   //         domainName: "cdn.kubdev.com.s3.amazonaws.com",
//   //         authMethod: "none",
//   //         region: "eu-central-1",
//   //         originPath: "",
//   //         customHeaders: {}
//   //       }
//   //     };
//   //     newHost = "cdn.kubdev.com.s3.amazonaws.com";
//   //     break;
//   //   case "bucdn":
//   //     console.log("Routing to BUCDN origin");
//   //     origin = {
//   //       custom: {
//   //         domainName: "fpone.kubdev.com.s3.amazonaws.com",
//   //         port: 443,
//   //         protocol: "https",
//   //         originPath: "",
//   //         sslProtocols: ["TLSv1.2"],
//   //         region: "eu-central-1",
//   //         readTimeout: 30,
//   //         keepaliveTimeout: 5,
//   //         customHeaders: {}
//   //       }
//   //     };
//   //     newHost = "fpone.kubdev.com.s3.amazonaws.com";
//   //     break;

//   //   default:
//   //     console.log(`Defaulting to CDN origin for subdomain '${subdomain}'`);
//   //     break;
//   // }

//   // Update the request origin and host header
//   request.origin = {
//     // custom: origin
//     s3: s3
//   };

//   // Ensure Host header matches the origin domain so CloudFront forwards correctly

//   request.headers['host'] = [{ key: 'Host', value: s3.domainName }];
//   // Add a debug header (optional)
//   request.headers['x-origin-selected'] = [
//     { key: 'X-Origin-Selected', value: subdomain }
//   ];

//   console.log("Routing to origin:", newHost);
//   return request;
// };
"use strict";

// Global import (avoids cold-start penalty)
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  // reduce retries & timeouts for faster responses
  maxRetries: 1,
  httpOptions: { timeout: 2000, connectTimeout: 500 },
});

exports.handler = async (event) => {
    try {
        // IMPORTS
        const url = String(event.rawPath || "");

        // Get subdomain from x-forwarded-host header
        const hostHeader = event.headers["X-Forwarded-Host"] || event.headers["x-forwarded-host"] || "";    
        const hostParts = hostHeader.split('.');
        if (hostParts.length < 3) {
            return {
                statusCode: 400,
                body: "Error: Invalid Host header"
            };
        }
        const subdomain = hostParts[0];
        // You can use the subdomain variable as needed

        let srcBucket = "";
        // Initialize S3 client
        if (subdomain === "cdn") {
            srcBucket = event.headers["int-src-cdn-bucket"];
        } else if (subdomain === "bucdn") {
            srcBucket = event.headers["int-src-bucdn-bucket"];
        } else if (subdomain === "pcdn") {
            srcBucket = event.headers["int-src-pcdn-bucket"];
        } else if (subdomain === "pw") {
            srcBucket = event.headers["int-src-pw-bucket"];
        } else {
            srcBucket = event.headers["int-src-cdn-bucket"];
        }
        let file_path = url.substring(1); // Remove leading '/'

        // Prevent direct access
        if (!srcBucket) {
            return {
                statusCode: 403,
                body: "Error: Direct access not allowed"
            };
        }

        if (!url) {
            throw new Error("No URL path found");
        }

    // Fetch from S3
    let original;
    try {
        original = await s3
          .getObject({ Bucket: srcBucket, Key: file_path })
          .promise();
    } catch (err) {
        if (["NoSuchKey", "NotFound"].includes(err.code) || err.statusCode === 404) {
          return { statusCode: 404, body: "File not found" };
        }
        console.error("S3 fetch error:", err);
        return { statusCode: 500, body: "Internal S3 error" };
    }

    const contentType = (original.ContentType || "application/octet-stream").toLowerCase();
    const isBinary =
        ["image/", "audio/", "video/"].some((t) => contentType.startsWith(t)) ||
        [
          "application/octet-stream",
          "application/pdf",
          "application/zip",
          "application/x-font",
        ].includes(contentType);

    // Return optimized headers
    const headers = {
        "Content-Type": contentType,
        // "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400", // cache for 1 day
        "Content-Length": String(original.ContentLength || 0),
    };

    return {
        statusCode: 200,
        headers,
        body: isBinary ? original.Body.toString("base64") : original.Body.toString("utf8"),
        isBase64Encoded: isBinary,
    };
    // add tracing
    } catch (err) {
        // catch all errors and trace
        console.error("Error fetching file:", err);
        return {
          statusCode: 500,
          body: err.message + "" + err.stack,
        };
    }
};
