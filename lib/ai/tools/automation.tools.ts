import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { automationActionSchema, automationTriggerSchema } from "@/lib/automation/schema";
import { validateAutomationAction } from "@/lib/automation/executor";

const schema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  trigger: automationTriggerSchema,
  action: automationActionSchema,
});

export const automationTools = [
  defineTool({
    name: "create_automation_rule",
    description: "Cria uma automação agendada no calendário. Não permite exclusões. Use cliente por ID apenas quando o usuário escolheu explicitamente o cliente correto.",
    effect: "write",
    feature: "calendar",
    action: "create",
    schema,
    run: async (params, ctx) => {
      const trigger = automationTriggerSchema.parse(params.trigger);
      const action = automationActionSchema.parse(params.action);
      validateAutomationAction(action);
      return automationRepository.createRule(repoCtx(ctx), {
        name: params.name,
        description: params.description ?? null,
        status: "active",
        trigger,
        action,
      });
    },
    preview: async (params) => `Criar automação "${params.name}" para executar ${params.action.kind} em regra ${params.trigger.kind}.`,
  }),
];
