import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import https from "node:https";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";

type CodeScene = "login" | "reset";

interface CodeRecord {
  hash: string;
  salt: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const SEND_INTERVAL_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const codeRecords = new Map<string, CodeRecord>();

const sha256Hex = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value, "utf8").digest();

const hmacHex = (key: string | Buffer, value: string) =>
  createHmac("sha256", key).update(value, "utf8").digest("hex");

const codeStoreKey = (scene: CodeScene, phone: string) => `sms-${scene}:${phone}`;

const hashCode = (scene: CodeScene, phone: string, code: string, salt: string) =>
  sha256Hex(`${salt}:sms-${scene}:${phone}:${code}`);

const getSmsTemplateParamSet = (code: string) => {
  if (env.verification.smsTemplateParamMode === "code") return [code];
  return [code, String(env.verification.smsCodeExpireMinutes)];
};

const callTencentCloud = (options: {
  service: string;
  host: string;
  version: string;
  action: string;
  payload: Record<string, unknown>;
}) => {
  const body = JSON.stringify(options.payload);
  const algorithm = "TC3-HMAC-SHA256";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const hashedRequestPayload = sha256Hex(body);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${options.host}\nx-tc-action:${options.action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join("\n");
  const credentialScope = `${date}/${options.service}/tc3_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const secretDate = hmac(`TC3${env.verification.tencentSecretKey}`, date);
  const secretService = hmac(secretDate, options.service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmacHex(secretSigning, stringToSign);
  const authorization = `${algorithm} Credential=${env.verification.tencentSecretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise<unknown>((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        host: options.host,
        path: "/",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json; charset=utf-8",
          Host: options.host,
          "X-TC-Action": options.action,
          "X-TC-Timestamp": String(timestamp),
          "X-TC-Version": options.version,
          "X-TC-Region": env.verification.tencentRegion,
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = null;
          }

          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(parsed?.Response?.Error?.Message || data || "腾讯云接口请求失败。"));
            return;
          }

          if (parsed?.Response?.Error) {
            reject(new Error(parsed.Response.Error.Message || "腾讯云接口请求失败。"));
            return;
          }

          resolve(parsed || data);
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
};

const sendVerificationSms = async (phone: string, code: string, scene: CodeScene) => {
  const templateId =
    scene === "reset"
      ? env.verification.smsReviseTemplateId
      : env.verification.smsLoginTemplateId;

  if (env.verification.smsDryRun) {
    return;
  }

  if (
    !env.verification.tencentSecretId ||
    !env.verification.tencentSecretKey ||
    !env.verification.smsSdkAppId ||
    !templateId ||
    !env.verification.smsSignName
  ) {
    throw errors.invalidParameter("短信服务未配置完整，请检查腾讯云短信环境变量。");
  }

  const response: any = await callTencentCloud({
    service: "sms",
    host: "sms.tencentcloudapi.com",
    version: "2021-01-11",
    action: "SendSms",
    payload: {
      PhoneNumberSet: [phone],
      SmsSdkAppId: env.verification.smsSdkAppId,
      SignName: env.verification.smsSignName,
      TemplateId: templateId,
      TemplateParamSet: getSmsTemplateParamSet(code),
    },
  });

  const status = response?.Response?.SendStatusSet?.[0];
  if (status?.Code && status.Code !== "Ok") {
    throw new Error(status.Message || status.Code);
  }
};

export const normalizePhone = (phone: unknown) => {
  const value = String(phone || "").trim().replace(/[\s-]/g, "");
  if (/^\+?[1-9]\d{5,14}$/.test(value) && value.startsWith("+")) return value;
  if (/^1\d{10}$/.test(value)) return `+86${value}`;
  if (/^86(1\d{10})$/.test(value)) return `+${value}`;
  return "";
};

export const toLocalChinaPhone = (phone: string) => {
  if (phone.startsWith("+86") && /^1\d{10}$/.test(phone.slice(3))) return phone.slice(3);
  return phone;
};

export const verificationService = {
  async sendSmsCode(input: {
    phone?: unknown;
    scene: CodeScene;
  }) {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw errors.invalidParameter("请输入有效的手机号。");
    }

    const storeKey = codeStoreKey(input.scene, phone);
    const existing = codeRecords.get(storeKey);
    if (existing && Date.now() - existing.sentAt < SEND_INTERVAL_MS) {
      const waitSeconds = Math.ceil((SEND_INTERVAL_MS - (Date.now() - existing.sentAt)) / 1000);
      throw errors.invalidParameter(`请在 ${waitSeconds} 秒后再获取验证码。`);
    }

    const code = String(randomInt(100000, 1000000));
    await sendVerificationSms(phone, code, input.scene);

    const salt = randomBytes(16).toString("hex");
    codeRecords.set(storeKey, {
      hash: hashCode(input.scene, phone, code, salt),
      salt,
      expiresAt: Date.now() + CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0,
    });

    return {
      success: true,
      message: "短信验证码已发送。",
      debugCode: env.verification.smsDryRun ? code : undefined,
    };
  },

  verifySmsCode(scene: CodeScene, phoneInput: unknown, codeInput: unknown) {
    const phone = normalizePhone(phoneInput);
    const code = typeof codeInput === "string" || typeof codeInput === "number" ? String(codeInput).trim() : "";

    if (!phone || !/^\d{6}$/.test(code)) {
      throw errors.invalidParameter("请输入手机号和 6 位验证码。");
    }

    const storeKey = codeStoreKey(scene, phone);
    const saved = codeRecords.get(storeKey);
    if (!saved) {
      throw errors.invalidParameter("请先获取验证码。");
    }

    if (Date.now() > saved.expiresAt) {
      codeRecords.delete(storeKey);
      throw errors.invalidParameter("验证码已过期，请重新获取。");
    }

    if (saved.attempts >= MAX_ATTEMPTS) {
      codeRecords.delete(storeKey);
      throw errors.invalidParameter("验证码错误次数过多，请重新获取。");
    }

    saved.attempts += 1;
    if (hashCode(scene, phone, code, saved.salt) !== saved.hash) {
      throw errors.invalidParameter("验证码不正确。");
    }

    codeRecords.delete(storeKey);
    return phone;
  },
};
