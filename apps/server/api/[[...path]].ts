import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { IncomingMessage, ServerResponse } from "http"
import { AppModule } from "../src/app.module"

let cached: ((req: IncomingMessage, res: ServerResponse) => void) | undefined

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!cached) {
    const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] })
    app.enableCors()
    app.setGlobalPrefix("api")
    await app.init()
    cached = app.getHttpAdapter().getInstance()
  }
  cached(req, res)
}
