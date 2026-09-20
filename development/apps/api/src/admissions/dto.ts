import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
export class KeyDto {
  @IsUUID() idempotencyKey!: string;
}
export class VersionDto extends KeyDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class ConfirmDto extends VersionDto {
  @IsBoolean() confirmed!: boolean;
}
export class StartDto extends KeyDto {
  @IsUUID() offeringId!: string;
  @IsBoolean() confirmed!: boolean;
}
export class SaveDto extends VersionDto {
  @IsOptional() @IsBoolean() confirmImpact?: boolean;
  @IsObject() data!: Record<string, unknown>;
  @IsBoolean() complete!: boolean;
}
export class ChangeDto extends ConfirmDto {
  @IsUUID() offeringId!: string;
}
export class DocumentDto extends VersionDto {
  @IsString() @MaxLength(100) category!: string;
  @IsOptional() @IsUUID() replacesId?: string;
  @IsOptional() @IsString() @MaxLength(500) replacementReason?: string;
}
class DeclarationDto {
  @IsString() @MaxLength(50) id!: string;
  @IsString() @MaxLength(80) version!: string;
  @IsBoolean() accepted!: boolean;
}
export class SubmitDto extends ConfirmDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DeclarationDto)
  declarations!: DeclarationDto[];
}
