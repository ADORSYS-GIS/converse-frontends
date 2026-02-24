import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  Div,
  Heading,
  Scroll,
  Stack,
  Text,
} from "@lightbridge/ui";
import { getThemeColors } from "../theme/theme-colors";

type PlatformId = "vscode" | "cursor" | "claude" | "intellij";
type ServerId = "brave-search" | "firecrawl" | "browserless" | "context7";

type ServerDefinition = {
  id: ServerId;
  nameKey: string;
  descriptionKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconTone: "warningSoft" | "errorSoft" | "successSoft" | "accentSoft";
  iconColor: "secondary" | "error" | "success" | "accent";
  command: string;
  args: string[];
  env: Record<string, string>;
  type: "stdio" | "sse";
};

type PlatformDefinition = {
  id: PlatformId;
  labelKey: string;
  configTitleKey: string;
  filePath: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconTone: "brand" | "secondary" | "accent" | "surface";
  iconBackground: "primary" | "secondary" | "accent" | "ink";
  iconColor: "surface" | "ink";
};

const serverDefinitions: ServerDefinition[] = [
  {
    id: "brave-search",
    nameKey: "apiKeyBuilder.servers.braveSearch.name",
    descriptionKey: "apiKeyBuilder.servers.braveSearch.description",
    iconName: "search",
    iconTone: "warningSoft",
    iconColor: "secondary",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: "YOUR_API_KEY_HERE" },
    type: "stdio",
  },
  {
    id: "firecrawl",
    nameKey: "apiKeyBuilder.servers.firecrawl.name",
    descriptionKey: "apiKeyBuilder.servers.firecrawl.description",
    iconName: "flame",
    iconTone: "errorSoft",
    iconColor: "error",
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    env: { FC_API_KEY: "YOUR_API_KEY_HERE" },
    type: "stdio",
  },
  {
    id: "browserless",
    nameKey: "apiKeyBuilder.servers.browserless.name",
    descriptionKey: "apiKeyBuilder.servers.browserless.description",
    iconName: "globe",
    iconTone: "successSoft",
    iconColor: "success",
    command: "npx",
    args: ["-y", "@browserless/mcp-server"],
    env: { BLESS_TOKEN: "YOUR_TOKEN_HERE" },
    type: "sse",
  },
  {
    id: "context7",
    nameKey: "apiKeyBuilder.servers.context7.name",
    descriptionKey: "apiKeyBuilder.servers.context7.description",
    iconName: "hardware-chip",
    iconTone: "accentSoft",
    iconColor: "accent",
    command: "npx",
    args: ["-y", "context7-mcp"],
    env: { C7_TOKEN: "YOUR_TOKEN_HERE" },
    type: "stdio",
  },
];

const platformDefinitions: PlatformDefinition[] = [
  {
    id: "vscode",
    labelKey: "apiKeyBuilder.platforms.vscode",
    configTitleKey: "apiKeyBuilder.configCards.vscode",
    filePath: ".vscode/mcp.json",
    iconName: "code-slash",
    iconTone: "brand",
    iconBackground: "primary",
    iconColor: "surface",
  },
  {
    id: "cursor",
    labelKey: "apiKeyBuilder.platforms.cursor",
    configTitleKey: "apiKeyBuilder.configCards.cursor",
    filePath: "~/.cursor/mcp.json",
    iconName: "terminal-outline",
    iconTone: "surface",
    iconBackground: "ink",
    iconColor: "surface",
  },
  {
    id: "claude",
    labelKey: "apiKeyBuilder.platforms.claude",
    configTitleKey: "apiKeyBuilder.configCards.claude",
    filePath: "claude_desktop_config.json",
    iconName: "sparkles",
    iconTone: "secondary",
    iconBackground: "secondary",
    iconColor: "surface",
  },
  {
    id: "intellij",
    labelKey: "apiKeyBuilder.platforms.intellij",
    configTitleKey: "apiKeyBuilder.configCards.intellij",
    filePath: ".idea/mcp.xml",
    iconName: "layers",
    iconTone: "accent",
    iconBackground: "accent",
    iconColor: "surface",
  },
];

const initialSelectedServers: Record<ServerId, boolean> = {
  "brave-search": true,
  firecrawl: true,
  browserless: true,
  context7: true,
};

function buildConfig(
  platform: PlatformId,
  selectedServers: Record<ServerId, boolean>,
) {
  const rootKey = platform === "vscode" ? "servers" : "mcpServers";
  const result: Record<string, unknown> = {};

  for (const server of serverDefinitions) {
    if (!selectedServers[server.id]) {
      continue;
    }

    const entry: Record<string, unknown> = {
      command: server.command,
      args: server.args,
      env: server.env,
    };

    if (platform === "vscode") {
      entry.type = server.type;
    }

    result[server.id] = entry;
  }

  return JSON.stringify({ [rootKey]: result }, null, 2);
}

function getJsonKeyColor(key: string, colors: ReturnType<typeof getThemeColors>) {
  if (key === "servers" || key === "mcpServers") {
    return colors.primary;
  }

  if (/^[A-Z0-9_]+$/.test(key)) {
    return colors.secondary;
  }

  if (key === "command" || key === "args" || key === "env" || key === "type") {
    return colors.accent;
  }

  return colors.success;
}

function renderHighlightedJson(
  jsonText: string,
  colors: ReturnType<typeof getThemeColors>,
) {
  const lines = jsonText.split("\n");

  return lines.map((line, lineIndex) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);

    if (!keyMatch) {
      return (
        <Text
          key={`json-line-${lineIndex}`}
          style={{
            color: colors.ink,
            fontSize: 12,
            lineHeight: 19,
            fontWeight: "500",
            fontFamily: "monospace",
          }}
        >
          {line}
          {lineIndex < lines.length - 1 ? "\n" : ""}
        </Text>
      );
    }

    const [, indent, key, separator, rest] = keyMatch;

    return (
      <Text
        key={`json-line-${lineIndex}`}
        style={{
          color: colors.ink,
          fontSize: 12,
          lineHeight: 19,
          fontWeight: "500",
          fontFamily: "monospace",
        }}
      >
        {indent}
        <Text style={{ color: colors.ink, fontFamily: "monospace" }}>
          {'"'}
        </Text>
        <Text
          style={{
            color: getJsonKeyColor(key, colors),
            fontFamily: "monospace",
          }}
        >
          {key}
        </Text>
        <Text style={{ color: colors.ink, fontFamily: "monospace" }}>
          {'"'}
          {separator}
          {rest}
        </Text>
        {lineIndex < lines.length - 1 ? "\n" : ""}
      </Text>
    );
  });
}

export function ApiKeyFormView({
  onBack,
  onCopy,
}: {
  onBack: () => void;
  onCopy: (value: string) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const colors = useMemo(() => getThemeColors("light"), []);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("vscode");
  const [selectedServers, setSelectedServers] = useState<
    Record<ServerId, boolean>
  >(initialSelectedServers);
  const [configText, setConfigText] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const feedbackResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConfig = useMemo(
    () =>
      platformDefinitions.find((platform) => platform.id === activePlatform) ??
      platformDefinitions[0],
    [activePlatform],
  );

  const generatedConfigText = useMemo(
    () => buildConfig(activePlatform, selectedServers),
    [activePlatform, selectedServers],
  );

  useEffect(() => {
    setConfigText(generatedConfigText);
  }, [generatedConfigText]);

  useEffect(
    () => () => {
      if (feedbackResetTimer.current) {
        clearTimeout(feedbackResetTimer.current);
      }
    },
    [],
  );

  const toggleServer = (serverId: ServerId) => {
    setSelectedServers((previous) => ({
      ...previous,
      [serverId]: !previous[serverId],
    }));
  };

  const handleCopy = async () => {
    try {
      await onCopy(configText);
      setCopyState("copied");

      if (feedbackResetTimer.current) {
        clearTimeout(feedbackResetTimer.current);
      }

      feedbackResetTimer.current = setTimeout(() => {
        setCopyState("idle");
      }, 1800);
    } catch {
      setCopyState("idle");
    }
  };

  return (
    <Div
      tone="muted"
      width="full"
      style={{ flex: 1, backgroundColor: colors.muted }}
    >
      <Div
        tone="surface"
        width="full"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 58,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.surface,
        }}
      >
        <Stack direction="row" align="center" justify="between" width="full">
          <Button
            variant="ghost"
            size="iconSm"
            onPress={onBack}
            accessibilityLabel={t("apiKeyBuilder.back")}
          >
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </Button>

          <Heading
            tone="title"
            style={{ fontSize: 20, color: colors.ink, fontWeight: "700" }}
          >
            {t("apiKeyBuilder.title")}
          </Heading>

          <Div size="iconSm" />
        </Stack>
      </Div>

      <Scroll tone="muted" pad="none" style={{ flex: 1 }}>
        <Div
          width="full"
          style={{
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 140,
            backgroundColor: colors.muted,
          }}
        >
          <Stack gap="lg">
            <Text intent="eyebrow" style={{ letterSpacing: 0.3 }}>
              {t("apiKeyBuilder.sections.servers")}
            </Text>

            <Stack gap="sm" width="full">
              {serverDefinitions.map((server) => {
                const enabled = selectedServers[server.id];
                const iconColor = colors[server.iconColor];

                return (
                  <Card
                    key={server.id}
                    size="sm"
                    accessibilityRole="button"
                    onPress={() => toggleServer(server.id)}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      minHeight: 76,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      shadowColor: colors.ink,
                      shadowOpacity: 0.03,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      align="center"
                      justify="between"
                      width="full"
                    >
                      <Stack
                        direction="row"
                        align="center"
                        gap="sm"
                        width="full"
                        style={{ flex: 1 }}
                      >
                        <Div
                          tone={server.iconTone}
                          rounded="xl"
                          size="iconMd"
                          align="center"
                          justify="center"
                        >
                          <Ionicons
                            name={server.iconName}
                            size={19}
                            color={iconColor}
                          />
                        </Div>

                        <Stack gap="xs" width="full" style={{ flex: 1 }}>
                          <Text intent="bodyStrong">{t(server.nameKey)}</Text>
                          <Text intent="caption">
                            {t(server.descriptionKey)}
                          </Text>
                        </Stack>
                      </Stack>

                      <Div
                        rounded="full"
                        style={{
                          width: 52,
                          height: 30,
                          padding: 3,
                          backgroundColor: enabled
                            ? colors.primary
                            : colors.border,
                        }}
                      >
                        <Div
                          tone="surface"
                          rounded="full"
                          style={{
                            width: 24,
                            height: 24,
                            alignSelf: enabled ? "flex-end" : "flex-start",
                          }}
                        />
                      </Div>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>

            <Div style={{ height: 4 }} />

            <Text intent="eyebrow" style={{ letterSpacing: 0.3 }}>
              {t("apiKeyBuilder.sections.generated")}
            </Text>

            <Div
              tone="muted"
              rounded="xl"
              pad="sm"
              width="full"
              style={{
                borderRadius: 10,
                borderWidth: 0,
                padding: 4,
                backgroundColor: colors.border,
              }}
            >
              <Stack direction="row" width="full" style={{ gap: 4 }}>
                {platformDefinitions.map((platform) => {
                  const active = platform.id === activePlatform;

                  return (
                    <Div
                      key={platform.id}
                      rounded="md"
                      tone={active ? "surface" : "default"}
                      align="center"
                      justify="center"
                      style={{
                        flex: 1,
                        minHeight: 40,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: active ? 1 : 0,
                        borderColor: colors.border,
                        backgroundColor: active ? colors.surface : "transparent",
                      }}
                      accessibilityRole="button"
                      onPress={() => setActivePlatform(platform.id)}
                    >
                      <Text
                        intent={active ? "link" : "caption"}
                        align="center"
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: active ? "700" : "600",
                          color: active ? colors.primary : colors.soft,
                        }}
                      >
                        {t(platform.labelKey)}
                      </Text>
                    </Div>
                  );
                })}
              </Stack>
            </Div>

            <Card
              size="sm"
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                padding: 0,
                backgroundColor: colors.surface,
              }}
            >
              <Div
                tone="muted"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                }}
              >
                <Stack
                  direction="row"
                  align="center"
                  justify="between"
                  width="full"
                >
                  <Stack direction="row" align="center" gap="sm">
                    <Div
                      tone={activeConfig.iconTone}
                      rounded="md"
                      size="iconSm"
                      align="center"
                      justify="center"
                      style={{ backgroundColor: colors[activeConfig.iconBackground] }}
                    >
                      <Ionicons
                        name={activeConfig.iconName}
                        size={14}
                        color={colors[activeConfig.iconColor]}
                      />
                    </Div>
                    <Text intent="bodyStrong">
                      {t(activeConfig.configTitleKey)}
                    </Text>
                  </Stack>

                  <Stack direction="row" align="center" gap="xs">
                    <Div
                      tone="brandSoft"
                      rounded="md"
                      pad="sm"
                      accessibilityRole="button"
                      onPress={async () => {
                        await handleCopy();
                      }}
                      style={{
                        minHeight: 32,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Stack direction="row" align="center" gap="xs">
                        <Ionicons
                          name={copyState === "copied" ? "checkmark" : "copy"}
                          size={14}
                          color={colors.primary}
                        />
                        <Text intent="link" style={{ fontSize: 14 }}>
                          {copyState === "copied"
                            ? t("apiKeyBuilder.copied")
                            : t("apiKeyBuilder.copy")}
                        </Text>
                      </Stack>
                    </Div>
                  </Stack>
                </Stack>
              </Div>

              <Div
                tone="surface"
                style={{ paddingHorizontal: 12, paddingVertical: 12 }}
              >
                <Stack
                  direction="row"
                  align="center"
                  justify="between"
                  width="full"
                >
                  <Stack direction="row" align="center" gap="xs">
                    <Ionicons name="folder" size={14} color={colors.subtle} />
                    <Text intent="caption" style={{ fontSize: 13 }}>
                      {activeConfig.filePath}
                    </Text>
                  </Stack>
                  <Div
                    tone="brandSoft"
                    rounded="sm"
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text intent="link" style={{ fontSize: 12 }}>
                      {t("apiKeyBuilder.json")}
                    </Text>
                  </Div>
                </Stack>

                <Div
                  tone="muted"
                  rounded="xl"
                  style={{
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    backgroundColor: colors.muted,
                    minHeight: 210,
                    borderRadius: 10,
                  }}
                >
                  <Text intent="body" selectable>
                    {renderHighlightedJson(configText, colors)}
                  </Text>
                </Div>
              </Div>
            </Card>
          </Stack>
        </Div>
      </Scroll>
    </Div>
  );
}
