import { IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateBetDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  categoryId!: string;

  @IsInt()
  @Min(1)
  predictedSeconds!: number;
}
