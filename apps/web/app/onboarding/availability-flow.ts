export interface AvailabilityWindowInput {
  day_of_week: number;
  end_local: string;
  start_local: string;
}

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function minutes(value: string) {
  const [hours = 0, minute = 0] = value.split(":").map(Number);
  return hours * 60 + minute;
}

export function parseAvailabilityWindows(
  formData: FormData,
): AvailabilityWindowInput[] | null {
  const days = formData.getAll("availabilityDay");
  const starts = formData.getAll("availabilityStart");
  const ends = formData.getAll("availabilityEnd");
  if (
    days.length === 0 ||
    days.length !== starts.length ||
    days.length !== ends.length
  )
    return null;

  const windows: AvailabilityWindowInput[] = [];
  for (let index = 0; index < days.length; index += 1) {
    const day = Number(days[index]);
    const start = String(starts[index]);
    const end = String(ends[index]);
    if (
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6 ||
      !timePattern.test(start) ||
      !timePattern.test(end) ||
      minutes(start) >= minutes(end)
    )
      return null;
    windows.push({ day_of_week: day, end_local: end, start_local: start });
  }

  return consolidateAvailabilityWindows(windows);
}

export function consolidateAvailabilityWindows(
  windows: AvailabilityWindowInput[],
) {
  const consolidated: AvailabilityWindowInput[] = [];
  for (let day = 0; day <= 6; day += 1) {
    const sorted = windows
      .filter((window) => window.day_of_week === day)
      .sort(
        (left, right) => minutes(left.start_local) - minutes(right.start_local),
      );
    for (const window of sorted) {
      const previous = consolidated.at(-1);
      if (
        previous?.day_of_week === day &&
        minutes(window.start_local) <= minutes(previous.end_local)
      ) {
        if (minutes(window.end_local) > minutes(previous.end_local))
          previous.end_local = window.end_local;
      } else {
        consolidated.push({ ...window });
      }
    }
  }
  return consolidated;
}
