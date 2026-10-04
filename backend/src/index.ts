import express from "express";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import mongoose from "mongoose";
import {z} from "zod";
import bcrypt from "bcrypt";
import cors from "cors";
import { Content, Link, User } from './db';
import { userMiddleware } from "./middleware";
import { random } from "./utils";
import { foldersRouter, ownedFolder } from "./folders";
import { agentRouter } from "./agent";
import { OAuth2Client } from "google-auth-library";
import dns from "dns";
dotenv.config();

// Optional: some routers/ISPs refuse the SRV lookup a mongodb+srv:// URL needs (querySrv EREFUSED).
// Set DNS_SERVERS=1.1.1.1,8.8.8.8 to resolve with public DNS instead. Unset, Node uses the system DNS.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}

const app = express();
app.use(express.json());
// CLIENT_URL (comma separated for several) limits which sites may call the API; unset allows any, fine for local development
app.use(cors(process.env.CLIENT_URL ? { origin: process.env.CLIENT_URL.split(",").map((o) => o.trim().replace(/\/+$/, "")) } : undefined));
app.use('/api/v1', foldersRouter);
app.use('/api/v1', agentRouter);

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const url: string = String(process.env.MONGO_URL);
const JWT_SECRET = (process.env.JWT_SECRET);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Signs a JWT for the user and sets it as a cookie, shared by password and Google sign-in
function issueSession(res: any, userId: unknown) {
  const token = jwt.sign(
    { id: userId },
    String(JWT_SECRET),
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return token;
}

interface SigninRequest {
    username: string;
    password: string;
}

//zod validation
const signupSchema = z.object({
    username: z.string(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
});

  
// Express route setup
app.post('/api/v1/signup', async function(req:any,res:any) {

    try {
      // Step 1: Zod validation
      const validationResult = await signupSchema.safeParseAsync(req.body);
      
      if (!validationResult.success) {
        return res.status(411).json({
          message: 'Validation failed. Error in inputs!',
          errors: validationResult.error.errors
        });
      }
  
      const { username, password } = validationResult.data;
  
      // Step 2: Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(403).json({
          message: 'User with this username already exists'
        });
      }
  
      // Step 3: Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Step 4: Create user
      const newUser = await User.create({
        username,
        password: hashedPassword
      });
  
      // Step 5: Return success response (without sending back sensitive data)
      return res.status(201).json({
        message: 'User created successfully',
        userId: newUser.id
      });
  
    } catch (e:unknown) {
      // Log the error for debugging (consider using a proper logging service)
      console.error('Signup error:', e);
  
      // Return a generic error message to the client
      return res.status(500).json({
        message: 'Internal server error occurred'
      });
    }
});

app.post('/api/v1/signin', async (req: any, res: any) => {
  try {
      // Step 1: Check if the user exists
      const { username, password } = req.body;
      const userAccount = await User.findOne({ username });

      if (!userAccount) {
          return res.status(403).json({
              message: 'User does not exist',
          });
      }

      // Accounts created through Google have no password to check against
      if (!userAccount.password) {
          return res.status(403).json({
              message: 'This account uses Google sign-in. Use "Continue with Google" instead.',
          });
      }

      // Step 2: Check if the password matches with Bcrypt
      const confirmedUser = await bcrypt.compare(String(password), userAccount.password);
      if (!confirmedUser) {
          return res.status(403).json({
              message: 'Password is incorrect',
          });
      }

      // Step 3: Return a JWT token to the user (also set as a cookie)
      const token = issueSession(res, userAccount._id);

      // Step 4: Send a success response
      return res.status(200).json({
          message: 'Sign-in successful',
          token,
      });
  } catch (e: unknown) {
      console.error(e); // Logs the actual error
      res.status(500).json({
          message: 'Error during sign-in. Please try again later.',
      });
  }
});

// Google sign-in: the client sends the ID token ("credential") from Google Identity Services.
// We verify it was issued for our client id, then find or create the matching user.
app.post('/api/v1/auth/google', async (req: any, res: any) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google sign-in is not configured on the server' });
    }

    const { credential } = req.body;
    if (typeof credential !== 'string' || !credential) {
      return res.status(411).json({ message: 'Missing Google credential' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
      return res.status(403).json({ message: 'Your Google email could not be verified' });
    }

    const email = payload.email.toLowerCase();

    // Match on Google's stable id, then on the email of a previously Google-created account.
    // We deliberately don't match a password account by username, so nobody can pre-register
    // someone else's email as a username and inherit their Google login.
    let user = await User.findOne({ googleId: payload.sub }) ?? await User.findOne({ email });

    if (!user) {
      // Content is shown under `username`, which must be unique, so derive one from the email
      const base = email.split('@')[0].replace(/[^a-z0-9._-]/g, '') || 'user';
      let username = base;
      while (await User.exists({ username })) {
        username = `${base}-${random(4)}`;
      }

      user = await User.create({ username, email, googleId: payload.sub });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    const token = issueSession(res, user._id);

    return res.status(200).json({
      message: 'Sign-in successful',
      token,
    });
  } catch (e: unknown) {
    // verifyIdToken throws on a bad signature, wrong audience or expired token
    console.error('Google sign-in error:', e);
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});


app.post('/api/v1/content',userMiddleware, async (req,res)=> {
    const {contentId,link,type,title,content,folderId} = req.body;

    // an optional folder must belong to this user, otherwise the item is saved unfiled
    //@ts-ignore
    const folder = folderId ? await ownedFolder(req.userId, folderId) : null;

    await Content.create({
      contentId,
      link,
      type,
      title,
      content,
      //@ts-ignore
      userId: req.userId,
      folderId: folder ? folder._id : null,
      tags: []
    })

    res.json({
      message: "Content added"
    })
})


app.get('/api/v1/content',userMiddleware,async(req,res)=>{
    // @ts-ignore
    const userId = req.userId;
    // extractedText is the cached page text for the agent: large, and not needed to show the library
    const content = await Content.find({
      userId: userId
    }).select("-extractedText -extractError -extractedAt").populate("userId","username")
    // basically this will return the username, which will allow us to update it on frontend as well
    res.json({
      content
    })
})


app.delete('/api/v1/content/:contentId',userMiddleware,async (req,res)=>{
  try{
    const contentId = req.params.contentId;
    await Content.deleteOne({
      contentId,
      // @ts-ignore
      userId: req.userId
    })
    res.json({
      message: "Deleted"
    })
  }catch (error) {
    res.status(500).json({
      message: "Error deleting content",
      // @ts-ignore
      error: error.message
    });
  }
})


app.post('/api/v1/brain/share',userMiddleware,async(req,res)=>{
  // this obtains whether link is to be shared or not from the user
    const {share} = req.body;
    
  // if the user inputs true, i.e. the brain is to be shared
    if(share){

      // check if the hash link already exists, and if it does, return it to the user
      const existingLink = await Link.findOne({
        //@ts-ignore
        userId: req.userId
      })
      if(existingLink){
        res.json({
          hash: existingLink.hash
        })
        return;
      }

      // if the link does not exist already, then create a hash link for the user
      const createdLink = await Link.create({
        //@ts-ignore
        userId: req.userId,
        hash: random(10)
      })

      res.json({
        message: "Sharable link created",
        hash: createdLink.hash
      })
    } 
    // if the user inputs false, i.e. brain is not to be shared, then delete the brain
    else {  
      await Link.deleteOne({
        //@ts-ignore
        userId: req.userId
      })

      res.json({
        message: "Removed the sharable link!"
      })
    }
})

app.post('/api/v1/brain/:shareLink',async (req, res)=>{
    // obtaining the hash from the params  
    const hash = req.params.shareLink;

    // search in the database for the input
    const link = await Link.findOne({
      hash
    })

    // if the hash link is not found in the database
    if(!link){
      res.status(411).json({
        message: "Sorry, your link seems to be wrong"
      })
      return;
    }

    // now find the user and the content it has corresponding to the link they posted
    const content = await Content.findOne({
      userId: link.userId
    }).select("-extractedText -extractError -extractedAt")

    const user = await User.findOne({
      _id: link.userId
    })

    // if the user is not found, just in case, then return this, else return the contents of the link
    if (!user) {
      res.status(411).json({
          message: "user not found, error should ideally not happen"
      })
      return;
    }

    res.json({
      username: user.username,
      content: content
    })

})


main()

async function main(){
    // Without these the server would run but sign every login token with the string "undefined"
    const missing = ["MONGO_URL", "JWT_SECRET"].filter((key) => !process.env[key]);
    if (missing.length) {
        console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
        process.exit(1);
    }

    try{
        await mongoose.connect(url);
        console.log("MongoDB connected!");
    }
    catch(error){
        // Without a database every route would hang then fail, so don't pretend the server is up
        console.error("Could not connect to MongoDB, shutting down:", error);
        process.exit(1);
    }
    app.listen(port,()=>{
        console.log("Your server is live!")
    })
    
}


