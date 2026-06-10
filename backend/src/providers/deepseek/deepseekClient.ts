import { env } from "../../config/env";
import { errors } from "../../shared/errors";

export interface DeepSeekScriptDraft {
  openingHook: string;
  scriptText: string;
  sellingPoints: string[];
  shotCues: Array<{
    timeRange: string;
    visual: string;
    voiceover: string;
    assetRole: string;
  }>;
  riskNotes: string[];
}

const stripCodeFence = (value: string) => {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
};

const parseJsonObject = (value: string) => {
  const cleaned = stripCodeFence(value);
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1)) as Record<string, unknown>;
    }
    throw errors.generationFailed("deepseek response is not valid JSON", {
      responsePreview: cleaned.slice(0, 500),
    });
  }
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item) => item.length > 0)
    : [];

const normalizeShotCues = (value: unknown): DeepSeekScriptDraft["shotCues"] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        timeRange: asString(record.timeRange),
        visual: asString(record.visual),
        voiceover: asString(record.voiceover),
        assetRole: asString(record.assetRole),
      };
    })
    .filter((item) => item.timeRange && item.visual && item.voiceover);
};

export class DeepSeekClient {
  get isConfigured() {
    return Boolean(env.deepseek.apiKey);
  }

  async createScriptDraft(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<DeepSeekScriptDraft | null> {
    if (!this.isConfigured) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.deepseek.timeoutMs);
    try {
      const response = await fetch(`${env.deepseek.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.deepseek.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.deepseek.model,
          temperature: 0.45,
          max_tokens: env.deepseek.maxTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw errors.generationFailed("deepseek script generation failed", {
          status: response.status,
          response: raw,
        });
      }

      const choice = raw?.choices?.[0] ?? {};
      const message = choice?.message ?? {};
      const content =
        asString(message.content) ||
        asString(choice.text) ||
        asString(raw?.content) ||
        asString(raw?.output_text);
      if (!content) {
        throw errors.generationFailed("deepseek response missing content", {
          finishReason: choice?.finish_reason,
          messageKeys: message && typeof message === "object" ? Object.keys(message) : [],
          usage: raw?.usage,
        });
      }
      const parsed = parseJsonObject(content);
      return {
        openingHook: asString(parsed.openingHook),
        scriptText: asString(parsed.scriptText),
        sellingPoints: asStringArray(parsed.sellingPoints),
        shotCues: normalizeShotCues(parsed.shotCues),
        riskNotes: asStringArray(parsed.riskNotes),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw errors.generationFailed("deepseek script generation timeout", {
          timeoutMs: env.deepseek.timeoutMs,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const deepSeekClient = new DeepSeekClient();
