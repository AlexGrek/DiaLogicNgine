import FileUploadIcon from '@rsuite/icons/FileUpload';
import React, { ReactNode } from 'react';
import { Button, ButtonProps, IconButton } from 'rsuite';
import { IUpds } from '../../../App';

export type CopyButtonStyle = "onlyIcon" | "link"

interface CopyButtonProps {
    handlers: IUpds
    customText?: string
    typename: string
    obj: any
    buttonStyle?: CopyButtonStyle
}

const CopyButton: React.FC<CopyButtonProps> = ({ handlers, customText, obj, typename, buttonStyle }) => {
    const [pressed, setPressed] = React.useState<boolean>(false)

    const press = () => {
        handlers.copy(obj, typename)
        setPressed(true)
        handlers.notify("info", `Copied ${typename}`)
        setTimeout(() => {
            setPressed(false)
        }, 1000)
    }

    const genSpecificButton = (style: CopyButtonStyle) => {
        if (style === "onlyIcon") {
            return <Button disabled={pressed} onClick={() => press()}><FileUploadIcon />{customText || ""}</Button>
        }
        if (style === "link") {
            return <Button disabled={pressed} appearance='link' onClick={() => press()}>{customText || "copy"}</Button>
        }
        return <Button disabled={pressed} onClick={() => press()}>{customText || "Copy"}</Button>
    }

    return (
        buttonStyle === undefined ?
            <IconButton style={{minWidth: "7em"}} disabled={pressed} onClick={() => press()} icon={<FileUploadIcon />}>{customText || "Copy"}</IconButton>
            : genSpecificButton(buttonStyle)
    );
};

export default CopyButton;
