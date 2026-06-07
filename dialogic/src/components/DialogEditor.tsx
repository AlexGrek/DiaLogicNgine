import React, { useState, useCallback, useRef } from "react";
import Dialog, { DialogWindow, createDialog } from "../game/Dialog";
import PushMessageIcon from "@rsuite/icons/PushMessage";
import CreativeIcon from "@rsuite/icons/Creative";
import GraphIcon from "@rsuite/icons/Branch";
import { Button, Panel, Placeholder } from "rsuite";
import WindowEditor from "./WindowEditor";
import CreateWindowButton from "./CreateWindowButton";
import { IUpds } from "../App";
import DialogWindowEditDrawer from "./DialogWindowEditDrawer";
import { GameDescription } from "../game/GameDescription";
import "./dialog.css";
import ChainEditor from "./chain/ChainEditor";
import AiGenerateModal from "./ai/AiGenerateDrawer";

const DialogGraphView = React.lazy(() => import("./DialogGraphView"));

export interface DialogHandlers {
    createDialogWindowHandler: (window: DialogWindow) => void;
    openAnotherWindowHandler: (window: DialogWindow) => void;
    windowChosenHandler: (window: DialogWindow) => void;
    closeWindowEditorHandler: () => void;
}

export interface IDialogEditorProps {
  dialog?: Dialog;
  handlers: IUpds;
  game: GameDescription;
}

const DialogEditor: React.FC<IDialogEditorProps> = ({
  dialog,
  handlers,
  game,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<DialogWindow | undefined>(
    undefined
  );
  const [chainOpen, setChainOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const itemRef = useRef<HTMLDivElement>(null);

  const createDialogWindowHandler = useCallback(
    (newWindow: DialogWindow) => {
      if (!dialog) return;
      const updatedWinList = dialog.windows.concat(newWindow);
      handlers.handleDialogEdit({ ...dialog, windows: updatedWinList });
      if (itemRef.current) {
        itemRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    },
    [dialog, handlers]
  );

  const addMultipleDialogWindowsHandler = useCallback(
    (newWindows: DialogWindow[]) => {
      if (!dialog) return;
      const updatedWinList = dialog.windows.concat(newWindows);
      handlers.handleDialogEdit({ ...dialog, windows: updatedWinList });
      if (itemRef.current) {
        itemRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    },
    [dialog, handlers]
  );

  const windowChosenHandler = useCallback((window: DialogWindow) => {
    setEditingWindow(window);
    setEditorOpen(true);
  }, []);

  const openAnotherWindowHandler = useCallback((window: DialogWindow) => {
    setEditorOpen(false);
    setTimeout(() => {
      setEditingWindow(window);
      setEditorOpen(true);
    }, 300);
  }, []);

  const closeWindowEditorHandler = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const renderWindows = useCallback(
    (windows: DialogWindow[], dlg: Dialog) =>
      windows.map((win) => (
        <WindowEditor
          game={game}
          dialog={dlg}
          window={win}
          key={win.uid}
          handlers={handlers}
          onWindowChosen={() => windowChosenHandler(win)}
        />
      )),
    [game, handlers, windowChosenHandler]
  );

  if (!dialog) {
    return (
      <Panel header="Select dialog in the left panel" shaded>
        <Placeholder.Paragraph />
      </Panel>
    );
  }

  return (
    <div ref={itemRef}>
      <div className="window-editor-tools">
        <CreateWindowButton createHandler={createDialogWindowHandler} />
        <div className="window-editor-tools-actions">
          <Button
            className="dialog-tool-action"
            appearance="subtle"
            startIcon={<PushMessageIcon />}
            onClick={() => setChainOpen(true)}
          >
            Chain
          </Button>
          <Button
            className="dialog-tool-action"
            appearance="subtle"
            startIcon={<CreativeIcon />}
            onClick={() => setAiOpen(true)}
          >
            Generate
          </Button>
          <Button
            className="dialog-tool-action"
            appearance={showGraph ? "primary" : "subtle"}
            startIcon={<GraphIcon />}
            onClick={() => setShowGraph((v) => !v)}
          >
            Graph
          </Button>
        </div>
      </div>
      {showGraph ? (
        <React.Suspense fallback={<div style={{ padding: 16, color: "#888" }}>Loading graph…</div>}>
          <DialogGraphView
            dialog={dialog}
            onWindowClick={(uid) => {
              const win = dialog.windows.find((w) => w.uid === uid);
              if (win) { setShowGraph(false); windowChosenHandler(win); }
            }}
          />
        </React.Suspense>
      ) : (
        <div className="window-editor-windows-container">
          {renderWindows(dialog.windows, dialog)}
        </div>
      )}
      <ChainEditor
        game={game}
        dialog={dialog || createDialog("")}
        visible={chainOpen}
        dialogName={dialog?.name}
        onSetVisible={setChainOpen}
        onApply={addMultipleDialogWindowsHandler}
      />
      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={addMultipleDialogWindowsHandler}
        existingUids={new Set(dialog.windows.map((w) => w.uid))}
      />
      {editingWindow && dialog && (
        <DialogWindowEditDrawer
          dialogHandlers={{
            createDialogWindowHandler,
            windowChosenHandler,
            closeWindowEditorHandler,
            openAnotherWindowHandler,
          }}
          game={game}
          open={editorOpen}
          window={editingWindow}
          dialog={dialog}
          onClose={closeWindowEditorHandler}
          handlers={handlers}
        />
      )}
    </div>
  );
};

export default DialogEditor;
