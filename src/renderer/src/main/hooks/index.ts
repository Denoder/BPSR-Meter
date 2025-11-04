/**
 * Main window hooks
 */

export { useDataFetching } from "./useDataFetching";
export { useElectronIntegration } from "./useElectronIntegration";
export { usePlayerRegistry } from "./usePlayerRegistry";
export { useManualGroup } from "./useManualGroup";
export { useTranslations } from "./useTranslations";

export type {
    UseDataFetchingOptions,
    UseDataFetchingReturn,
    PlayerUser,
    SkillData,
    SkillsDataByUser,
} from "./useDataFetching";
export type {
    UseElectronIntegrationOptions,
    UseElectronIntegrationReturn,
} from "./useElectronIntegration";
export type { UsePlayerRegistryReturn } from "./usePlayerRegistry";
export type { UseManualGroupReturn } from "./useManualGroup";
export type { UseTranslationsReturn } from "./useTranslations";
