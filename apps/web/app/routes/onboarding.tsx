import { useRef, useState } from "react";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import {
  ensureProfile,
  ensureUserPreferences,
  createSupabaseActivityRepository,
  listActiveDisciplines,
  listActiveAvailabilityWindows,
  listRecurringCalendarBlocks,
  replaceActiveAvailabilityWindows,
  replaceRecurringCalendarBlocks,
  saveOnboardingDiscipline,
  updateOnboardingProgress,
  updateProfile,
  updateUserPreferences,
} from "@seekin/data-access";
import { parseAvailabilityWindows } from "../onboarding/availability-flow";
import { parseOnboardingActivity } from "../onboarding/activity-flow";
import { parseOnboardingDiscipline } from "../onboarding/discipline-flow";
import { parseRecurringBlocks } from "../onboarding/recurring-blocks-flow";
import { readVerifiedSession } from "../auth/session-flow";
import {
  clearPrivateBrowserDataHeaders,
  createRequestSessionClient,
  isSameOriginSubmission,
  readAuthFormData,
} from "../auth/runtime-auth";
import {
  isAvailableOnboardingStep,
  onboardingStepCount,
  parseOnboardingMove,
} from "../onboarding/onboarding-flow";
import { parseOnboardingPreferences } from "../onboarding/preferences-flow";
import { profileTimezones } from "../profile/profile-flow";
import { Button } from "../ui/components/Button";
import { TextField } from "../ui/components/TextField";

type OnboardingState = {
  activity: {
    activity_type: string;
    deadline_local_date: string;
    deadline_local_time: string | null;
    discipline_id: string | null;
    estimated_minutes: number;
    id: string;
    notes_markdown: string | null;
    priority: number;
    revision: number;
    title: string;
  } | null;
  availability: Array<{
    day_of_week: number;
    end_local: string;
    start_local: string;
  }>;
  recurringBlocks: Array<{
    days: number[];
    end_local: string;
    start_local: string;
    title: string;
  }>;
  discipline: {
    color_key: string | null;
    description: string | null;
    id: string;
    name: string;
    revision: number;
  } | null;
  disciplines: Array<{ id: string; name: string }>;
  preferences: {
    capacity_reserve_percent: number;
    minimum_session_minutes: number;
    preferred_session_minutes: number;
    revision: number;
    week_starts_on: number;
  };
  revision: number;
  step: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timezone: string;
};

export const meta: MetaFunction = () => [
  { title: "Começar | SeekIn" },
  { name: "robots", content: "noindex,nofollow" },
];
export function headers() {
  return { "cache-control": "private, no-store" };
}

async function loadOnboarding(
  request: Request,
  context: LoaderFunctionArgs["context"],
) {
  const session = createRequestSessionClient(request, context);
  if (!session) throw new Response("Serviço indisponível", { status: 503 });
  const verified = await readVerifiedSession(session.auth);
  if (verified.kind === "unavailable") {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  if (verified.kind === "anonymous") {
    return {
      response: redirect("/entrar?next=%2Fonboarding", {
        headers: session.headers,
      }),
    };
  }
  const profile = await ensureProfile(session.client, verified.userId);
  if (!profile) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  const preferences = await ensureUserPreferences(
    session.client,
    verified.userId,
  );
  if (!preferences) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  const availability = await listActiveAvailabilityWindows(
    session.client,
    verified.userId,
  );
  if (!availability) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  const recurringBlocks = await listRecurringCalendarBlocks(
    session.client,
    verified.userId,
  );
  if (!recurringBlocks) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  const disciplines = await listActiveDisciplines(
    session.client,
    verified.userId,
  );
  if (!disciplines) {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  const activitiesRepository = createSupabaseActivityRepository(session.client);
  let activities;
  try {
    activities = await activitiesRepository.list(verified.userId);
  } catch {
    throw new Response("Serviço indisponível", {
      headers: session.headers,
      status: 503,
    });
  }
  return {
    activities,
    availability,
    disciplines,
    preferences,
    profile,
    recurringBlocks,
    session,
    userId: verified.userId,
  };
}

function publicState(loaded: {
  activities: Awaited<
    ReturnType<ReturnType<typeof createSupabaseActivityRepository>["list"]>
  >;
  availability: NonNullable<
    Awaited<ReturnType<typeof listActiveAvailabilityWindows>>
  >;
  disciplines: NonNullable<Awaited<ReturnType<typeof listActiveDisciplines>>>;
  preferences: NonNullable<Awaited<ReturnType<typeof ensureUserPreferences>>>;
  profile: NonNullable<Awaited<ReturnType<typeof ensureProfile>>>;
  recurringBlocks: NonNullable<
    Awaited<ReturnType<typeof listRecurringCalendarBlocks>>
  >;
}): OnboardingState {
  const step = isAvailableOnboardingStep(loaded.profile.onboarding_step)
    ? loaded.profile.onboarding_step
    : 1;
  return {
    activity: toPublicActivity(
      loaded.activities.find((activity) => activity.status === "active") ??
        null,
    ),
    availability: loaded.availability.map((window) => ({
      day_of_week: window.day_of_week,
      end_local: window.end_local.slice(0, 5),
      start_local: window.start_local.slice(0, 5),
    })),
    discipline: loaded.disciplines[0] ?? null,
    disciplines: loaded.disciplines.map(({ id, name }) => ({ id, name })),
    preferences: {
      capacity_reserve_percent: loaded.preferences.capacity_reserve_percent,
      minimum_session_minutes: loaded.preferences.minimum_session_minutes,
      preferred_session_minutes: loaded.preferences.preferred_session_minutes,
      revision: loaded.preferences.revision,
      week_starts_on: loaded.preferences.week_starts_on,
    },
    recurringBlocks: groupRecurringBlocks(loaded.recurringBlocks),
    revision: loaded.profile.revision,
    step,
    timezone: loaded.profile.timezone,
  };
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const loaded = await loadOnboarding(request, context);
  if ("response" in loaded) return loaded.response;
  if (loaded.profile.onboarding_status === "completed") {
    return redirect("/app", { headers: loaded.session.headers });
  }
  return Response.json(publicState(loaded), {
    headers: loaded.session.headers,
  });
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (!isSameOriginSubmission(request))
    throw new Response("Solicitação inválida", { status: 403 });
  const formData = await readAuthFormData(request);
  if (!formData) throw new Response("Solicitação inválida", { status: 400 });
  if (formData.get("intent") === "logout") {
    const session = createRequestSessionClient(request, context);
    if (session)
      try {
        await session.auth.signOut({ scope: "local" });
      } catch {
        /* limpeza local abaixo */
      }
    return redirect("/entrar?status=signed-out", {
      headers: clearPrivateBrowserDataHeaders(request, session?.headers),
    });
  }

  const loaded = await loadOnboarding(request, context);
  if ("response" in loaded) return loaded.response;
  if (loaded.profile.onboarding_status === "completed") {
    return redirect("/app", { headers: loaded.session.headers });
  }
  const revision = Number(formData.get("revision"));
  const currentStep = Number(formData.get("currentStep"));
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    revision !== loaded.profile.revision ||
    currentStep !== loaded.profile.onboarding_step
  ) {
    return Response.json(
      { error: "Seu progresso mudou. Recarregue para continuar." },
      { headers: loaded.session.headers, status: 409 },
    );
  }
  const targetStep =
    (currentStep === 2 || currentStep === 3 || currentStep === 4) &&
    formData.get("intent") === "skip"
      ? currentStep === 2
        ? 3
        : currentStep === 3
          ? 4
          : 5
      : parseOnboardingMove(formData, currentStep);
  if (targetStep === null)
    throw new Response("Solicitação inválida", { status: 400 });

  let profileRevision = revision;
  let savedPreferences = loaded.preferences;
  let savedTimezone = loaded.profile.timezone;
  let savedAvailability = loaded.availability;
  let savedActivity =
    loaded.activities.find((activity) => activity.status === "active") ?? null;
  let savedDiscipline = loaded.disciplines[0] ?? null;
  let savedRecurringBlocks = loaded.recurringBlocks;
  if (currentStep === 1 && targetStep === 2) {
    const input = parseOnboardingPreferences(formData);
    const preferencesRevision = Number(formData.get("preferencesRevision"));
    if (!input || preferencesRevision !== loaded.preferences.revision) {
      return Response.json(
        { error: "Revise os valores informados." },
        { headers: loaded.session.headers, status: 400 },
      );
    }
    const profile = await updateProfile(
      loaded.session.client,
      loaded.userId,
      revision,
      {
        displayName: loaded.profile.display_name,
        timezone: input.timezone,
      },
    );
    if (!profile)
      return Response.json(
        { error: "Seu progresso mudou. Recarregue para continuar." },
        { headers: loaded.session.headers, status: 409 },
      );
    profileRevision = profile.revision;
    savedTimezone = profile.timezone;
    const preferencesInput = {
      capacity_reserve_percent: input.capacity_reserve_percent,
      minimum_session_minutes: input.minimum_session_minutes,
      preferred_session_minutes: input.preferred_session_minutes,
      week_starts_on: input.week_starts_on,
    };
    const preferences = await updateUserPreferences(
      loaded.session.client,
      loaded.userId,
      preferencesRevision,
      preferencesInput,
    );
    if (!preferences)
      return Response.json(
        { error: "Não foi possível salvar. Recarregue e tente novamente." },
        { headers: loaded.session.headers, status: 409 },
      );
    savedPreferences = preferences;
  }

  if (currentStep === 2 && targetStep === 3) {
    const skip = formData.get("intent") === "skip";
    const windows = skip ? [] : parseAvailabilityWindows(formData);
    if (!windows) {
      return Response.json(
        { error: "Revise os horários antes de continuar." },
        { headers: loaded.session.headers, status: 400 },
      );
    }
    const validFrom = localDateInTimezone(loaded.profile.timezone);
    const replaced = await replaceActiveAvailabilityWindows(
      loaded.session.client,
      loaded.userId,
      loaded.profile.timezone,
      validFrom,
      loaded.availability,
      windows,
    );
    if (!replaced) {
      return Response.json(
        {
          error:
            "Não foi possível salvar os horários. Recarregue e tente novamente.",
        },
        { headers: loaded.session.headers, status: 409 },
      );
    }
    savedAvailability = replaced;
  }

  if (currentStep === 3 && targetStep === 4) {
    const skip = formData.get("intent") === "skip";
    const validation = skip
      ? { blocks: [], ok: true as const }
      : parseRecurringBlocks(formData);
    if (!validation.ok) {
      return Response.json(
        { error: validation.message },
        { headers: loaded.session.headers, status: 400 },
      );
    }
    const replaced = await replaceRecurringCalendarBlocks(
      loaded.session.client,
      loaded.userId,
      loaded.profile.timezone,
      localDateInTimezone(loaded.profile.timezone),
      loaded.recurringBlocks,
      validation.blocks,
    );
    if (!replaced) {
      return Response.json(
        {
          error:
            "Não foi possível salvar os compromissos. Recarregue e tente novamente.",
        },
        { headers: loaded.session.headers, status: 409 },
      );
    }
    savedRecurringBlocks = replaced;
  }

  if (currentStep === 4 && targetStep === 5) {
    const skip = formData.get("intent") === "skip";
    if (!skip) {
      const input = parseOnboardingDiscipline(formData);
      if (!input) {
        return Response.json(
          { error: "Informe o nome da disciplina." },
          { headers: loaded.session.headers, status: 400 },
        );
      }
      const saved = await saveOnboardingDiscipline(
        loaded.session.client,
        loaded.userId,
        savedDiscipline,
        input.name,
      );
      if (!saved) {
        return Response.json(
          {
            error:
              "Não foi possível salvar a disciplina. Verifique o nome e tente novamente.",
          },
          { headers: loaded.session.headers, status: 409 },
        );
      }
      savedDiscipline = saved;
    }
  }

  if (currentStep === 5 && targetStep === 6) {
    const input = parseOnboardingActivity(
      formData,
      loaded.profile.timezone,
      new Set(loaded.disciplines.map((discipline) => discipline.id)),
    );
    if (!input) {
      return Response.json(
        { error: "Revise os dados da atividade antes de continuar." },
        { headers: loaded.session.headers, status: 400 },
      );
    }
    const repository = createSupabaseActivityRepository(loaded.session.client);
    try {
      savedActivity = savedActivity
        ? await repository.update(
            loaded.userId,
            savedActivity.id,
            savedActivity.revision,
            input,
          )
        : await repository.create({
            ...input,
            actual_minutes: 0,
            source: "manual",
            status: "active",
            user_id: loaded.userId,
          });
    } catch {
      return Response.json(
        {
          error:
            "Não foi possível salvar a atividade. Recarregue e tente novamente.",
        },
        { headers: loaded.session.headers, status: 409 },
      );
    }
  }

  const updated = await updateOnboardingProgress(
    loaded.session.client,
    loaded.userId,
    profileRevision,
    targetStep,
  );
  if (!updated)
    return Response.json(
      { error: "Não foi possível salvar seu progresso. Tente novamente." },
      { headers: loaded.session.headers, status: 409 },
    );
  return Response.json(
    {
      activity: toPublicActivity(savedActivity),
      availability: savedAvailability.map((window) => ({
        day_of_week: window.day_of_week,
        end_local: window.end_local.slice(0, 5),
        start_local: window.start_local.slice(0, 5),
      })),
      discipline: savedDiscipline,
      disciplines: loaded.disciplines.map(({ id, name }) => ({ id, name })),
      preferences: {
        capacity_reserve_percent: savedPreferences.capacity_reserve_percent,
        minimum_session_minutes: savedPreferences.minimum_session_minutes,
        preferred_session_minutes: savedPreferences.preferred_session_minutes,
        revision: savedPreferences.revision,
        week_starts_on: savedPreferences.week_starts_on,
      },
      recurringBlocks: groupRecurringBlocks(savedRecurringBlocks),
      revision: updated.revision,
      step: targetStep,
      timezone: savedTimezone,
    } satisfies OnboardingState,
    { headers: loaded.session.headers },
  );
}

function toPublicActivity(
  activity: Awaited<
    ReturnType<ReturnType<typeof createSupabaseActivityRepository>["findById"]>
  >,
): OnboardingState["activity"] {
  if (!activity) return null;
  return {
    activity_type: activity.activity_type,
    deadline_local_date: activity.deadline_local_date,
    deadline_local_time: activity.deadline_local_time?.slice(0, 5) ?? null,
    discipline_id: activity.discipline_id,
    estimated_minutes: activity.estimated_minutes,
    id: activity.id,
    notes_markdown: activity.notes_markdown,
    priority: activity.priority,
    revision: activity.revision,
    title: activity.title,
  };
}

function groupRecurringBlocks(
  blocks: NonNullable<Awaited<ReturnType<typeof listRecurringCalendarBlocks>>>,
) {
  const grouped = new Map<string, OnboardingState["recurringBlocks"][number]>();
  for (const block of blocks) {
    if (
      block.day_of_week === null ||
      block.start_local === null ||
      block.end_local === null
    )
      continue;
    const start = block.start_local.slice(0, 5);
    const end = block.end_local.slice(0, 5);
    const key = `${block.title}\u0000${start}\u0000${end}`;
    const existing = grouped.get(key);
    if (existing) existing.days.push(block.day_of_week);
    else
      grouped.set(key, {
        days: [block.day_of_week],
        end_local: end,
        start_local: start,
        title: block.title,
      });
  }
  return [...grouped.values()].map((block) => ({
    ...block,
    days: block.days.sort((left, right) => left - right),
  }));
}

function localDateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

const weekDays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function PreferencesFields({ state }: Readonly<{ state: OnboardingState }>) {
  return (
    <div className="onboarding-preferences">
      <input
        name="preferencesRevision"
        type="hidden"
        value={state.preferences.revision}
      />
      <label>
        <span>Fuso horário</span>
        <select name="timezone" defaultValue={state.timezone}>
          {profileTimezones.map((timezone) => (
            <option key={timezone} value={timezone}>
              {timezone.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Minha semana começa</span>
        <select
          name="weekStartsOn"
          defaultValue={state.preferences.week_starts_on}
        >
          {weekDays.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Sessão padrão</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={240}
            min={5}
            name="preferredSessionMinutes"
            defaultValue={state.preferences.preferred_session_minutes}
            type="number"
          />
          <span>min</span>
        </span>
      </label>
      <label>
        <span>Sessão mínima</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={240}
            min={5}
            name="minimumSessionMinutes"
            defaultValue={state.preferences.minimum_session_minutes}
            type="number"
          />
          <span>min</span>
        </span>
      </label>
      <label>
        <span>Reserva de tempo livre</span>
        <span className="onboarding-input-with-unit">
          <input
            inputMode="numeric"
            max={50}
            min={0}
            name="capacityReservePercent"
            defaultValue={state.preferences.capacity_reserve_percent}
            type="number"
          />
          <span>%</span>
        </span>
      </label>
    </div>
  );
}

type EditableWindow = OnboardingState["availability"][number] & { key: number };

function AvailabilityFields({ state }: Readonly<{ state: OnboardingState }>) {
  const nextKey = useRef(state.availability.length);
  const [windows, setWindows] = useState<EditableWindow[]>(() =>
    state.availability.map((window, key) => ({ ...window, key })),
  );
  const orderedDays = weekDays.map(
    (_, offset) => (state.preferences.week_starts_on + offset) % 7,
  );

  function addWindow(day: number) {
    const key = nextKey.current++;
    setWindows((current) => [
      ...current,
      { day_of_week: day, end_local: "20:00", key, start_local: "18:00" },
    ]);
  }

  return (
    <div className="availability-week">
      {orderedDays.map((day) => {
        const dayWindows = windows.filter(
          (window) => window.day_of_week === day,
        );
        return (
          <section
            className="availability-day"
            key={day}
            aria-labelledby={`day-${day}`}
          >
            <div className="availability-day-heading">
              <h2 id={`day-${day}`}>{weekDays[day]}</h2>
              <button
                className="availability-add"
                type="button"
                onClick={() => addWindow(day)}
              >
                Adicionar horário
              </button>
            </div>
            {dayWindows.length === 0 ? (
              <p className="availability-empty">Sem horário</p>
            ) : (
              <div className="availability-windows">
                {dayWindows.map((window) => (
                  <div className="availability-window" key={window.key}>
                    <input name="availabilityDay" type="hidden" value={day} />
                    <label>
                      <span>Início</span>
                      <input
                        name="availabilityStart"
                        type="time"
                        required
                        defaultValue={window.start_local}
                      />
                    </label>
                    <span className="availability-separator" aria-hidden="true">
                      até
                    </span>
                    <label>
                      <span>Fim</span>
                      <input
                        name="availabilityEnd"
                        type="time"
                        required
                        defaultValue={window.end_local}
                      />
                    </label>
                    <button
                      className="availability-remove"
                      type="button"
                      aria-label={`Remover horário de ${weekDays[day]}`}
                      onClick={() =>
                        setWindows((current) =>
                          current.filter((item) => item.key !== window.key),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

type EditableBlock = OnboardingState["recurringBlocks"][number] & {
  key: number;
};

function RecurringBlocksFields({
  state,
}: Readonly<{ state: OnboardingState }>) {
  const nextKey = useRef(state.recurringBlocks.length);
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    state.recurringBlocks.map((block, key) => ({ ...block, key })),
  );

  function addBlock() {
    const key = nextKey.current++;
    setBlocks((current) => [
      ...current,
      {
        days: [],
        end_local: "11:00",
        key,
        start_local: "10:00",
        title: "",
      },
    ]);
  }

  function toggleDay(key: number, day: number) {
    setBlocks((current) =>
      current.map((block) =>
        block.key !== key
          ? block
          : {
              ...block,
              days: block.days.includes(day)
                ? block.days.filter((value) => value !== day)
                : [...block.days, day].sort((left, right) => left - right),
            },
      ),
    );
  }

  return (
    <div className="recurring-blocks">
      <button className="recurring-add" type="button" onClick={addBlock}>
        Adicionar compromisso
      </button>
      {blocks.length === 0 ? (
        <p className="recurring-empty">Nenhum compromisso adicionado.</p>
      ) : (
        blocks.map((block, index) => (
          <fieldset className="recurring-block" key={block.key}>
            <legend>Compromisso {index + 1}</legend>
            <label className="recurring-title">
              <span>Nome</span>
              <input
                defaultValue={block.title}
                maxLength={120}
                name="blockTitle"
                placeholder="Ex.: Academia"
                required
              />
            </label>
            <input
              name="blockDays"
              type="hidden"
              value={block.days.join(",")}
            />
            <div className="recurring-days" aria-label="Dias da semana">
              {weekDays.map((dayLabel, day) => (
                <button
                  aria-pressed={block.days.includes(day)}
                  key={dayLabel}
                  type="button"
                  onClick={() => toggleDay(block.key, day)}
                >
                  {dayLabel.slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="recurring-time">
              <label>
                <span>Início</span>
                <input
                  defaultValue={block.start_local}
                  name="blockStart"
                  required
                  type="time"
                />
              </label>
              <span aria-hidden="true">até</span>
              <label>
                <span>Fim</span>
                <input
                  defaultValue={block.end_local}
                  name="blockEnd"
                  required
                  type="time"
                />
              </label>
            </div>
            <button
              aria-label={`Remover compromisso ${index + 1}`}
              className="recurring-remove"
              type="button"
              onClick={() =>
                setBlocks((current) =>
                  current.filter((item) => item.key !== block.key),
                )
              }
            >
              Remover
            </button>
          </fieldset>
        ))
      )}
    </div>
  );
}

function DisciplineField({ state }: Readonly<{ state: OnboardingState }>) {
  return (
    <div className="onboarding-discipline">
      <TextField
        autoComplete="off"
        defaultValue={state.discipline?.name ?? ""}
        label="Nome da disciplina"
        maxLength={120}
        name="disciplineName"
        placeholder="Ex.: Cálculo I"
        required
      />
    </div>
  );
}

const activityTypeOptions = [
  ["assignment", "Trabalho"],
  ["exam", "Prova"],
  ["reading", "Leitura"],
  ["project", "Projeto"],
  ["exercise", "Exercícios"],
  ["extension", "Extensão"],
  ["other", "Outro"],
] as const;

function ActivityFields({ state }: Readonly<{ state: OnboardingState }>) {
  const activity = state.activity;
  const effortHours = Math.floor((activity?.estimated_minutes ?? 60) / 60);
  const effortMinutes = (activity?.estimated_minutes ?? 60) % 60;
  return (
    <div className="onboarding-activity">
      <TextField
        autoComplete="off"
        defaultValue={activity?.title ?? ""}
        label="Atividade"
        maxLength={200}
        name="activityTitle"
        placeholder="Ex.: Lista de exercícios"
        required
      />
      <label>
        <span>Disciplina</span>
        <select
          defaultValue={activity?.discipline_id ?? state.discipline?.id ?? ""}
          name="disciplineId"
        >
          <option value="">Sem disciplina</option>
          {state.disciplines.map((discipline) => (
            <option key={discipline.id} value={discipline.id}>
              {discipline.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tipo</span>
        <select
          defaultValue={activity?.activity_type ?? "assignment"}
          name="activityType"
        >
          {activityTypeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="activity-deadline">
        <label>
          <span>Data de entrega</span>
          <input
            defaultValue={activity?.deadline_local_date ?? ""}
            name="deadlineDate"
            required
            type="date"
          />
        </label>
        <label>
          <span>Hora</span>
          <input
            defaultValue={activity?.deadline_local_time ?? ""}
            name="deadlineTime"
            type="time"
          />
          <small>Sem hora: até 23:59</small>
        </label>
      </div>
      <fieldset className="activity-effort">
        <legend>Tempo estimado</legend>
        <label>
          <span>Horas</span>
          <input
            defaultValue={effortHours}
            inputMode="numeric"
            max={999}
            min={0}
            name="effortHours"
            required
            type="number"
          />
        </label>
        <label>
          <span>Minutos</span>
          <input
            defaultValue={effortMinutes}
            inputMode="numeric"
            max={59}
            min={0}
            name="effortMinutes"
            required
            type="number"
          />
        </label>
      </fieldset>
      <label>
        <span>Prioridade</span>
        <select defaultValue={activity?.priority ?? 2} name="activityPriority">
          <option value="0">Muito baixa</option>
          <option value="1">Baixa</option>
          <option value="2">Normal</option>
          <option value="3">Alta</option>
          <option value="4">Muito alta</option>
        </select>
      </label>
      <label className="activity-notes">
        <span>
          Notas <small>opcional</small>
        </span>
        <textarea
          defaultValue={activity?.notes_markdown ?? ""}
          maxLength={20_000}
          name="activityNotes"
          rows={3}
        />
      </label>
    </div>
  );
}

export default function Onboarding() {
  const loaded = useLoaderData() as OnboardingState;
  const actionData = useActionData() as
    { error: string } | OnboardingState | undefined;
  const navigation = useNavigation();
  const state = actionData && "step" in actionData ? actionData : loaded;
  const isBusy = navigation.state !== "idle";

  return (
    <div className="onboarding-shell">
      <header className="onboarding-topbar">
        <a
          className="onboarding-wordmark"
          href="/onboarding"
          aria-label="SeekIn"
        >
          <img
            src="/brand/logo/seekin-wordmark.png"
            alt="SeekIn"
            width={2172}
            height={724}
          />
        </a>
        <div className="onboarding-utility">
          <span className="onboarding-progress">
            {state.step === 0
              ? "Boas-vindas"
              : `Etapa ${state.step} de ${onboardingStepCount}`}
          </span>
          <Form method="post">
            <button
              className="sign-out-button"
              disabled={isBusy}
              name="intent"
              type="submit"
              value="logout"
            >
              Sair
            </button>
          </Form>
        </div>
      </header>
      <main className="onboarding-main" id="main-content">
        <div className="onboarding-track" aria-hidden="true">
          <span
            style={{ width: `${(state.step / onboardingStepCount) * 100}%` }}
          />
        </div>
        <section
          className={`onboarding-step${state.step >= 1 && state.step <= 5 ? " onboarding-step--form" : ""}${state.step === 2 ? " onboarding-step--availability" : ""}${state.step === 3 ? " onboarding-step--recurring" : ""}${state.step === 5 ? " onboarding-step--activity" : ""}`}
          aria-labelledby="onboarding-title"
        >
          {state.step === 0 ? (
            <>
              <p className="eyebrow">Boas-vindas</p>
              <h1 id="onboarding-title">
                Vamos montar um plano que caiba na sua rotina.
              </h1>
              <p className="onboarding-lead">
                Você informa seu tempo e o que precisa entregar. O SeekIn
                organiza o caminho.
              </p>
            </>
          ) : state.step === 1 ? (
            <>
              <p className="eyebrow">Preferências</p>
              <h1 id="onboarding-title">Primeiro, acerte o ritmo.</h1>
              <p className="onboarding-lead">
                Defina como sua semana funciona.
              </p>
            </>
          ) : state.step === 2 ? (
            <>
              <p className="eyebrow">Disponibilidade</p>
              <h1 id="onboarding-title">
                Quando você costuma ter tempo livre?
              </h1>
              <p className="onboarding-lead">
                Adicione os horários que se repetem na sua semana.
              </p>
            </>
          ) : state.step === 3 ? (
            <>
              <p className="eyebrow">Rotina</p>
              <h1 id="onboarding-title">O que já ocupa seu tempo?</h1>
              <p className="onboarding-lead">
                Marque compromissos que se repetem na semana.
              </p>
            </>
          ) : state.step === 4 ? (
            <>
              <p className="eyebrow">Disciplina</p>
              <h1 id="onboarding-title">Qual matéria vem primeiro?</h1>
            </>
          ) : state.step === 5 ? (
            <>
              <p className="eyebrow">Atividade</p>
              <h1 id="onboarding-title">Qual é a sua primeira entrega?</h1>
            </>
          ) : (
            <>
              <p className="eyebrow">Seu plano</p>
              <h1 id="onboarding-title">Veja como sua rotina pode ficar.</h1>
            </>
          )}
          {actionData && "error" in actionData ? (
            <p className="form-message form-message--error" role="alert">
              {actionData.error}
            </p>
          ) : null}
          <Form className="onboarding-form" method="post">
            <input name="revision" type="hidden" value={state.revision} />
            <input name="currentStep" type="hidden" value={state.step} />
            {state.step === 1 ? <PreferencesFields state={state} /> : null}
            {state.step === 2 ? <AvailabilityFields state={state} /> : null}
            {state.step === 3 ? <RecurringBlocksFields state={state} /> : null}
            {state.step === 4 ? <DisciplineField state={state} /> : null}
            {state.step === 5 ? <ActivityFields state={state} /> : null}
            <div className="onboarding-actions">
              {state.step > 0 ? (
                <Button
                  name="intent"
                  value="back"
                  variant="secondary"
                  loading={isBusy}
                >
                  Voltar
                </Button>
              ) : null}
              {state.step === 0 ? (
                <Button name="intent" value="next" loading={isBusy}>
                  Começar
                </Button>
              ) : null}
              {state.step === 1 ? (
                <Button name="intent" value="next" loading={isBusy}>
                  Continuar
                </Button>
              ) : null}
              {state.step === 2 ? (
                <>
                  <Button
                    name="intent"
                    value="skip"
                    variant="secondary"
                    loading={isBusy}
                  >
                    Configurar depois
                  </Button>
                  <Button name="intent" value="next" loading={isBusy}>
                    Continuar
                  </Button>
                </>
              ) : null}
              {state.step === 3 ? (
                <>
                  <Button
                    name="intent"
                    value="skip"
                    variant="secondary"
                    loading={isBusy}
                  >
                    Pular por agora
                  </Button>
                  <Button name="intent" value="next" loading={isBusy}>
                    Continuar
                  </Button>
                </>
              ) : null}
              {state.step === 4 ? (
                <>
                  <Button
                    name="intent"
                    value="skip"
                    variant="secondary"
                    loading={isBusy}
                  >
                    Pular por agora
                  </Button>
                  <Button name="intent" value="next" loading={isBusy}>
                    Continuar
                  </Button>
                </>
              ) : null}
              {state.step === 5 ? (
                <Button name="intent" value="next" loading={isBusy}>
                  Criar atividade
                </Button>
              ) : null}
            </div>
          </Form>
        </section>
      </main>
    </div>
  );
}
