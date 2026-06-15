import { createContext, useContext } from 'react';

type DrawerContextType = {
  openDrawer: () => void;
};

export const DrawerContext = createContext<DrawerContextType>({ openDrawer: () => {} });

export function useDrawer() {
  return useContext(DrawerContext);
}
