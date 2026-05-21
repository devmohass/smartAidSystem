import "dotenv/config";
import express from "express";
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

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(auditLogger);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to smartAid API",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is running",
  });
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
