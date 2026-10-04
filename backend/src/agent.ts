import { Router, Request, Response } from "express";
import Groq from "groq-sdk";
import mongoose from "mongoose";
import { z } from "zod";
import { Content } from "./db";
import { userMiddleware } from "./middleware";
import { handle } from "./http";
import { getItemText } from "./ingest";
import { runAgent, SourceInput } from "./rag";

export const agentRouter = Router();

const uid = (req: Request) => (req as any).userId as string;

interface ItemDoc {
  _id: unknown;
  contentId: string;
  title: string;
  type: string;
  link?: string | null;
  content?: string | null;
  extractedText?: string | null;
  extractedAt?: Date | null;
  extractError?: string | null;
}

const MAX_ITEMS = 25;
const READ_CONCURRENCY = 4;

const bodySchema = z
  .object({
    mode: z.enum(["ask", "summarize", "compare"]).default("ask"),
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(8000) }))
      .min(1)
      .max(20),
    contentIds: z.array(z.string()).max(200).default([]),
    folderIds: z.array(z.string()).max(50).default([]),
  })
  .refine((b) => b.messages[b.messages.length - 1].role === "user", { message: "The last message must be from the user" });

// Each run costs real money, so cap how often one user can start them (in memory, resets on restart)
const RUNS_PER_HOUR = 30;
const recentRuns = new Map<string, number[]>();

function underRateLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (recentRuns.get(userId) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= RUNS_PER_HOUR) {
    recentRuns.set(userId, recent);
    return false;
  }
  recent.push(now);
  recentRuns.set(userId, recent);
  return true;
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

agentRouter.post("/agent/run", userMiddleware, handle(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(411).json({ message: parsed.error.errors[0]?.message ?? "Invalid request" });
  }
  const { mode, messages, contentIds, folderIds } = parsed.data;

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ message: "The agent isn't set up on this server yet (GROQ_API_KEY is missing)." });
  }

  try {
    const userId = uid(req);

    // Items come from the user's own library only: the userId filter means ids belonging to anyone else match nothing
    const validFolderIds = folderIds.filter((id) => mongoose.isValidObjectId(id));
    const items = await Content.find({
      userId,
      $or: [{ contentId: { $in: contentIds } }, { folderId: { $in: validFolderIds } }],
    }).lean<ItemDoc[]>();

    if (items.length === 0) {
      return res.status(400).json({ message: "Select at least one item or folder that has items in it." });
    }
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({
        message: `That selection has ${items.length} items. Select up to ${MAX_ITEMS} at a time.`,
      });
    }
    if (mode === "compare" && items.length < 2) {
      return res.status(400).json({ message: "Select at least two items to compare." });
    }

    if (!underRateLimit(userId)) {
      return res.status(429).json({ message: "You've reached the hourly limit for agent runs. Try again later." });
    }

    const texts = await mapWithLimit(items, READ_CONCURRENCY, (item) => getItemText(item));
    const sources: SourceInput[] = items.map((item, i) => ({
      n: i + 1,
      title: item.title,
      type: item.type,
      link: item.link ?? undefined,
      text: texts[i].text,
    }));
    const sourceList = items.map((item, i) => ({
      n: i + 1,
      contentId: item.contentId,
      title: item.title,
      type: item.type,
      link: item.link ?? null,
      readable: Boolean(texts[i].text),
      note: texts[i].error ?? null,
    }));

    if (sources.every((s) => !s.text)) {
      return res.json({
        answer: "I couldn't read any of the selected items, so there's nothing to answer from. The details are listed below.",
        sources: sourceList,
      });
    }

    const result = await runAgent(mode, messages, sources);
    res.json({ answer: result.answer, sources: sourceList });
  } catch (e) {
    console.error("Agent error:", e);
    // Groq answers 413 or 429 when a request exceeds the plan's tokens-per-minute limit or the rate limit
    if (e instanceof Groq.RateLimitError || (e instanceof Groq.APIError && e.status === 413)) {
      return res.status(429).json({
        message: "Groq's rate limit was hit, or this selection is too large for your plan's per-minute token limit. Wait a minute, or select fewer items.",
      });
    }
    if (e instanceof Groq.AuthenticationError) {
      return res.status(503).json({ message: "The server's Groq API key was rejected. Check GROQ_API_KEY." });
    }
    if (e instanceof Groq.NotFoundError) {
      return res.status(503).json({ message: "The configured Groq model wasn't found. Check GROQ_MODEL." });
    }
    if (e instanceof Groq.APIError) {
      return res.status(502).json({ message: "The model request failed. Please try again." });
    }
    res.status(500).json({ message: "Something went wrong running the agent." });
  }
}));
