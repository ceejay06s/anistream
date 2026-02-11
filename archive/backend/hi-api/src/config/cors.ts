import { config } from "dotenv";
import { cors } from "hono/cors";

config();

const allowedOrigins = process.env.ANIWATCH_API_CORS_ALLOWED_ORIGINS
  ? process.env.ANIWATCH_API_CORS_ALLOWED_ORIGINS.split(",")
  : ["http://localhost:4000", "http://localhost:8081", "http://localhost:19006", "*"];

const corsConfig = cors({
  allowMethods: ["GET", "OPTIONS"],
  maxAge: 600,
  credentials: false, // Set to false to allow * origin
  origin: "*", // Allow all origins for local development
});

export default corsConfig;
