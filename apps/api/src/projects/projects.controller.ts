import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantContextParam } from '../common/auth/tenant-context.decorator';
import { TenantContextGuard } from '../common/auth/tenant-context.guard';
import type { TenantContext } from '@pmcs/database';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQuery } from './dto/list-projects.query';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(TenantContextGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@TenantContextParam() tenant: TenantContext, @Query() query: ListProjectsQuery) {
    return this.projectsService.list(tenant, query);
  }

  @Get(':projectId')
  get(
    @TenantContextParam() tenant: TenantContext,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return this.projectsService.get(tenant, projectId);
  }

  @Post()
  create(@TenantContextParam() tenant: TenantContext, @Body() input: CreateProjectDto) {
    return this.projectsService.create(tenant, input);
  }
}
