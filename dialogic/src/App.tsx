import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Container,
  Content,
  CustomProvider,
  Header,
  Sidebar,
} from "rsuite";
import {
  Outlet,
  Route,
  Routes,
  useOutletContext,
  useParams,
} from "react-router-dom";
import "./App.css";

import SidePanel from "./components/SidePanel";
import Dialog, { DialogWindow } from "./game/Dialog";
import { GameDescription, createDefaultGame } from "./game/GameDescription";
import { Notification, NotificationType, NotifyCallback } from "./UiNotifications";
import DialogEditor from "./components/DialogEditor";
import SaveLoadMenu from "./components/menuitems/SaveLoadMenu";
import CharEditorTabs from "./components/menuitems/charedit/CharEditorTabs";
import ConfigurationMenu from "./components/menuitems/configuration/ConfigurationMenu";
import LocationMenu from "./components/menuitems/locedit/LocationMenu";
import ScriptEditMenu from "./components/menuitems/scriptedit/ScriptEditMenu";
import Player from "./components/player/Player";
import PlayerV2 from "./components/player/PlayerV2";
import Loc from "./game/Loc";
import Prop from "./game/Prop";
import FactsObjectivesTabs from "./components/menuitems/factsobjectives/FactsObjectivesTabs";
import ItemsMenu from "./components/menuitems/items/ItemsMenu";
import { Item } from "./game/Items";
import lodash from "lodash";
import NotificationBar from "./components/notification/NotificationBar";
import GameUiElementDescr from "./game/GameUiElementDescr";
import UiElementsMenu from "./components/menuitems/uielements/UiElementsMenu";
import PointAncClick from "./components/menuitems/pointandclick/PointAncClick";
import VisualsMenu from "./components/menuitems/visuals/VisualsMenu";
import { PointAndClick } from "./game/PointAndClick";
import SettingsPanel, { AppSettings, loadSettings, SettingsButton } from "./components/settings/SettingsPanel";
import HomePage from "./components/home/HomePage";
import { ProjectImagesContext } from "./components/common/ProjectImagesContext";

export interface CopiedObject {
  value: unknown;
  typename: string;
}

export interface DialogWindowListUpdater {
  (inputDialogWindows: DialogWindow[]): DialogWindow[];
}

export interface IUpds {
  handleDialogEdit: (dialog: Dialog) => void;
  handleDialogCreate: (dialog: Dialog) => void;
  handleDialogApplyChange: (
    func: DialogWindowListUpdater,
    dialog_uid: string | null
  ) => void;
  handleDialogWindowChange: (
    window: DialogWindow,
    dialog_uid: string | null,
    create?: boolean
  ) => void;
  handleLocChange: (locs: Loc[]) => void;
  handlePropChange: (props: Prop[]) => void;
  createProp: (prop: Prop) => void;
  createSituation: (situation: string) => void;
  notify: NotifyCallback;
  copy: (obj: unknown, typename: string) => void;
  paste: () => CopiedObject | undefined;
  handleGameUpdate: (game: GameDescription) => void;
}

export type AppOutletContext = {
  game: GameDescription;
  updates: IUpds;
  setGame: React.Dispatch<React.SetStateAction<GameDescription>>;
  handleNotify: NotifyCallback;
  setActiveDialog: (id: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
};

// ---- Route components ----

function DialogRoute() {
  const { dialogId } = useParams<{ dialogId: string }>();
  const { game, updates, setActiveDialog } = useOutletContext<AppOutletContext>();

  useEffect(() => {
    if (dialogId) setActiveDialog(dialogId);
  }, [dialogId, setActiveDialog]);

  const dialog = useMemo(
    () => game.dialogs.find((d) => d.name === dialogId),
    [game.dialogs, dialogId]
  );

  return <DialogEditor game={game} handlers={updates} dialog={dialog} />;
}

function PlayerRoute() {
  const { game, updates } = useOutletContext<AppOutletContext>();
  return <Player game={game} handlers={updates} />;
}

function PlayerV2Route() {
  const { game, updates } = useOutletContext<AppOutletContext>();
  return <PlayerV2 game={game} handlers={updates} />;
}

function SaveLoadRoute() {
  return <SaveLoadMenu />;
}

function ConfigRoute() {
  const { game, updates, setGame } = useOutletContext<AppOutletContext>();
  return (
    <ConfigurationMenu handlers={updates} onSetGame={setGame} game={game} />
  );
}

function VisualsRoute() {
  const { game, setGame } = useOutletContext<AppOutletContext>();
  return <VisualsMenu game={game} onSetGame={setGame} />;
}

function LocsRoute() {
  const { game, updates, setGame } = useOutletContext<AppOutletContext>();
  return <LocationMenu onSetGame={setGame} game={game} handlers={updates} />;
}

function CharsRoute() {
  const { game, updates, setGame } = useOutletContext<AppOutletContext>();
  return (
    <CharEditorTabs onSetGame={setGame} game={game} handlers={updates} />
  );
}

function ScriptsRoute() {
  const { game, updates, setGame } = useOutletContext<AppOutletContext>();
  return (
    <ScriptEditMenu onSetGame={setGame} game={game} handlers={updates} />
  );
}

function FactsRoute() {
  const { game, updates, setGame } = useOutletContext<AppOutletContext>();
  return (
    <FactsObjectivesTabs onSetGame={setGame} game={game} handlers={updates} />
  );
}

function ItemsRoute() {
  const { game, setGame, updates } = useOutletContext<AppOutletContext>();
  return (
    <ItemsMenu
      items={game.items}
      onSetItems={(items: Item[]) =>
        setGame((prev) => ({ ...prev, items }))
      }
      game={game}
      handlers={updates}
    />
  );
}

function UiRoute() {
  const { game, setGame } = useOutletContext<AppOutletContext>();
  return (
    <UiElementsMenu
      ui={game.uiElements}
      onSetUi={(items: GameUiElementDescr) =>
        setGame((prev) => ({ ...prev, uiElements: items }))
      }
      game={game}
    />
  );
}

function PacRoute() {
  const { game, setGame } = useOutletContext<AppOutletContext>();
  return (
    <PointAncClick
      items={game.pacWidgets}
      onSetItems={(items: PointAndClick[]) =>
        setGame((prev) => ({ ...prev, pacWidgets: items }))
      }
      game={game}
    />
  );
}

// ---- Layout ----

interface AppLayoutProps {
  game: GameDescription;
  setGame: React.Dispatch<React.SetStateAction<GameDescription>>;
  projectName: string;
  setProjectName: (name: string) => void;
}

function AppLayout({ game, setGame, projectName, setProjectName }: AppLayoutProps) {
  const [activeDialog, setActiveDialog] = useState("1");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [copied, setCopied] = useState<CopiedObject | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    const gameName = game.general?.name;
    document.title = gameName ? `${gameName} — DiaLogic Ngine` : 'DiaLogic Ngine';
  }, [game.general?.name]);

  const handlePaste = useCallback(() => copied, [copied]);

  const handleCopy = useCallback((obj: unknown, typename: string) => {
    setCopied({ value: lodash.cloneDeep(obj), typename });
  }, []);

  const handleDialogEdit = useCallback((dialog: Dialog) => {
    setGame((prev) => ({
      ...prev,
      dialogs: prev.dialogs.map((d) => (d.name === dialog.name ? dialog : d)),
    }));
  }, [setGame]);

  const handleDialogApplyChange = useCallback(
    (func: DialogWindowListUpdater, dialog_uid: string | null) => {
      setGame((prev) => {
        const uid = dialog_uid ?? activeDialog;
        return {
          ...prev,
          dialogs: prev.dialogs.map((d) =>
            d.name === uid ? { ...d, windows: func(d.windows) } : d
          ),
        };
      });
    },
    [activeDialog, setGame]
  );

  const handleDialogWindowChange = useCallback(
    (window: DialogWindow, dialog_uid: string | null, create?: boolean) => {
      handleDialogApplyChange((lst) => {
        if (create) return [...lst, window];
        return lst.map((w) => (w.uid === window.uid ? window : w));
      }, dialog_uid);
    },
    [handleDialogApplyChange]
  );

  const handleDialogCreate = useCallback((dialog: Dialog) => {
    setGame((prev) => ({ ...prev, dialogs: [...prev.dialogs, dialog] }));
  }, [setGame]);

  const handleLocChange = useCallback((locs: Loc[]) => {
    setGame((prev) => ({ ...prev, locs }));
  }, [setGame]);

  const handlePropChange = useCallback((props: Prop[]) => {
    setGame((prev) => ({ ...prev, props }));
  }, [setGame]);

  const createProp = useCallback((prop: Prop) => {
    setGame((prev) => ({ ...prev, props: [...prev.props, prop] }));
  }, [setGame]);

  const createSituation = useCallback((s: string) => {
    setGame((prev) => ({ ...prev, situations: [...prev.situations, s] }));
  }, [setGame]);

  const handleNotify = useCallback(
    (type: NotificationType, text: string, header?: string | null) => {
      setNotifications((prev) => [...prev, new Notification(type, text, header)]);
    },
    []
  );

  const handleGameUpdate = useCallback((g: GameDescription) => {
    setGame(g);
  }, [setGame]);

  const updates: IUpds = useMemo(
    () => ({
      handleDialogEdit,
      handleDialogCreate,
      handleDialogApplyChange,
      handleDialogWindowChange,
      handleLocChange,
      handlePropChange,
      createProp,
      notify: handleNotify,
      copy: handleCopy,
      paste: handlePaste,
      createSituation,
      handleGameUpdate,
    }),
    [
      handleDialogEdit,
      handleDialogCreate,
      handleDialogApplyChange,
      handleDialogWindowChange,
      handleLocChange,
      handlePropChange,
      createProp,
      handleNotify,
      handleCopy,
      handlePaste,
      createSituation,
      handleGameUpdate,
    ]
  );

  const outletContext: AppOutletContext = useMemo(
    () => ({ game, updates, setGame, handleNotify, setActiveDialog, projectName, setProjectName }),
    [game, updates, setGame, handleNotify, projectName, setProjectName]
  );

  const lastNotification = notifications[notifications.length - 1];

  return (
    <Container className="root-container">
      <Header className="app-header-container">
        <div className="app-header-left">
          <p className="app-header-text">🇺🇦 DiaLogic Ngine</p>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
        <NotificationBar notification={lastNotification} />
      </Header>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={appSettings}
        onSettingsChange={setAppSettings}
      />
      <Container className="root-section">
        <Sidebar className="app-main-sidebar">
          <SidePanel game={game} handlers={updates} />
        </Sidebar>
        <Content className="content-container">
          <ProjectImagesContext.Provider value={projectName}>
            <Outlet context={outletContext} />
          </ProjectImagesContext.Provider>
        </Content>
      </Container>
    </Container>
  );
}

// ---- App (router) ----

export default function App() {
  const [game, setGame] = useState<GameDescription>(createDefaultGame);
  const [projectName, setProjectName] = useState<string>("");

  const handleOpenProject = useCallback((g: GameDescription, name: string) => {
    setGame(g);
    setProjectName(name);
  }, []);

  return (
    <CustomProvider theme="dark">
      <Routes>
        <Route path="/" element={<HomePage onOpenProject={handleOpenProject} />} />
        <Route element={<AppLayout game={game} setGame={setGame} projectName={projectName} setProjectName={setProjectName} />}>
          <Route path="dialog" element={<DialogRoute />} />
          <Route path="dialog/:dialogId" element={<DialogRoute />} />
          <Route path="player" element={<PlayerRoute />} />
          <Route path="playerv2" element={<PlayerV2Route />} />
          <Route path="saveload" element={<SaveLoadRoute />} />
          <Route path="config" element={<ConfigRoute />} />
          <Route path="visuals" element={<VisualsRoute />} />
          <Route path="locs" element={<LocsRoute />} />
          <Route path="chars" element={<CharsRoute />} />
          <Route path="scripts" element={<ScriptsRoute />} />
          <Route path="facts" element={<FactsRoute />} />
          <Route path="items" element={<ItemsRoute />} />
          <Route path="ui" element={<UiRoute />} />
          <Route path="pac" element={<PacRoute />} />
        </Route>
      </Routes>
    </CustomProvider>
  );
}
