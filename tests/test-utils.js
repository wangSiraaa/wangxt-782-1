const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function launchBrowser() {
  const launchOptions = {
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true
  };
  
  try {
    return await puppeteer.launch(launchOptions);
  } catch (e) {
    console.log("默认配置启动失败，尝试备用配置...");
    try {
      launchOptions.headless = "new";
      return await puppeteer.launch(launchOptions);
    } catch (e2) {
      console.log("备用配置也失败，尝试最简配置...");
      launchOptions.headless = true;
      launchOptions.args = ["--no-sandbox"];
      return await puppeteer.launch(launchOptions);
    }
  }
}

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createStaticServer(port, baseDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url === "/" ? "index.html" : req.url;
      if (urlPath.indexOf("?") >= 0) {
        urlPath = urlPath.split("?")[0];
      }
      
      let filePath = path.join(baseDir, urlPath);
      
      const extname = path.extname(filePath);
      const contentType = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml"
      }[extname] || "application/octet-stream";

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if(error.code === "ENOENT") {
            res.writeHead(404);
            res.end("File Not Found");
          } else {
            res.writeHead(500);
            res.end("Server Error: " + error.code);
          }
        } else {
          res.writeHead(200, { "Content-Type": contentType });
          res.end(content, "utf-8");
        }
      });
    });

    server.listen(port, (err) => {
      if (err) reject(err);
      else resolve(server);
    });
  });
}

function printResults(title, results) {
  console.log("\\n" + "=".repeat(60));
  console.log("📋 " + title);
  console.log("=".repeat(60));
  
  results.forEach((r, i) => {
    console.log("\\n" + (i + 1) + ". " + r.step);
    console.log("   期望: " + r.expected);
    console.log("   实际: " + r.actual);
    console.log("   结果: " + (r.passed ? "✅ 通过" : "❌ 失败"));
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log("\\n" + "=".repeat(60));
  console.log("📊 总计: " + passed + "/" + total + " 通过");
  console.log("=".repeat(60));
  
  return { passed, total };
}

module.exports = {
  launchBrowser,
  waitFor,
  createStaticServer,
  printResults
};

