import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Content, Folder } from "./db";
import { userMiddleware } from "./middleware";
import { handle } from "./http";

export const foldersRouter = Router();

// userMiddleware stores the id from the JWT on the request
const uid = (req: Request) => (req as any).userId as string;

const nameSchema = z.object({ name: z.string().trim().min(1, "Folder name is required").max(60, "Folder name is too long") });

const moveSchema = z.object({
  contentIds: z.array(z.string()).min(1).max(200),
  folderId: z.string().nullable(),
});

function bad(res: Response, message: string, status = 411) {
  return res.status(status).json({ message });
}

function isDuplicateKey(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

// Returns the folder only if it belongs to this user
export async function ownedFolder(userId: string, folderId: unknown) {
  if (typeof folderId !== "string" || !mongoose.isValidObjectId(folderId)) return null;
  return Folder.findOne({ _id: folderId, userId });
}

foldersRouter.get("/folders", userMiddleware, handle(async (req, res) => {
  try {
    const userId = uid(req);
    const [folders, counts] = await Promise.all([
      Folder.find({ userId }).sort({ name: 1 }).collation({ locale: "en", strength: 2 }),
      // aggregate does not cast ids for us
      Content.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), folderId: { $ne: null } } },
        { $group: { _id: "$folderId", count: { $sum: 1 } } },
      ]),
    ]);
    const countById = new Map(counts.map((c) => [String(c._id), c.count as number]));
    res.json({
      folders: folders.map((f) => ({ id: f.id, name: f.name, count: countById.get(f.id) ?? 0 })),
    });
  } catch (e) {
    console.error("List folders error:", e);
    bad(res, "Could not load folders", 500);
  }
}));

foldersRouter.post("/folders", userMiddleware, handle(async (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) return bad(res, parsed.error.errors[0].message);
  try {
    const folder = await Folder.create({ userId: uid(req), name: parsed.data.name });
    res.status(201).json({ folder: { id: folder.id, name: folder.name, count: 0 } });
  } catch (e) {
    if (isDuplicateKey(e)) return bad(res, "You already have a folder with that name", 409);
    console.error("Create folder error:", e);
    bad(res, "Could not create the folder", 500);
  }
}));

foldersRouter.patch("/folders/:id", userMiddleware, handle(async (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) return bad(res, parsed.error.errors[0].message);
  try {
    const folder = await ownedFolder(uid(req), req.params.id);
    if (!folder) return bad(res, "Folder not found", 404);
    folder.name = parsed.data.name;
    await folder.save();
    res.json({ folder: { id: folder.id, name: folder.name } });
  } catch (e) {
    if (isDuplicateKey(e)) return bad(res, "You already have a folder with that name", 409);
    console.error("Rename folder error:", e);
    bad(res, "Could not rename the folder", 500);
  }
}));

// Deleting a folder never deletes the items inside it, they just become unfiled
foldersRouter.delete("/folders/:id", userMiddleware, handle(async (req, res) => {
  try {
    const userId = uid(req);
    const folder = await ownedFolder(userId, req.params.id);
    if (!folder) return bad(res, "Folder not found", 404);
    await Content.updateMany({ userId, folderId: folder._id }, { $set: { folderId: null } });
    await folder.deleteOne();
    res.json({ message: "Folder deleted" });
  } catch (e) {
    console.error("Delete folder error:", e);
    bad(res, "Could not delete the folder", 500);
  }
}));

// Moves items into a folder, or out of any folder when folderId is null
foldersRouter.post("/content/move", userMiddleware, handle(async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return bad(res, "Invalid request");
  try {
    const userId = uid(req);
    let target: mongoose.Types.ObjectId | null = null;
    if (parsed.data.folderId !== null) {
      const folder = await ownedFolder(userId, parsed.data.folderId);
      if (!folder) return bad(res, "Folder not found", 404);
      target = folder._id;
    }
    const result = await Content.updateMany(
      { userId, contentId: { $in: parsed.data.contentIds } },
      { $set: { folderId: target } }
    );
    res.json({ moved: result.modifiedCount });
  } catch (e) {
    console.error("Move items error:", e);
    bad(res, "Could not move the items", 500);
  }
}));
