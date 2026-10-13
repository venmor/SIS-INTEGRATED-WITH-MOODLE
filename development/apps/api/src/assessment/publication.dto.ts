import { Type } from 'class-transformer';
import {
  Equals,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';
import { PUBLICATION_DECLARATION } from './publication-ports.js';
export class ReleaseResultsDto extends KeyDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
  @Equals(PUBLICATION_DECLARATION) declaration!: string;
  @IsOptional() @IsString() @MaxLength(256) proof?: string;
}
export class RequestAmendmentDto extends KeyDto {
  @IsUUID() releaseId!: string;
  @IsUUID() packageId!: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason!: string;
  @IsString() @IsNotEmpty() @MaxLength(256) evidenceRef!: string;
}

export class PublicationQueryDto {
  @IsOptional() @IsUUID() releaseCursor?: string;
  @IsOptional() @IsUUID() amendmentCursor?: string;
}
