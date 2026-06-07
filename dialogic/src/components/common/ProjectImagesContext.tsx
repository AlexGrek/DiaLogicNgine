import { createContext, useContext } from 'react';

export const ProjectImagesContext = createContext<string>('');

// eslint-disable-next-line react-refresh/only-export-components
export function useProjectImages(): string {
    return useContext(ProjectImagesContext);
}
