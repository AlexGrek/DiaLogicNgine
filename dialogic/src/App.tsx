import { useCallback, useMemo, useState } from "react";
import {
  Container,
  Content,
  CustomProvider,
  Footer,
  Header,
  Sidebar,
} from "rsuite";
import "./App.css";

import SidePanel from "./components/SidePanel";
import Dialog, { DialogWindow } from "./game/Dialog";
import {
  GameDescription,
  createDefaultGame,
} from "./game/GameDescription";

import {
  Notification,
  NotificationType,
  NotifyCallback,
} from "./UiNotifications";
import DialogEditor from "./components/DialogEditor";
import SaveLoadMenu from "./components/menuitems/SaveLoadMenu";
import CharEditorTabs from "./components/menuitems/charedit/CharEditorTabs";
import ConfigurationMenu from "./components/menuitems/configuration/ConfigurationMenu";
import LocationMenu from "./components/menuitems/locedit/LocationMenu";
import ScriptEditMenu from "./components/menuitems/scriptedit/ScriptEditMenu";
import Player from "./components/player/Player";
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
import { PointAndClick } from "./game/PointAndClick";

export interface CopiedObject {
  value: any;
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
  copy: (obj: any, typename: string) => void;
  paste: () => CopiedObject | undefined;
  handleGameUpdate: (game: GameDescription) => void;
}

export default function App() {
  const [activeDialog, setActiveDialog] = useState("1");
  const [menu, setMenu] = useState("dialog");
  const [game, setGame] = useState<GameDescription>(createDefaultGame);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [copied, setCopied] = useState<CopiedObject | undefined>(undefined);

  // ==== Handlers ====
  const handleChangeDialog = useCallback((newDialog: string) => {
    setActiveDialog(newDialog);
    setMenu("dialog");
  }, []);

  const handleMenuSwitch = useCallback((newMenu: string) => {
    setMenu(newMenu);
  }, []);

  const handlePaste = useCallback(() => copied, [copied]);

  const handleCopy = useCallback((obj: any, typename: string) => {
    setCopied({ value: lodash.cloneDeep(obj), typename });
  }, []);

  const handleDialogEdit = useCallback(
    (dialog: Dialog) => {
      setGame((prev) => ({
        ...prev,
        dialogs: prev.dialogs.map((d) =>
          d.name === dialog.name ? dialog : d
        ),
      }));
    },
    []
  );

  const handleDialogApplyChange = useCallback(
    (func: DialogWindowListUpdater, dialog_uid: string | null) => {
      setGame((prev) => {
        const uid = dialog_uid ?? activeDialog;
        return {
          ...prev,
          dialogs: prev.dialogs.map((d) =>
            d.name === uid
              ? { ...d, windows: func(d.windows) }
              : d
          ),
        };
      });
    },
    [activeDialog]
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
  }, []);

  const handleLocChange = useCallback((locs: Loc[]) => {
    setGame((prev) => ({ ...prev, locs }));
  }, []);

  const handlePropChange = useCallback((props: Prop[]) => {
    setGame((prev) => ({ ...prev, props }));
  }, []);

  const createProp = useCallback((prop: Prop) => {
    setGame((prev) => ({ ...prev, props: [...prev.props, prop] }));
  }, []);

  const createSituation = useCallback((s: string) => {
    setGame((prev) => ({
      ...prev,
      situations: [...prev.situations, s],
    }));
  }, []);

  const handleNotify = useCallback(
    (type: NotificationType, text: string, header?: string | null) => {
      const notif = new Notification(type, text, header);
      setNotifications((prev) => [...prev, notif]);
    },
    []
  );

  const handleGameUpdate = useCallback((g: GameDescription) => {
    setGame(g);
  }, []);

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

  const chosenDialog = useMemo(
    () => game.dialogs.find((d) => d.name === activeDialog),
    [game, activeDialog]
  );

  const lastNotification = notifications[notifications.length - 1];

  // ==== Content renderer ====
  const renderContent = useCallback(() => (
    <>
      <div style={{ display: menu === "dialog" ? "block" : "none" }}>
        <DialogEditor
          visible={menu === "dialog"}
          game={game}
          handlers={updates}
          dialog={chosenDialog}
        />
      </div>
      <div style={{ display: menu === "player" ? "block" : "none" }}>
        <Player visible={menu === "player"} game={game} handlers={updates} />
      </div>
      <div style={{ display: menu === "saveload" ? "block" : "none" }}>
        <SaveLoadMenu
          visible={menu === "saveload"}
          onNotify={handleNotify}
          onSetGame={setGame}
          currentGame={game}
        />
      </div>
      <div style={{ display: menu === "config" ? "block" : "none" }}>
        <ConfigurationMenu
          visible={menu === "config"}
          handlers={updates}
          onSetGame={setGame}
          game={game}
        />
      </div>
      <div style={{ display: menu === "locs" ? "block" : "none" }}>
        <LocationMenu
          visible={menu === "locs"}
          onSetGame={setGame}
          game={game}
          handlers={updates}
        />
      </div>
      <div style={{ display: menu === "chars" ? "block" : "none" }}>
        <CharEditorTabs
          visible={menu === "chars"}
          onSetGame={setGame}
          game={game}
          handlers={updates}
        />
      </div>
      <div style={{ display: menu === "scripts" ? "block" : "none" }}>
        <ScriptEditMenu
          visible={menu === "scripts"}
          onSetGame={setGame}
          game={game}
          handlers={updates}
        />
      </div>
      <div style={{ display: menu === "facts" ? "block" : "none" }}>
        <FactsObjectivesTabs
          visible={menu === "facts"}
          onSetGame={setGame}
          game={game}
          handlers={updates}
        />
      </div>
      <div style={{ display: menu === "items" ? "block" : "none" }}>
        <ItemsMenu
          visible={menu === "items"}
          items={game.items}
          onSetItems={(items: Item[]) =>
            setGame((prev) => ({ ...prev, items }))
          }
          game={game}
        />
      </div>
      <div style={{ display: menu === "ui" ? "block" : "none" }}>
        <UiElementsMenu
          visible={menu === "ui"}
          ui={game.uiElements}
          onSetUi={(items: GameUiElementDescr) =>
            setGame((prev) => ({ ...prev, uiElements: items }))
          }
          game={game}
        />
      </div>
      <div style={{ display: menu === "pac" ? "block" : "none" }}>
        <PointAncClick
          visible={menu === "pac"}
          items={game.pacWidgets}
          onSetItems={(items: PointAndClick[]) =>
            setGame((prev) => ({ ...prev, pacWidgets: items }))
          }
          game={game}
        />
      </div>
    </>
  ), [menu, game, updates, chosenDialog, handleNotify]);

  return (
    <CustomProvider theme="dark">
      <Container className="root-container">
        <Header className="app-header-container">
          <p className="app-header-text">🇺🇦 DiaLogic Ngine</p>
          <NotificationBar notification={lastNotification} />
        </Header>
        <Container className="root-section">
          <Sidebar className="app-main-sidebar">
            <SidePanel
              game={game}
              activeMenu={menu}
              activeDialog={activeDialog}
              onDialogChange={handleChangeDialog}
              onMenuSwitch={handleMenuSwitch}
              handlers={updates}
            />
          </Sidebar>
          <Content className="content-container">{renderContent()}</Content>
        </Container>
        <Footer>Footer</Footer>
      </Container>
    </CustomProvider>
  );
}
