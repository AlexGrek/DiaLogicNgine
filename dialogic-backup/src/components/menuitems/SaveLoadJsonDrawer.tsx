import React, { useState, useEffect, useRef } from 'react';
import { GameDescription } from '../../game/GameDescription';
import beautify from 'json-beautify-fix';
import { Button, Drawer, Input } from 'rsuite';
import copy from 'copy-to-clipboard';
import { NotifyCallback } from '../../UiNotifications';


interface SaveLoadJsonDrawerProps {
  gameInput: GameDescription;
  visible: boolean;
  onClose: Function;
  onJsonLoad: (json: string) => void;
}

const SaveLoadJsonDrawer: React.FC<SaveLoadJsonDrawerProps> = ({ gameInput, visible, onClose, onJsonLoad }) => {
  const [game, setGame] = useState<GameDescription>(gameInput);
  const [text, setText] = useState<string>("");
  const txtInput = useRef<any>(null);

  useEffect(() => {
    setGame(gameInput);
    if (visible) {
      let text = beautify(gameInput, null, 2, 200)
      console.warn(`Result of transcoding ${gameInput} into json:`)
      console.warn(text)
      setText(text)
      if (txtInput.current) {
        txtInput.current.focus();
      }
    }
  }, [gameInput, visible]);

  return (
    <Drawer size='full' placement='top' open={visible} onClose={() => onClose()}>
      <Drawer.Header>
        <Drawer.Title>JSON import and export</Drawer.Title>
        <Drawer.Actions>
          <Button onClick={() => onClose()}>Close</Button>
          <Button onClick={() => onJsonLoad(text)} appearance="primary">
            Import JSON
          </Button>
        </Drawer.Actions>
      </Drawer.Header>
      <Drawer.Body>
        <Input as="textarea" value={text} ref={txtInput} onChange={setText} rows={28}></Input>
        <Button color="blue" appearance="ghost" onClick={() => copy(text)}>
          Copy to clipboard
        </Button>
      </Drawer.Body>
    </Drawer>
  );
};

export default SaveLoadJsonDrawer;
