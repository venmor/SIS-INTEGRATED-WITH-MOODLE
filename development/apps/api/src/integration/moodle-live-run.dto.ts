import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';
import type {
  MoodleManifestEntity,
  MoodleLiveRunAction,
} from '@sis/contracts/moodle-live-run';

export class PrepareMoodleRunDto extends KeyDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsBoolean() nonProductionConfirmed!: boolean;
  @IsBoolean() syntheticOnlyConfirmed!: boolean;
}
export class MoodleRunCommandDto extends KeyDto {
  @IsInt() @Min(1) version!: number;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsOptional() @IsString() @MaxLength(256) receiptToken?: string;
  @IsOptional() @IsBoolean() credentialRetiredConfirmed?: boolean;
  @IsOptional() @IsBoolean() evidenceFrozenConfirmed?: boolean;
  @IsOptional() @IsBoolean() humanReviewConfirmed?: boolean;
}
export class AddMoodleManifestEntryDto extends MoodleRunCommandDto {
  @IsIn([
    'Account',
    'Student',
    'ProgrammeOffering',
    'ProgrammeAttempt',
    'CourseRegistration',
    'TutorialGroup',
    'TeachingAssignment',
  ])
  entity!: MoodleManifestEntity;
  @IsUUID() entityId!: string;
}

export class MoodleRunReceiptDto {
  @IsIn(['technical-approval', 'start', 'resume', 'close-technical', 'close'])
  action!: MoodleLiveRunAction;
  @IsInt() @Min(1) version!: number;
  @IsString() @Matches(/^[a-f0-9]{64}$/) evidenceChecksum!: string;
  @IsString() @IsNotEmpty() @MaxLength(256) password!: string;
}
