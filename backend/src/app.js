import express from "express";
import compression from "compression";
import morgan from "morgan";
import { apiLimiter, corsMiddleware, helmetMiddleware } from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { toolsRouter } from "./routes/tools.routes.js";
import { robots, sitemap } from "./controllers/tools.controller.js";
import { cloudinaryStatus } from "./services/cloudinary.js";

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", storage: cloudinaryStatus(), timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "ToolsSuite Backend is running"
  });
});
app.get("/sitemap.xml", sitemap);
app.get("/robots.txt", robots);
app.use("/api/tools", toolsRouter);

app.use(notFound);
app.use(errorHandler);
