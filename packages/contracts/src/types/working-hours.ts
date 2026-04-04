export interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface WorkingHoursResponse {
  data: WorkingHour[];
}

export interface WorkingHoursSaveResponse {
  success: true;
  data: WorkingHour[];
}
