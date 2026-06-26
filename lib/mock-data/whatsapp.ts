import type {
  WhatsAppConversation,
  WhatsAppMessage,
} from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const now = "2026-06-10T12:00:00.000Z";

function base(id: string) {
  return {
    id,
    tenancyId: DEMO_TENANCY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  };
}

export const mockConversations: WhatsAppConversation[] = [
  {
    ...base("conv-00000001"),
    clientId: "client-00000004",
    phone: "+5511988880004",
    contactName: "Carla Mendes",
    lastMessageAt: "2026-06-10T11:55:00.000Z",
    assignedToUserId: DEMO_USERS.broker,
    status: "em_atendimento",
    triageClassification: "venda",
  },
  {
    ...base("conv-00000002"),
    clientId: null,
    phone: "+5511977770000",
    contactName: null,
    lastMessageAt: "2026-06-10T09:30:00.000Z",
    assignedToUserId: null,
    status: "aberta",
    triageClassification: "locacao",
  },
];

export const mockMessages: WhatsAppMessage[] = [
  {
    ...base("msg-00000001"),
    conversationId: "conv-00000001",
    direction: "in",
    body: "Bom dia! Ainda está disponível a casa dos Ipês?",
    mediaUrl: null,
    templateKey: null,
    externalId: "ext-001",
    sentAt: "2026-06-10T11:50:00.000Z",
    deliveredAt: "2026-06-10T11:50:01.000Z",
    readAt: "2026-06-10T11:51:00.000Z",
    sentBy: "user",
  },
  {
    ...base("msg-00000002"),
    conversationId: "conv-00000001",
    direction: "out",
    body: "Bom dia! Sim, está. Podemos agendar uma visita?",
    mediaUrl: null,
    templateKey: null,
    externalId: "ext-002",
    sentAt: "2026-06-10T11:55:00.000Z",
    deliveredAt: "2026-06-10T11:55:01.000Z",
    readAt: null,
    sentBy: "user",
  },
  {
    ...base("msg-00000003"),
    conversationId: "conv-00000002",
    direction: "in",
    body: "Oi, queria alugar um apartamento de 2 quartos na zona sul.",
    mediaUrl: null,
    templateKey: null,
    externalId: "ext-003",
    sentAt: "2026-06-10T09:30:00.000Z",
    deliveredAt: "2026-06-10T09:30:01.000Z",
    readAt: null,
    sentBy: "user",
  },
];
