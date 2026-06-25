import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Plus,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { guardPage } from "@/lib/guard-page";

export const metadata = { title: "Calendario" };

const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

const days = [
  { day: 31, muted: true },
  ...Array.from({ length: 30 }, (_, i) => ({ day: i + 1, muted: false })),
  { day: 1, muted: true },
  { day: 2, muted: true },
  { day: 3, muted: true },
  { day: 4, muted: true },
];

const events: Record<number, { label: string; tone: "task" | "meeting" | "payment" | "board" }[]> = {
  10: [{ label: "Enviar boletos do mes", tone: "payment" }],
  11: [{ label: "PIX - confirmar recebimento", tone: "payment" }],
  16: [
    { label: "Saude dos clientes", tone: "task" },
    { label: "Revisar atrasados", tone: "payment" },
  ],
  17: [{ label: "Reuniao com cliente", tone: "meeting" }],
  18: [{ label: "Contrato e vistoria", tone: "task" }],
  19: [{ label: "Subir campanha imoveis", tone: "board" }],
  22: [{ label: "Alinhamento financeiro", tone: "meeting" }],
  24: [{ label: "Disparar lembrete PIX", tone: "payment" }],
  25: [{ label: "Relatorio mensal", tone: "task" }],
};

const eventTone = {
  task: "bg-primary/25 text-foreground",
  meeting: "bg-sky-500/22 text-foreground",
  payment: "bg-primary/35 text-foreground shadow-glow-sm",
  board: "bg-indigo-400/20 text-foreground",
};

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="flex min-h-[88px] items-center justify-between p-4">
      <div>
        <p className="section-label text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
      </div>
      <div className="text-primary">{icon}</div>
    </Card>
  );
}

export default async function CalendarPage() {
  await guardPage("calendar");

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Agenda"
        title="Calendario"
        description="Tarefas, reunioes, boletos, PIX e pagamentos organizados por responsavel."
        action={
          <Button size="lg">
            <Plus /> Novo evento
          </Button>
        }
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">Hoje</Button>
          <button className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
            <ChevronLeft className="size-4" />
          </button>
          <button className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
            <ChevronRight className="size-4" />
          </button>
          <p className="font-semibold text-foreground">Junho de 2026</p>
        </div>

        <div className="flex w-full overflow-hidden rounded-2xl border border-primary/18 bg-card/55 p-1 text-sm xl:w-auto">
          {["Todos", "Mes", "Semana", "Agenda", "Planejamento"].map((tab) => (
            <button
              key={tab}
              className={
                tab === "Todos"
                  ? "rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-glow"
                  : "rounded-xl px-4 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Tarefas" value="2" icon={<CheckSquare className="size-5" />} />
        <SummaryCard label="Reunioes" value="2" icon={<Users className="size-5" />} />
        <SummaryCard label="Conteudo" value="2" icon={<FileText className="size-5" />} />
        <SummaryCard label="Boards" value="1" icon={<LayoutDashboard className="size-5" />} />
      </div>

      <Card className="overflow-x-auto rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-4 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-7 gap-1 pb-2 section-label text-muted-foreground">
            {weekdays.map((day) => (
              <div key={day} className="px-3 py-2 text-center">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((item, index) => {
              const dayEvents = item.muted ? [] : events[item.day] ?? [];
              const isToday = !item.muted && item.day === 16;

              return (
                <div
                  key={`${item.day}-${index}`}
                  className={[
                    "min-h-[104px] rounded-lg border bg-primary/5 p-2 transition",
                    item.muted
                      ? "border-primary/6 text-muted-foreground/50"
                      : "border-primary/12 text-foreground hover:border-primary/35 hover:bg-primary/10",
                    isToday ? "border-primary/80 bg-primary/10 shadow-glow-lg" : "",
                  ].join(" ")}
                >
                  <div className={isToday ? "font-bold text-primary text-glow" : ""}>{item.day}</div>
                  <div className="mt-5 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.label}
                        className={`truncate rounded-md px-2 py-1 text-[11px] ${eventTone[event.tone]}`}
                      >
                        {event.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="section-label text-primary/80">Prioridade financeira</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a agenda para programar emissao de boleto, disparo de PIX,
                lembrete de vencimento e revisao de atrasados.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="section-label text-primary/80">Hoje</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">2 rotinas</p>
          <p className="mt-1 text-sm text-muted-foreground">Saude dos clientes e atrasados.</p>
        </Card>
      </div>
    </div>
  );
}
