import { EvaluationContext } from "@openfeature/server-sdk";

declare module 'express-serve-static-core' {
  interface Request {
    user: EvaluationContext;
  }
}
