import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = (process.env.JWT_SECRET);

export const userMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers["authorization"];

    if (!token) {
        res.status(401).json({ message: "No token provided" });
        return;
    }

    try {
        const decoded: any = jwt.verify(token as string, String(JWT_SECRET));
        // Attach decoded user information to the request object
        // @ts-ignore
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error("Token verification error:", error); // Log the error
        res.status(401).json({ message: "Token verification error" });
    }
    
};
