'use client';

import { useDispatch, useSelector, useStore } from 'react-redux';

// Thin re-exports so components never import react-redux directly —
// one place to change if the store setup ever moves.
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
export const useAppStore = useStore;
