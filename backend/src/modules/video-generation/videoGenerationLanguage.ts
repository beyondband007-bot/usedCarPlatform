import { errors } from "../../shared/errors";

export type MinimaxLanguageBoost =
  | "Chinese"
  | "Chinese,Yue"
  | "English"
  | "Arabic"
  | "Russian"
  | "Spanish"
  | "French"
  | "Portuguese"
  | "German"
  | "Turkish"
  | "Dutch"
  | "Ukrainian"
  | "Vietnamese"
  | "Indonesian"
  | "Japanese"
  | "Italian"
  | "Korean"
  | "Thai"
  | "Polish"
  | "Romanian"
  | "Greek"
  | "Czech"
  | "Finnish"
  | "Hindi"
  | "Bulgarian"
  | "Danish"
  | "Hebrew"
  | "Malay"
  | "Persian"
  | "Slovak"
  | "Swedish"
  | "Croatian"
  | "Filipino"
  | "Hungarian"
  | "Norwegian"
  | "Slovenian"
  | "Catalan"
  | "Nynorsk"
  | "Tamil"
  | "Afrikaans";

export type MinimaxTtsLanguageBoost = MinimaxLanguageBoost | "auto";
export type VideoGenerationLanguage = MinimaxLanguageBoost;

export const videoGenerationLanguages: Array<{
  value: VideoGenerationLanguage;
  label: string;
}> = [
  { value: "Chinese", label: "中文（普通话）" },
  { value: "Chinese,Yue", label: "粤语" },
  { value: "English", label: "英语" },
  { value: "Arabic", label: "阿拉伯语" },
  { value: "Russian", label: "俄语" },
  { value: "Spanish", label: "西班牙语" },
  { value: "French", label: "法语" },
  { value: "Portuguese", label: "葡萄牙语" },
  { value: "German", label: "德语" },
  { value: "Turkish", label: "土耳其语" },
  { value: "Dutch", label: "荷兰语" },
  { value: "Ukrainian", label: "乌克兰语" },
  { value: "Vietnamese", label: "越南语" },
  { value: "Indonesian", label: "印尼语" },
  { value: "Japanese", label: "日语" },
  { value: "Italian", label: "意大利语" },
  { value: "Korean", label: "韩语" },
  { value: "Thai", label: "泰语" },
  { value: "Polish", label: "波兰语" },
  { value: "Romanian", label: "罗马尼亚语" },
  { value: "Greek", label: "希腊语" },
  { value: "Czech", label: "捷克语" },
  { value: "Finnish", label: "芬兰语" },
  { value: "Hindi", label: "印地语" },
  { value: "Bulgarian", label: "保加利亚语" },
  { value: "Danish", label: "丹麦语" },
  { value: "Hebrew", label: "希伯来语" },
  { value: "Malay", label: "马来语" },
  { value: "Persian", label: "波斯语" },
  { value: "Slovak", label: "斯洛伐克语" },
  { value: "Swedish", label: "瑞典语" },
  { value: "Croatian", label: "克罗地亚语" },
  { value: "Filipino", label: "菲律宾语" },
  { value: "Hungarian", label: "匈牙利语" },
  { value: "Norwegian", label: "挪威语" },
  { value: "Slovenian", label: "斯洛文尼亚语" },
  { value: "Catalan", label: "加泰罗尼亚语" },
  { value: "Nynorsk", label: "新挪威语" },
  { value: "Tamil", label: "泰米尔语" },
  { value: "Afrikaans", label: "南非荷兰语" },
];

export const minimaxLanguageOptions = videoGenerationLanguages;

const languageByValue = new Map(
  videoGenerationLanguages.map((language) => [language.value, language]),
);

export const normalizeVideoGenerationLanguage = (
  value: unknown,
): VideoGenerationLanguage => {
  const normalized =
    typeof value === "string" && value.trim() ? value.trim() : "Chinese";
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
) => language;

export const getVideoGenerationLanguageLabel = (
  language: VideoGenerationLanguage,
) => languageByValue.get(language)!.label;

export const getVideoGenerationScriptLengthRule = (
  language: VideoGenerationLanguage,
) => {
  if (["Chinese", "Chinese,Yue", "Japanese", "Korean"].includes(language)) {
    return "口播文案约 35-75 个字/字符，必须自然语速控制在 8-15 秒内，宁可偏短，绝不能超过 15 秒。";
  }
  if (
    [
      "English",
      "Russian",
      "Spanish",
      "French",
      "Portuguese",
      "German",
      "Turkish",
      "Dutch",
      "Ukrainian",
      "Italian",
      "Polish",
      "Romanian",
      "Greek",
      "Czech",
      "Finnish",
      "Bulgarian",
      "Danish",
      "Swedish",
      "Croatian",
      "Hungarian",
      "Norwegian",
      "Slovenian",
      "Catalan",
      "Nynorsk",
      "Afrikaans",
    ].includes(language)
  ) {
    return "口播文案约 12-24 个单词，必须自然语速控制在 8-15 秒内，宁可偏短，绝不能超过 15 秒。";
  }
  return "口播文案约 12-24 个词或等效长度，必须自然语速控制在 8-15 秒内，宁可偏短，绝不能超过 15 秒。";
};
