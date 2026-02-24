import React from "react";
import { useRouter } from "expo-router";
import { copyToClipboard } from "@lightbridge/api-native";
import { ApiKeyFormView } from "../views/api-key-form-view";

export function ApiKeyEditorScreen() {
  const router = useRouter();

  return (
    <ApiKeyFormView
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.navigate("/home");
      }}
      onCopy={copyToClipboard}
    />
  );
}
