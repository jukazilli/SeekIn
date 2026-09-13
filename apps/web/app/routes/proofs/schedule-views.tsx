import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import ptBrLocale from "@fullcalendar/react/locales/pt-br";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MetaFunction } from "react-router";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "./schedule-views.css";

import {
  buildTimelineItems,
  calendarEvents,
  timelineBarStyle,
  type ScheduleKind,
} from "./schedule-proof-data";

export const meta: MetaFunction = () => [
  { title: "Prova de calendário e Gantt · SeekIn" },
  {
    name: "description",
    content:
      "Prova técnica interna das visualizações de planejamento do SeekIn.",
  },
];

type Mode = "calendar" | "timeline";

const dayLabels = [
  "14 seg",
  "15 ter",
  "16 qua",
  "17 qui",
  "18 sex",
  "19 sáb",
  "20 dom",
  "21 seg",
  "22 ter",
  "23 qua",
  "24 qui",
  "25 sex",
  "26 sáb",
  "27 dom",
];

const kindClass: Record<ScheduleKind, string> = {
  Sessão: "session",
  Prazo: "deadline",
  Bloqueio: "block",
};

export default function ScheduleViewsProof() {
  const calendarRef = useRef<CalendarRef>(null);
  const [mode, setMode] = useState<Mode>("calendar");
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    title: string;
    kind: ScheduleKind;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [showStressTest, setShowStressTest] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const timelineItems = useMemo(
    () => buildTimelineItems(showStressTest ? 200 : 8),
    [showStressTest],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const changeView = () => {
      setIsCompact(media.matches);
      const api = calendarRef.current?.getApi();
      if (!api) return;
      api.changeView(media.matches ? "listMonth" : "dayGridMonth");
    };

    changeView();
    media.addEventListener("change", changeView);
    return () => media.removeEventListener("change", changeView);
  }, []);

  function moveSelectedEvent() {
    if (!selectedEvent) return;
    const event = calendarRef.current?.getApi().getEventById(selectedEvent.id);
    if (!event?.start) return;

    const nextDate = new Date(event.start);
    nextDate.setDate(nextDate.getDate() + 1);
    event.setStart(nextDate, { maintainDuration: true });
    setAnnouncement(`${selectedEvent.title} movido em um dia.`);
  }

  return (
    <main className="schedule-proof" aria-labelledby="schedule-title">
      <header className="schedule-proof__header">
        <div>
          <a className="schedule-proof__back" href="/">
            SeekIn
          </a>
          <p className="schedule-proof__eyebrow">Planejamento</p>
          <h1 id="schedule-title">Sua quinzena, sem surpresas.</h1>
        </div>
        <div
          className="schedule-proof__switcher"
          aria-label="Visualização"
          role="group"
        >
          <button
            aria-pressed={mode === "calendar"}
            onClick={() => setMode("calendar")}
            type="button"
          >
            Calendário
          </button>
          <button
            aria-pressed={mode === "timeline"}
            onClick={() => setMode("timeline")}
            type="button"
          >
            Linha do tempo
          </button>
        </div>
      </header>

      <section className="schedule-proof__legend" aria-label="Legenda">
        {(Object.keys(kindClass) as ScheduleKind[]).map((kind) => (
          <span
            className={`schedule-proof__legend-item is-${kindClass[kind]}`}
            key={kind}
          >
            {kind}
          </span>
        ))}
      </section>

      {mode === "calendar" ? (
        <section
          className="schedule-proof__surface"
          aria-label="Calendário de estudos"
        >
          <div className="schedule-proof__calendar">
            <FullCalendar
              key={isCompact ? "compact" : "wide"}
              ref={calendarRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
                classicThemePlugin,
              ]}
              locale={ptBrLocale}
              initialDate="2026-09-14"
              initialView={isCompact ? "listMonth" : "dayGridMonth"}
              events={calendarEvents}
              eventInteractive
              eventClass={(info) =>
                `is-${kindClass[info.event.extendedProps.kind as ScheduleKind]}`
              }
              eventClick={(info) => {
                setSelectedEvent({
                  id: info.event.id,
                  title: info.event.title,
                  kind: info.event.extendedProps.kind as ScheduleKind,
                });
                setAnnouncement(`${info.event.title} selecionado.`);
              }}
              headerToolbar={{
                start: "title",
                center: "",
                end: "dayGridMonth,timeGridWeek,listMonth prev,next today",
              }}
              buttons={{
                dayGridMonth: { text: "Mês" },
                timeGridWeek: { text: "Semana" },
                listMonth: { text: "Agenda" },
                today: { text: "Hoje" },
              }}
              height="auto"
              nowIndicator
              dayMaxEvents={3}
            />
          </div>

          {selectedEvent ? (
            <aside
              className="schedule-proof__selection"
              aria-labelledby="selection-title"
            >
              <div>
                <p>{selectedEvent.kind}</p>
                <h2 id="selection-title">
                  {selectedEvent.title.replace(/^.+ · /, "")}
                </h2>
              </div>
              <button onClick={moveSelectedEvent} type="button">
                Mover para o dia seguinte
              </button>
            </aside>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </section>
      ) : (
        <TimelineProof
          isCompact={isCompact}
          items={timelineItems}
          showStressTest={showStressTest}
          onStressTestChange={setShowStressTest}
        />
      )}
    </main>
  );
}

function TimelineProof({
  isCompact,
  items,
  showStressTest,
  onStressTestChange,
}: Readonly<{
  isCompact: boolean;
  items: ReturnType<typeof buildTimelineItems>;
  showStressTest: boolean;
  onStressTestChange: (show: boolean) => void;
}>) {
  return (
    <section
      className="schedule-proof__surface"
      aria-labelledby="timeline-title"
    >
      <div className="timeline-toolbar">
        <div>
          <p className="timeline-toolbar__range">14–27 de setembro</p>
          <h2 id="timeline-title">Linha do tempo</h2>
        </div>
        <label className="timeline-toolbar__stress">
          <input
            checked={showStressTest}
            onChange={(event) => onStressTestChange(event.target.checked)}
            type="checkbox"
          />
          Testar 200 atividades
        </label>
      </div>

      <div className="gantt" data-row-count={items.length}>
        <div className="gantt__header" aria-hidden="true">
          <span>Atividade</span>
          <div className="gantt__days">
            {dayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
        <div
          className="gantt__rows"
          aria-label={`${items.length} atividades na linha do tempo`}
        >
          {items.map((item) => (
            <article className="gantt__row" key={item.id}>
              <div className="gantt__label">
                <strong>{item.title}</strong>
                <span>{item.subject}</span>
              </div>
              <div className="gantt__track" aria-hidden="true">
                <span
                  className={`gantt__bar is-${kindClass[item.kind]}`}
                  style={timelineBarStyle(item)}
                >
                  {item.progress ? `${item.progress}%` : item.kind}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <details className="timeline-table" open={isCompact || undefined}>
        <summary>Ver como tabela</summary>
        <div className="timeline-table__scroll">
          <table>
            <caption className="sr-only">
              Atividades da quinzena em formato textual
            </caption>
            <thead>
              <tr>
                <th scope="col">Atividade</th>
                <th scope="col">Categoria</th>
                <th scope="col">Início</th>
                <th scope="col">Duração</th>
                <th scope="col">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.title}</th>
                  <td>{item.kind}</td>
                  <td>{dayLabels[item.startDay]}</td>
                  <td>{item.durationDays} dia(s)</td>
                  <td>{item.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
