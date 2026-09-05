import { Router } from "express";
import { resumeUpload } from "../../../config/multerConfig";
import { ingestionController } from "../controllers/ingestionController";

const ingestionRoutes = Router();

ingestionRoutes.get("/resume/health", (req, res) =>
  ingestionController.health(req, res)
);

ingestionRoutes.post(
  "/resume/upload",
  resumeUpload.single("file"),
  (req, res, next) => {
    void ingestionController.upload(req, res, next);
  }
);

ingestionRoutes.post(
  "/resume/extract",
  resumeUpload.single("file"),
  (req, res, next) => {
    void ingestionController.extract(req, res, next);
  }
);

ingestionRoutes.post("/resume/clean", (req, res, next) => {
  ingestionController.clean(req, res, next);
});

ingestionRoutes.post("/resume/skills", (req, res, next) => {
  ingestionController.skills(req, res, next);
});

ingestionRoutes.post("/resume/parse", (req, res, next) => {
  ingestionController.parse(req, res, next);
});

ingestionRoutes.post("/resume/llm-parse", (req, res, next) => {
  void ingestionController.llmParse(req, res, next);
});

ingestionRoutes.post("/resume/embed", (req, res, next) => {
  void ingestionController.embed(req, res, next);
});

ingestionRoutes.post("/resume/store", (req, res, next) => {
  void ingestionController.store(req, res, next);
});

ingestionRoutes.post(
  "/resume/ingest",
  resumeUpload.single("file"),
  (req, res, next) => {
    void ingestionController.ingestResume(req, res, next);
  }
);

export { ingestionRoutes };
