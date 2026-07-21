import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import express from "express"
import * as path from "path"
import { AppModule } from "./app.module"

const WEB_DIR = process.env.WEB_DIR ?? path.resolve(__dirname, "../../web/dist")

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.enableCors()
  app.setGlobalPrefix("api")

  const http = app.getHttpAdapter().getInstance()
  http.use(express.static(WEB_DIR))
  http.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next()
    res.sendFile(path.join(WEB_DIR, "index.html"))
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`server listening on http://localhost:${port} (api: /api, web: ${WEB_DIR})`)
}
bootstrap()
