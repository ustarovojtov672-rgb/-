import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  MealAnalysisSchema,
  type MealAnalysisResult,
} from "@/lib/nutrition/meal-analysis";
import { buildNutritionAgentPrompt } from "@/lib/nutrition-agent/prompt";
import { buildNutritionAgentToolPlan } from "@/lib/nutrition-agent/tool-plan";
import type { NutritionAgentInput } from "@/lib/nutrition-agent/types";

type PiImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

type PiTextDeltaEvent = {
  type: "message_update";
  assistantMessageEvent: {
    type: "text_delta";
    delta: string;
  };
};

type PiToolStartEvent = {
  type: "tool_execution_start";
  toolName: string;
};

export async function analyzeMealWithPiNutritionAgent({
  description,
  photoFile,
  profile,
  goal,
  targets,
  previousMeals,
}: NutritionAgentInput): Promise<MealAnalysisResult> {
  const projectDir = process.cwd();
  const agentWorkspace = path.join(projectDir, "Аi агент питания");
  const agentStateDir =
    process.env.PI_NUTRITION_AGENT_DIR ?? path.join(agentWorkspace, ".pi-agent");
  const sessionDir =
    process.env.PI_NUTRITION_AGENT_SESSION_DIR ??
    path.join(agentWorkspace, "sessions");
  const provider = process.env.PI_NUTRITION_AGENT_PROVIDER ?? "openai-codex";
  const modelId = process.env.PI_NUTRITION_AGENT_MODEL ?? "gpt-5.5";

  mkdirSync(agentStateDir, { recursive: true });
  mkdirSync(sessionDir, { recursive: true });

  const {
    AuthStorage,
    createAgentSession,
    DefaultResourceLoader,
    ModelRegistry,
    SessionManager,
    SettingsManager,
  } = await import("@earendil-works/pi-coding-agent");

  const authStorage = AuthStorage.create(path.join(agentStateDir, "auth.json"));
  const modelRegistry = ModelRegistry.create(
    authStorage,
    path.join(agentStateDir, "models.json"),
  );
  const model = modelRegistry.find(provider, modelId);

  if (!model) {
    throw new Error(
      `Pi-модель ${provider}/${modelId} не найдена. Проверь PI_NUTRITION_AGENT_PROVIDER и PI_NUTRITION_AGENT_MODEL.`,
    );
  }

  if (!modelRegistry.hasConfiguredAuth(model)) {
    throw new Error(
      "Pi-агент питания не залогинен. Запусти npm run nutrition-agent:login, затем внутри Pi выполни /login openai-codex.",
    );
  }

  const toolPlan = buildNutritionAgentToolPlan({
    description,
    hasPhoto: photoFile !== null,
    previousMeals,
  });
  const prompt = buildPiPrompt(
    buildNutritionAgentPrompt({
      description,
      profile,
      goal,
      targets,
      previousMeals,
      toolPlan,
      hasPhoto: photoFile !== null,
    }),
  );
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: true, maxRetries: 1 },
  });
  const resourceLoader = new DefaultResourceLoader({
    cwd: projectDir,
    agentDir: agentStateDir,
    settingsManager,
    additionalSkillPaths: [
      path.join(agentWorkspace, "skills", "nutrition-agent"),
      path.join(projectDir, "Аi агент для поиска", "skills", "codex-search"),
    ],
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt:
      "Ты локальный Pi-агент питания внутри приложения. Рассчитывай еду по тексту и фото через память, OCR, штрихкод, локальную базу и codex_search. Отвечай только JSON по контракту приложения.",
  });

  await resourceLoader.reload({
    resolveProjectTrust: async () => true,
  });

  const { session, extensionsResult } = await createAgentSession({
    cwd: projectDir,
    agentDir: agentStateDir,
    authStorage,
    modelRegistry,
    model,
    thinkingLevel: "low",
    tools: ["read", "grep", "find", "ls", "codex_search"],
    resourceLoader,
    sessionManager: SessionManager.create(projectDir, sessionDir),
    settingsManager,
  });
  let assistantText = "";
  const usedToolNames = new Set<string>();
  const unsubscribe = session.subscribe((event) => {
    if (isPiTextDeltaEvent(event)) {
      assistantText += event.assistantMessageEvent.delta;
      return;
    }

    if (isPiToolStartEvent(event)) {
      usedToolNames.add(event.toolName);
    }
  });

  try {
    if (extensionsResult.errors.length > 0) {
      throw new Error(
        `Pi extensions не загрузились: ${extensionsResult.errors
          .map((error) => error.path)
          .join(", ")}`,
      );
    }

    await session.bindExtensions({});
    await session.prompt(`/skill:nutrition-agent ${prompt}`, {
      images: photoFile ? [await fileToPiImageContent(photoFile)] : undefined,
    });

    const parsed = parsePiJson(assistantText);
    const result = MealAnalysisSchema.parse(parsed);

    return {
      ...result,
      usedTools: mergePiToolEvidence(result.usedTools, usedToolNames),
    };
  } finally {
    unsubscribe();
    session.dispose();
  }
}

function buildPiPrompt(prompt: string) {
  return [
    prompt,
    "",
    "Контракт JSON:",
    JSON.stringify(MealAnalysisSchema.toJSONSchema()),
  ].join("\n");
}

async function fileToPiImageContent(file: File): Promise<PiImageContent> {
  const bytes = Buffer.from(await file.arrayBuffer());

  return {
    type: "image",
    data: bytes.toString("base64"),
    mimeType: file.type,
  };
}

function parsePiJson(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Pi-агент питания не вернул ответ.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Pi-агент питания вернул ответ без JSON.");
    }

    return JSON.parse(match[0]);
  }
}

function mergePiToolEvidence(
  declaredTools: MealAnalysisResult["usedTools"],
  usedToolNames: Set<string>,
) {
  const tools = new Set(declaredTools);

  if (usedToolNames.has("codex_search")) {
    tools.add("web_search");
  }

  if (
    usedToolNames.has("read") ||
    usedToolNames.has("grep") ||
    usedToolNames.has("find") ||
    usedToolNames.has("ls")
  ) {
    tools.add("local_database");
  }

  return Array.from(tools).slice(0, 8);
}

function isPiTextDeltaEvent(event: unknown): event is PiTextDeltaEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    event.type === "message_update" &&
    "assistantMessageEvent" in event &&
    typeof event.assistantMessageEvent === "object" &&
    event.assistantMessageEvent !== null &&
    "type" in event.assistantMessageEvent &&
    event.assistantMessageEvent.type === "text_delta" &&
    "delta" in event.assistantMessageEvent &&
    typeof event.assistantMessageEvent.delta === "string"
  );
}

function isPiToolStartEvent(event: unknown): event is PiToolStartEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    event.type === "tool_execution_start" &&
    "toolName" in event &&
    typeof event.toolName === "string"
  );
}
