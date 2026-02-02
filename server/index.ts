import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

registerRoutes(app);

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
