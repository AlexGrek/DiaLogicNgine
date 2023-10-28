import React from 'react';
import { IconButton } from 'rsuite';
import FileDownloadIcon from '@rsuite/icons/FileDownload';

interface DownloadAsJsonProps {
  data: object;
  filename: string;
}

const DownloadAsJson: React.FC<DownloadAsJsonProps> = ({ data, filename }) => {
  const handleDownload = () => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <IconButton icon={<FileDownloadIcon/>} onClick={handleDownload}>
      Download JSON
    </IconButton>
  );
};

export default DownloadAsJson;