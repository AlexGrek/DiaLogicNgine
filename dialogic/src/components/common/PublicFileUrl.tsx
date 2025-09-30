import React, { useState, useEffect } from 'react';
import { InputPicker, SelectPicker } from 'rsuite';

interface PublicFileUrlProps {
    extensions: string[];
    value?: string;
    onChange: (val: string | null) => void;
    requestUrl?: string
}

export const IMAGES = ["jpeg", "jpg", "png", "bmp", "webp", "gif", "svg", "tiff"]

const PublicFileUrl: React.FC<PublicFileUrlProps> = ({ extensions, value, onChange, requestUrl }) => {
    const [ext, setExt] = useState<string[]>(extensions);
    const [data, setData] = useState<string[]>([]);
    useEffect(() => {
        setExt(extensions);
        // uncomment to use http requests instead of static file
        fetch(requestUrl || "game_assets/list.json").then(
            res => res.json()
        ).then(
            json => {
                setData(json)
            }
        )
    }, [extensions, requestUrl]);

    const convertListToView = (values_list: string[]) => {
        return values_list.filter(
            item => {
                if (ext.some(e => item.endsWith(e))) {
                    return true;
                }
                // return true if [ext] is empty, to pass anything
                return ext.length === 0
            }
        ).map(
            item => ({
                label: item,
                value: item
            })
        );
    }

    return (
        <SelectPicker className='public-file-url' style={{ display: "block"}} data={convertListToView(data)} onChange={onChange} value={value}>
        </SelectPicker>
    );
};

export default PublicFileUrl;
