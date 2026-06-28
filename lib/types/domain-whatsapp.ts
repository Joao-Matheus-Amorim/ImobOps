// WhatsApp domain types

import { BaseEntity } from "./domain-base";

export type ConversationStatus = "aberta" | "em_atendimento" | "encerrada";

export type TriageClassification =
  | "locacao"
  | "venda"
  | "condominio"
  | "financeiro"
  | "outro"
  | null;

export interface WhatsAppConversation extends BaseEntity {
  clientId: string | null;
  phone: string;
  contactName: string | null;
  lastMessageAt: string;
  assignedToUserId: string | null;
  status: ConversationStatus;
  triageClassification: TriageClassification;
}

export type MessageDirection = "in" | "out";
export type MessageSender = "user" | "system" | "ai" | "bot";

export interface WhatsAppMessage extends BaseEntity {
  conversationId: string;
  direction: MessageDirection;
  body: string;
  mediaUrl: string | null;
  templateKey: string | null;
  externalId: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  sentBy: MessageSender;
}

// Admin-editable quick-reply template.
export interface WhatsAppTemplate extends BaseEntity {
  title: string;
  body: string;
  active: boolean;
}
