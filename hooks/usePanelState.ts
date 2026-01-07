import { useState, useEffect } from 'react';

type PanelState = {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};

const STORAGE_KEY = 'totalimage_panel_state';

export const usePanelState = () => {
  const [state, setState] = useState<PanelState>(() => {
    if (typeof window === 'undefined') {
      return { leftCollapsed: false, rightCollapsed: false };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load panel state from localStorage:', error);
    }
    return { leftCollapsed: false, rightCollapsed: false };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save panel state to localStorage:', error);
    }
  }, [state]);

  const toggleLeft = () => {
    setState((prev) => ({ ...prev, leftCollapsed: !prev.leftCollapsed }));
  };

  const toggleRight = () => {
    setState((prev) => ({ ...prev, rightCollapsed: !prev.rightCollapsed }));
  };

  return {
    leftCollapsed: state.leftCollapsed,
    rightCollapsed: state.rightCollapsed,
    toggleLeft,
    toggleRight,
  };
};
