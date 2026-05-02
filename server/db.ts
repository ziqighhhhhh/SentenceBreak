import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "file:./data/sentencebreak.db";
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma = new PrismaClient({ adapter });
