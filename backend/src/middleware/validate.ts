import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { sendError } from "../utils/response.js";

type ValidationTarget = "body" | "query" | "params";

export function validate(
  schema: ZodSchema,
  target: ValidationTarget = "body"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      sendError(res, "Validation failed", 422, errors);
      return;
    }

    // Express 5 exposes req.query through a getter. Define an own property so
    // validated/coerced query values can safely shadow that getter.
    if (target === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } else {
      (req as any)[target] = result.data;
    }
    next();
  };
}
