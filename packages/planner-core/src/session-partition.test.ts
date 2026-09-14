import { describe, expect, it } from "vitest";

import { partitionEffort } from "./index";

describe("UT planner-core — partição de sessões", () => {
  it("reproduz a tabela canônica de 170 minutos", () => {
    expect(
      partitionEffort({
        remainingMinutes: 170,
        preferredSessionMinutes: 50,
        minimumSessionMinutes: 25,
      }),
    ).toEqual([50, 50, 45, 25]);
  });

  it("preserva divisões exatas sem criar sessão adicional", () => {
    expect(
      partitionEffort({
        remainingMinutes: 100,
        preferredSessionMinutes: 50,
        minimumSessionMinutes: 25,
      }),
    ).toEqual([50, 50]);
  });

  it("CE-004 — aceita o esforço total abaixo da sessão mínima", () => {
    expect(
      partitionEffort({
        remainingMinutes: 20,
        preferredSessionMinutes: 50,
        minimumSessionMinutes: 25,
      }),
    ).toEqual([20]);
  });

  it("redistribui uma sobra que exige mais de um bloco doador", () => {
    expect(
      partitionEffort({
        remainingMinutes: 151,
        preferredSessionMinutes: 60,
        minimumSessionMinutes: 50,
      }),
    ).toEqual([51, 50, 50]);
  });

  it("mantém uma sessão acima da preferência quando dividi-la criaria bloco inválido", () => {
    expect(
      partitionEffort({
        remainingMinutes: 26,
        preferredSessionMinutes: 25,
        minimumSessionMinutes: 25,
      }),
    ).toEqual([26]);
  });

  it("zero esforço não produz sessão e entradas inválidas são rejeitadas", () => {
    expect(
      partitionEffort({
        remainingMinutes: 0,
        preferredSessionMinutes: 50,
        minimumSessionMinutes: 25,
      }),
    ).toEqual([]);
    expect(() =>
      partitionEffort({
        remainingMinutes: -1,
        preferredSessionMinutes: 50,
        minimumSessionMinutes: 25,
      }),
    ).toThrow(RangeError);
    expect(() =>
      partitionEffort({
        remainingMinutes: 30_001,
        preferredSessionMinutes: 15,
        minimumSessionMinutes: 10,
      }),
    ).toThrow("limite de 2000 sessões");
    expect(() =>
      partitionEffort({
        remainingMinutes: 50,
        preferredSessionMinutes: 24,
        minimumSessionMinutes: 25,
      }),
    ).toThrow(RangeError);
  });

  it("INV-006/008 — conserva esforço e nunca cria duração zero", () => {
    for (let minimum = 10; minimum <= 120; minimum += 5) {
      for (
        let preferred = Math.max(15, minimum);
        preferred <= 240;
        preferred += 10
      ) {
        for (let remaining = 0; remaining <= 500; remaining += 7) {
          const sessions = partitionEffort({
            remainingMinutes: remaining,
            preferredSessionMinutes: preferred,
            minimumSessionMinutes: minimum,
          });

          expect(sessions.reduce((total, value) => total + value, 0)).toBe(
            remaining,
          );
          expect(sessions.every((value) => value > 0)).toBe(true);
          if (sessions.length > 1) {
            expect(sessions.every((value) => value >= minimum)).toBe(true);
          }
        }
      }
    }
  });
});
