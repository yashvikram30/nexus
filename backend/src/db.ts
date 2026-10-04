import mongoose, { Schema, Document } from "mongoose";

// Create an interface for the User
interface IUser extends Document {
  username: string;
  password?: string; // absent for accounts created through Google sign-in
  email?: string;
  googleId?: string;
}

interface IContent extends Document {
  link: string;
  type: string;
  title: string;
  tags: mongoose.Types.ObjectId[];
  userId: mongoose.Types.ObjectId;
}

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  // sparse so the many password-only users (no value) don't collide on the unique index
  email: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true }
});

// Export with consistent model name
export const User = mongoose.model('User', userSchema);

const contentSchema = new Schema({
  contentId: {type: String, required: true},
  link: { type: String },
  type: { type: String, required: true },
  title: { type: String, required: true },
  content: {type: String },
  tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag' }],
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true }, // The ref name should match the model name, else the program will throw an error
  // An item lives in at most one folder; null means it is unfiled
  folderId: { type: mongoose.Types.ObjectId, ref: 'Folder', default: null },
  // Readable text pulled from the link for the RAG agent, cached so each run doesn't refetch the page
  extractedText: { type: String },
  extractedAt: { type: Date },
  extractError: { type: String },
}, { timestamps: true });

export const Content = mongoose.model('Content', contentSchema);

const folderSchema = new Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

// Folder names are unique per user, ignoring case ("Research" and "research" collide)
folderSchema.index({ userId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Folder = mongoose.model('Folder', folderSchema);

const linkSchema = new mongoose.Schema({
  hash: String,
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true, unique:true },
})

export const Link = mongoose.model('Link',linkSchema);