import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { KeyDto } from '../admissions/dto.js';

// Phase 6 slice 1 mapping DTOs (TASK-PH6-001). Mappings bind both SIS
// and Moodle identifiers; activation is four-eyes with synthetic
// validation first.
export class DraftMappingDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  kind!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sisType!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sisId!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  moodleId!: string;
}

export class ProvisionShellDto extends KeyDto {
  @IsUUID()
  offeringId!: string;
  @IsOptional()
  @IsString()
  @MaxLength(16)
  period?: string;
}

// Phase 6 slice 3 simulator control (TASK-PH6-003). Demo-only mode
// switch for the deterministic simulator; never a real provider.
export class SimulatorModeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  mode!: string;
}

// Phase 6 slice 4 maintenance DTO (TASK-PH6-004). Windows schedule
// through approved change; they are never edited, only cancelled.
export class ScheduleMaintenanceDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
  @IsString()
  @IsNotEmpty()
  startsAt!: string;
  @IsString()
  @IsNotEmpty()
  endsAt!: string;
}

// Phase 6 slice 5 replay/incident DTOs (TASK-PH6-005). Replays approve
// with frozen evidence and a declaration under four-eyes separation;
// incidents close only with recovery evidence.
export class RequestReplayDto extends KeyDto {
  @IsOptional()
  @IsUUID()
  attemptId?: string;
  @IsOptional()
  @IsString()
  rangeFrom?: string;
  @IsOptional()
  @IsString()
  rangeTo?: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
  @IsBoolean()
  declaration!: boolean;
}

export class DecideReplayDto extends KeyDto {
  @IsBoolean()
  approve!: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class PauseDeliveryDto extends KeyDto {
  @IsBoolean()
  paused!: boolean;
}

export class OpenIncidentDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  severity!: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  detail?: string;
}

export class CloseIncidentDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  evidence!: string;
}

// Phase 6 slice 6 reconciliation DTO (TASK-PH6-006). Resolutions are
// requeue, governed suspension, escalate or evidence-backed resolve.
// Anything else (e.g. activating SIS records) is refused.
export class ResolveReconCaseDto extends KeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  action!: string;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}
