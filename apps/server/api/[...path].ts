import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { IncomingMessage, ServerResponse } from "http"
import { AppModule } from "../src/app.module"

type Handler = (req: IncomingMessage, res: ServerResponse) => void

let cached: Handler | undefined

async function createApp(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] })
  app.enableCors()
  app.setGlobalPrefix("api")
  await app.init()
  const instance = app.getHttpAdapter().getInstance() as Handler
  cached = instance
  return instance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const instance = cached ?? (await createApp())
  instance(req, res)
}
