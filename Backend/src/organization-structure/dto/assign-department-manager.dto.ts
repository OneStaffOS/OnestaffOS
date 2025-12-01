import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDepartmentManagerDto {
  @IsNotEmpty()
  @IsString()
  headPositionId: string;
}
