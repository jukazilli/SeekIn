import type { EventInput } from "@fullcalendar/react";

export type ScheduleKind = "Sessão" | "Prazo" | "Bloqueio";

export type TimelineItem = {
  id: string;
  title: string;
  subject: string;
  kind: ScheduleKind;
  startDay: number;
  durationDays: number;
  progress: number;
};

export const calendarEvents: EventInput[] = [
  {
    id: "session-1",
    title: "Sessão · Projeto de Interfaces",
    start: "2026-09-14T09:00:00-03:00",
    end: "2026-09-14T09:50:00-03:00",
    extendedProps: { kind: "Sessão" },
  },
  {
    id: "block-1",
    title: "Bloqueio · Aula presencial",
    start: "2026-09-15T19:00:00-03:00",
    end: "2026-09-15T22:00:00-03:00",
    extendedProps: { kind: "Bloqueio" },
  },
  {
    id: "session-2",
    title: "Sessão · Revisão de Estatística",
    start: "2026-09-16T14:00:00-03:00",
    end: "2026-09-16T14:50:00-03:00",
    extendedProps: { kind: "Sessão" },
  },
  {
    id: "deadline-1",
    title: "Prazo · Exercícios de Estatística",
    start: "2026-09-18",
    allDay: true,
    extendedProps: { kind: "Prazo" },
  },
  {
    id: "session-3",
    title: "Sessão · Conhecimentos gerais",
    start: "2026-09-21T10:00:00-03:00",
    end: "2026-09-21T10:50:00-03:00",
    extendedProps: { kind: "Sessão" },
  },
  {
    id: "deadline-2",
    title: "Prazo · Semana de conhecimentos gerais",
    start: "2026-09-25",
    allDay: true,
    extendedProps: { kind: "Prazo" },
  },
];

const timelineTemplates = [
  ["Mapear referências", "Projeto de Interfaces", "Sessão", 0, 2, 100],
  ["Criar wireframe", "Projeto de Interfaces", "Sessão", 2, 4, 70],
  ["Revisar probabilidade", "Estatística", "Sessão", 1, 3, 45],
  ["Resolver exercícios", "Estatística", "Sessão", 5, 4, 20],
  ["Aula presencial", "Rotina", "Bloqueio", 3, 1, 100],
  ["Entregar protótipo", "Projeto de Interfaces", "Prazo", 9, 1, 0],
  ["Ler material da semana", "Conhecimentos gerais", "Sessão", 7, 3, 35],
  ["Enviar atividade", "Conhecimentos gerais", "Prazo", 12, 1, 0],
] as const;

export function buildTimelineItems(count: number = timelineTemplates.length) {
  return Array.from({ length: count }, (_, index): TimelineItem => {
    const template = timelineTemplates[index % timelineTemplates.length]!;
    const cycle = Math.floor(index / timelineTemplates.length);

    return {
      id: `timeline-${index + 1}`,
      title: cycle ? `${template[0]} ${cycle + 1}` : template[0],
      subject: template[1],
      kind: template[2],
      startDay: (template[3] + cycle * 2) % 13,
      durationDays: template[4],
      progress: template[5],
    };
  });
}

export function timelineBarStyle(item: TimelineItem) {
  return {
    gridColumn: `${item.startDay + 1} / span ${Math.min(item.durationDays, 14 - item.startDay)}`,
  };
}
