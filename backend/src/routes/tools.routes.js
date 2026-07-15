import { Router } from "express";
import { getTool, listTools, runToolController } from "../controllers/tools.controller.js";
import { upload } from "../middleware/upload.js";
import { toolLimiter } from "../middleware/security.js";

export const toolsRouter = Router();

toolsRouter.get("/", listTools);
toolsRouter.get("/:slug", getTool);
toolsRouter.post("/:slug", toolLimiter, upload.array("files"), runToolController);
