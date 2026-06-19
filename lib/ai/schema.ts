// Minimal Zod → JSON Schema converter, sufficient for tool parameter schemas.
// Supports objects, strings, numbers, booleans, enums, arrays, optionals, and
// nullable. Not a full implementation — covers the shapes used by our tools.
import { z } from "zod";

type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  // Unwrap optional / nullable / default.
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema._def.innerType);
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: JsonSchema = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      const isOptional = value instanceof z.ZodOptional || value instanceof z.ZodDefault;
      if (!isOptional) required.push(key);
    }
    return { type: "object", properties, required };
  }

  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: schema._def.values };
  }
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(schema._def.type) };
  }

  // Fallback for unsupported nodes.
  return { type: "string" };
}
