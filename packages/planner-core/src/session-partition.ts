export type SessionPartitionInput = {
  remainingMinutes: number;
  preferredSessionMinutes: number;
  minimumSessionMinutes: number;
};

const MAX_PROPOSED_SESSIONS = 2_000;

function assertInteger(
  value: number,
  name: keyof SessionPartitionInput,
  allowZero = false,
): void {
  if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(
      `${name} deve ser um número inteiro ${allowZero ? "não negativo" : "positivo"}`,
    );
  }
}

/** Splits effort into deterministic positive blocks without adding artificial minutes. */
export function partitionEffort({
  remainingMinutes,
  preferredSessionMinutes,
  minimumSessionMinutes,
}: SessionPartitionInput): number[] {
  assertInteger(remainingMinutes, "remainingMinutes", true);
  assertInteger(preferredSessionMinutes, "preferredSessionMinutes");
  assertInteger(minimumSessionMinutes, "minimumSessionMinutes");
  if (preferredSessionMinutes < 15 || preferredSessionMinutes > 240) {
    throw new RangeError("preferredSessionMinutes deve estar entre 15 e 240");
  }
  if (minimumSessionMinutes < 10 || minimumSessionMinutes > 120) {
    throw new RangeError("minimumSessionMinutes deve estar entre 10 e 120");
  }
  if (minimumSessionMinutes > preferredSessionMinutes) {
    throw new RangeError(
      "minimumSessionMinutes não pode superar preferredSessionMinutes",
    );
  }
  if (remainingMinutes === 0) return [];
  if (remainingMinutes <= preferredSessionMinutes) return [remainingMinutes];

  const preferredCount = Math.ceil(remainingMinutes / preferredSessionMinutes);
  const count = Math.max(
    1,
    Math.min(
      preferredCount,
      Math.floor(remainingMinutes / minimumSessionMinutes),
    ),
  );
  if (count > MAX_PROPOSED_SESSIONS) {
    throw new RangeError("A partição excede o limite de 2000 sessões");
  }
  if (count === 1) return [remainingMinutes];

  const sessions = Array<number>(count).fill(preferredSessionMinutes);
  sessions[count - 1] =
    remainingMinutes - preferredSessionMinutes * (count - 1);
  let missing = Math.max(0, minimumSessionMinutes - sessions[count - 1]!);

  for (let index = count - 2; index >= 0 && missing > 0; index -= 1) {
    const transferable = Math.min(
      missing,
      sessions[index]! - minimumSessionMinutes,
    );
    sessions[index]! -= transferable;
    sessions[count - 1]! += transferable;
    missing -= transferable;
  }

  if (missing !== 0) {
    throw new Error("Não foi possível produzir uma partição válida");
  }
  return sessions;
}
