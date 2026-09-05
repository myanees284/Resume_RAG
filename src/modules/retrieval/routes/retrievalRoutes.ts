import { Router } from "express";
import { retrievalController } from "../controllers/retrievalController";

const retrievalRoutes = Router();

retrievalRoutes.get("/search/readiness", (req, res, next) => {
  void retrievalController.readiness(req, res, next);
});

retrievalRoutes.post("/embeddings", (req, res, next) => {
  void retrievalController.embedQuery(req, res, next);
});

retrievalRoutes.get("/search/sample", (req, res, next) => {
  void retrievalController.sampleResume(req, res, next);
});

retrievalRoutes.get("/search/resumes/:resumeId", (req, res, next) => {
  void retrievalController.getResume(req, res, next);
});

retrievalRoutes.post("/search/bm25", (req, res, next) => {
  void retrievalController.bm25Search(req, res, next);
});

retrievalRoutes.post("/search/vector", (req, res, next) => {
  void retrievalController.vectorSearch(req, res, next);
});

retrievalRoutes.post("/search/hybrid", (req, res, next) => {
  void retrievalController.hybridSearch(req, res, next);
});

retrievalRoutes.post("/search/rerank", (req, res, next) => {
  void retrievalController.rerank(req, res, next);
});

retrievalRoutes.post("/search/summarize", (req, res, next) => {
  void retrievalController.summarize(req, res, next);
});

retrievalRoutes.post("/search", (req, res, next) => {
  void retrievalController.search(req, res, next);
});

export { retrievalRoutes };
