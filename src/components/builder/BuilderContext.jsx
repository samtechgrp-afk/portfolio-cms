import { createContext, useContext } from 'react';

/** Editor-only data the property panel needs: the font library (for font pickers) and the project list (for link pickers). */
export const BuilderContext = createContext({ fonts: [], projects: [], media: { enabled: false }, siteAssets: { enabled: false } });
export const useBuilder = () => useContext(BuilderContext);
