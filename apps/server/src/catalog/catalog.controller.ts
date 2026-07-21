import { Controller, Get, Inject, NotFoundException, Param, Post } from "@nestjs/common"
import { CatalogService } from "./catalog.service"

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  getCatalog() {
    return this.catalog.getCatalog()
  }

  @Get("labs")
  getLabs() {
    return this.catalog.getCatalog().labs.map(({ models, ...lab }) => lab)
  }

  @Get("models/:lab/:slug")
  getModel(@Param("lab") lab: string, @Param("slug") slug: string) {
    const model = this.catalog.findModel(lab, slug)
    if (!model) throw new NotFoundException(`model ${lab}/${slug} not found`)
    return model
  }

  @Post("refresh")
  refresh() {
    return this.catalog.refresh()
  }
}
