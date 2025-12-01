import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { RegisterService } from './register.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  @Public()
  async create(@Body() dto: CreateRegistrationDto) {
    return this.registerService.createRegistration(dto);
  }

  @Get()
  async getAll() {
    return this.registerService.getAllRegistrations();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.registerService.getRegistrationById(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.registerService.deleteRegistration(id);
    return { message: 'Registration deleted successfully' };
  }
}
