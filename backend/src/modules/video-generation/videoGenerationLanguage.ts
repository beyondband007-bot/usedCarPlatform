import { errors } from "../../shared/errors";

export type VideoGenerationLanguage = "zh-CN" | "en" | "yue";

export const videoGenerationLanguages: Array<{
  value: VideoGenerationLanguage;
  label: string;
  minimaxLanguageBoost: "Chinese" | "English" | "Chinese,Yue";
}> = [
  {
    value: "zh-CN",
    label: "中文（普通话）",
    minimaxLanguageBoost: "Chinese",
  },
  {
    value: "en",
    label: "英文",
    minimaxLanguageBoost: "English",
  },
  {
    value: "yue",
    label: "粤语",
    minimaxLanguageBoost: "Chinese,Yue",
  },
];

const languageByValue = new Map(
  videoGenerationLanguages.map((language) => [language.value, language]),
);

export const normalizeVideoGenerationLanguage = (
  value: unknown,
): VideoGenerationLanguage => {
  const normalized =
    typeof value === "string" && value.trim() ? value.trim() : "zh-CN";
  if (!languageByValue.has(normalized as VideoGenerationLanguage)) {
    throw errors.invalidParameter("language is not supported", {
      language: normalized,
      supportedLanguages: videoGenerationLanguages.map((item) => item.value),
    });
  }
  return normalized as VideoGenerationLanguage;
};

export const getMinimaxLanguageBoost = (
  language: VideoGenerationLanguage,
) => languageByValue.get(language)!.minimaxLanguageBoost;

export const getVideoGenerationLanguageLabel = (
  language: VideoGenerationLanguage,
) => languageByValue.get(language)!.label;
