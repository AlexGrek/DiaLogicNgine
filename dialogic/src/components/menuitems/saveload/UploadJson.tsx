import React, { ChangeEvent } from 'react';

interface UploadJsonProps {
  onUpload: (fileContents: string) => void;
}

const UploadJson: React.FC<UploadJsonProps> = ({ onUpload }) => {
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
    
        if (files && files.length > 0) {
          const selectedFile = files[0];
          const fileContents = await readFileContents(selectedFile);
          onUpload(fileContents);
        }
      };
    
      const readFileContents = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
    
          reader.onload = (event) => {
            if (event.target) {
              const contents = event.target.result as string;
              resolve(contents);
            }
          };
    
          reader.onerror = (error) => {
            reject(error);
          };
    
          reader.readAsText(file);
        });
      };

  return (
      <input type="file" placeholder='Upload JSON' onChange={handleFileChange} />
  );
};

export default UploadJson;