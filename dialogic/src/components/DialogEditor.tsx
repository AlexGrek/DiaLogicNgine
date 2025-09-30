import React, { useState, useCallback, useRef, memo } from "react";
import Dialog, { DialogWindow, createDialog } from "../game/Dialog";
import PushMessageIcon from "@rsuite/icons/PushMessage";
import { IconButton, Panel, Placeholder } from "rsuite";
import WindowEditor from "./WindowEditor";
import CreateWindowButton from "./CreateWindowButton";
import { IUpds } from "../App";
import DialogWindowEditDrawer from "./DialogWindowEditDrawer";
import { GameDescription } from "../game/GameDescription";
import "./dialog.css";
import ChainEditor from "./chain/ChainEditor";

export interface IDialogEditorProps {
  dialog?: Dialog;
  handlers: IUpds;
  game: GameDescription;
  visible: boolean;
}

const DialogEditor: React.FC<IDialogEditorProps> = ({
  dialog,
  handlers,
  game,
  visible,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<DialogWindow | undefined>(
    undefined
  );
  const [chainOpen, setChainOpen] = useState(false);

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
      {visible && (
        <div className="window-editor-tools">
          <CreateWindowButton createHandler={createDialogWindowHandler} />
          <IconButton
            icon={<PushMessageIcon />}
            placement="left"
            onClick={() => setChainOpen(true)}
          >
            Chain
          </IconButton>
        </div>
      )}
      <div className="window-editor-windows-container">
        {renderWindows(dialog.windows, dialog)}
      </div>
      <ChainEditor
        game={game}
        dialog={dialog || createDialog("")}
        visible={chainOpen}
        dialogName={dialog?.name}
        onSetVisible={setChainOpen}
        onApply={addMultipleDialogWindowsHandler}
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
