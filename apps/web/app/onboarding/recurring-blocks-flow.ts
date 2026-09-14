export interface RecurringBlockInput {
  day_of_week: number;
  end_local: string;
  start_local: string;
  title: string;
}

export type RecurringBlocksValidation =
  { blocks: RecurringBlockInput[]; ok: true } | { message: string; ok: false };

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function minutes(value: string) {
  const [hours = 0, minute = 0] = value.split(":").map(Number);
  return hours * 60 + minute;
}

export function parseRecurringBlocks(
  formData: FormData,
): RecurringBlocksValidation {
  const titles = formData.getAll("blockTitle");
  const starts = formData.getAll("blockStart");
  const ends = formData.getAll("blockEnd");
  const daySets = formData.getAll("blockDays");
  if (
    titles.length === 0 ||
    titles.length !== starts.length ||
    titles.length !== ends.length ||
    titles.length !== daySets.length
  )
    return {
      message: "Adicione um compromisso ou pule esta etapa.",
      ok: false,
    };

  const blocks: RecurringBlockInput[] = [];
  for (let index = 0; index < titles.length; index += 1) {
    const title = String(titles[index]).trim();
    const start = String(starts[index]);
    const end = String(ends[index]);
    const days = String(daySets[index]).split(",").filter(Boolean).map(Number);
    if (
      title.length < 1 ||
      title.length > 120 ||
      !timePattern.test(start) ||
      !timePattern.test(end) ||
      minutes(start) >= minutes(end) ||
      days.length === 0 ||
      new Set(days).size !== days.length ||
      days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    )
      return { message: "Revise o nome, os dias e os horários.", ok: false };

    for (const day of days)
      blocks.push({
        day_of_week: day,
        end_local: end,
        start_local: start,
        title,
      });
  }

  const sorted = blocks.sort(
    (left, right) =>
      left.day_of_week - right.day_of_week ||
      minutes(left.start_local) - minutes(right.start_local) ||
      left.title.localeCompare(right.title, "pt-BR"),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous &&
      current &&
      previous.day_of_week === current.day_of_week &&
      minutes(current.start_local) < minutes(previous.end_local)
    )
      return {
        message: `${previous.title} e ${current.title} se sobrepõem no mesmo dia.`,
        ok: false,
      };
  }
  return { blocks: sorted, ok: true };
}
