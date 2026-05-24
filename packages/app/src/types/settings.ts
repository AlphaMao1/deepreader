import type { CustomTheme } from "@/styles/themes";
import type { HighlightColor, HighlightStyle, ViewSettings } from "./book";

export type LibraryViewModeType = "grid" | "list";
export type LibrarySortByType = "title" | "author" | "updated" | "created" | "size" | "format";
export type LibraryCoverFitType = "crop" | "fit";

export interface CloudSyncUserState {
  lastSyncedAt: number;
}

export interface ReadSettings {
  sideBarWidth: string;
  isSideBarPinned: boolean;
  notebookWidth: string;
  isNotebookPinned: boolean;
  autohideCursor: boolean;
  translationProvider: string;
  translateTargetLang: string;

  highlightStyle: HighlightStyle;
  highlightStyles: Record<HighlightStyle, HighlightColor>;
  customThemes: CustomTheme[];
}

export interface SystemSettings {
  version: number;
  tavilyApiKey: string;

  keepLogin: boolean;
  autoUpload: boolean;
  alwaysOnTop: boolean;
  openBookInNewWindow: boolean;
  autoCheckUpdates: boolean;
  screenWakeLock: boolean;
  alwaysShowStatusBar: boolean;
  openLastBooks: boolean;
  lastOpenBooks: string[];
  autoImportBooksOnOpen: boolean;
  telemetryEnabled: boolean;
  libraryViewMode: LibraryViewModeType;
  librarySortBy: LibrarySortByType;
  librarySortAscending: boolean;
  libraryCoverFit: LibraryCoverFitType;

  lastSyncedAtBooks: number;
  lastSyncedAtConfigs: number;
  lastSyncedAtNotes: number;
  cloudSyncEnabled: boolean;
  epubCloudSyncEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastSyncedAtCloud: number;
  cloudSyncStateByUserId: Record<string, CloudSyncUserState>;
  syncIntervalSeconds: number;

  globalReadSettings: ReadSettings;
  globalViewSettings: ViewSettings;
}
