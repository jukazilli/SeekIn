import { Temporal } from "temporal-polyfill";

const activityTypes = [
  "assignment",
  "exam",
  "reading",
  "project",
  "exercise",
  "extension",
  "other",
] as const;

export type OnboardingActivityInput = {
  activity_type: (typeof activityTypes)[number];
  deadline_at: string;
  deadline_has_time: boolean;
  deadline_local_date: string;
  deadline_local_time: string | null;
  deadline_timezone: string;
  discipline_id: string | null;
  estimated_minutes: number;
  notes_markdown: string | null;
  priority: number;
  title: string;
};

export function parseOnboardingActivity(
  formData: FormData,
  timezone: string,
  allowedDisciplineIds: ReadonlySet<string>,
): OnboardingActivityInput | null {
  const title = read(formData, "activityTitle").trim();
  const type = read(formData, "activityType");
  const date = read(formData, "deadlineDate");
  const time = read(formData, "deadlineTime");
  const discipline = read(formData, "disciplineId");
  const notes = read(formData, "activityNotes").trim();
  const hours = Number(read(formData, "effortHours"));
  const minutes = Number(read(formData, "effortMinutes"));
  const priority = Number(read(formData, "activityPriority"));

  if (
    title.length < 1 ||
    title.length > 200 ||
    !activityTypes.includes(type as (typeof activityTypes)[number]) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
    (discipline !== "" && !allowedDisciplineIds.has(discipline)) ||
    notes.length > 20_000 ||
    !Number.isSafeInteger(hours) ||
    hours < 0 ||
    hours > 999 ||
    !Number.isSafeInteger(minutes) ||
    minutes < 0 ||
    minutes > 59 ||
    !Number.isSafeInteger(priority) ||
    priority < 0 ||
    priority > 4
  )
    return null;

  const estimatedMinutes = hours * 60 + minutes;
  if (estimatedMinutes < 1) return null;
  const resolvedTime = time || "23:59";
  try {
    const plain = Temporal.PlainDateTime.from(`${date}T${resolvedTime}`);
    const deadlineAt = plain.toZonedDateTime(timezone).toInstant().toString();
    return {
      activity_type: type as OnboardingActivityInput["activity_type"],
      deadline_at: deadlineAt,
      deadline_has_time: time !== "",
      deadline_local_date: date,
      deadline_local_time: time || null,
      deadline_timezone: timezone,
      discipline_id: discipline || null,
      estimated_minutes: estimatedMinutes,
      notes_markdown: notes || null,
      priority,
      title,
    };
  } catch {
    return null;
  }
}

function read(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
