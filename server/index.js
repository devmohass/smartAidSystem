import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";
import "./db.js";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import shopsRoutes from "./routes/shops.routes.js";
import beneficiariesRoutes from "./routes/beneficiaries.routes.js";
import campaignsRoutes from "./routes/campaigns.routes.js";
import transactionsRoutes from "./routes/transactions.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import auditLogsRoutes from "./routes/auditLogs.routes.js";
import auditLogger from "./middleware/auditLogger.js";
import notFoundHandler from "./middleware/notFoundHandler.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Security headers. CSP is disabled because this server can also serve the SPA
// build, whose module scripts/styles would need a bespoke policy; CORP is set
// to cross-origin so a separately-hosted frontend can still call the API.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {policy: "cross-origin"},
  })
);

// CORS: in production set CORS_ORIGIN to a comma-separated allowlist. In dev
// (no value) any origin is allowed. Auth uses Bearer tokens, not cookies, so
// credentials are not enabled.
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({origin: corsOrigins.length ? corsOrigins : true}));

app.use(express.json());
app.use(auditLogger);

app.get("/health", (req, res) => {
  res.status(200).json({message: "Server is running"});
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/shops", shopsRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/campaigns", campaignsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// Optionally serve the built client (single-origin production deploy). Set
// CLIENT_DIST or build into ../clients/dist. When absent (the dev container),
// we keep the plain API welcome instead.
const clientDist = process.env.CLIENT_DIST || path.join(__dirname, "../clients/dist");
const serveClient = fs.existsSync(path.join(clientDist, "index.html"));

if (serveClient) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.status(200).json({message: "Welcome to smartAid API"});
  });
}

// Unknown routes -> JSON 404, anything thrown by a handler -> centralized 500.
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
