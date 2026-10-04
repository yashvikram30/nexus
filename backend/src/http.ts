import { Request, Response, NextFunction, RequestHandler } from "express";

// Lets a route handler `return res.status(...).json(...)` early and have rejected promises reach Express' error handler
export function handle(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
