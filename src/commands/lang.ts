import inquirer from "inquirer";
import { readConfig, writeConfig } from "../config";
import { CliArguments, CommandContext, CommandResult } from "../types";
import {
  createTranslator,
  getLanguageDisplayName,
  isSupportedLanguage,
  supportedLanguages,
  type Language,
} from "../i18n";

export async function runLang(
  args: CliArguments,
  context: CommandContext
): Promise<CommandResult> {
  const { t } = context;
  const config = readConfig();
  const currentLanguage = config.language;

  let targetLanguage: Language | undefined;
  const [providedLanguage] = args.positional;
  if (providedLanguage) {
    if (!isSupportedLanguage(providedLanguage)) {
      context.logger.error(
        t("lang.invalid", {
          input: providedLanguage,
          supported: supportedLanguages.join(", "),
        })
      );
      return { code: 1 };
    }
    targetLanguage = providedLanguage;
  } else {
    const choices = supportedLanguages.map((language) => {
      const displayName = getLanguageDisplayName(language, t);
      const label = `${displayName} (${language})`;
      const suffix =
        language === currentLanguage ? ` ${t("lang.choiceCurrent")}` : "";
      return {
        name: `${label}${suffix}`,
        value: language,
      };
    });

    const { selectedLanguage } = await inquirer.prompt<{
      selectedLanguage: Language;
    }>([
      {
        type: "list",
        name: "selectedLanguage",
        message: t("lang.prompt"),
        choices,
        default: currentLanguage,
      },
    ]);

    targetLanguage = selectedLanguage;
  }

  if (targetLanguage === currentLanguage) {
    context.logger.info(
      t("lang.already", {
        language: getLanguageDisplayName(currentLanguage, t),
      })
    );
    return { code: 0 };
  }

  writeConfig({ ...config, language: targetLanguage });

  const updatedTranslator = createTranslator(targetLanguage);
  context.logger.info(
    updatedTranslator("lang.updated", {
      language: getLanguageDisplayName(targetLanguage, updatedTranslator),
    })
  );

  return { code: 0 };
}
