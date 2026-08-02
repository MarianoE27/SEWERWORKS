import { create } from 'zustand';
import { createNetworkSlice, NetworkSlice } from './slices/createNetworkSlice';
import { createUISlice, UISlice } from './slices/createUISlice';
import { createGISSlice, GISSlice } from './slices/createGISSlice';

export type AppState = NetworkSlice & UISlice & GISSlice;

export const useStore = create<AppState>()((...a) => ({
  ...createNetworkSlice(...a),
  ...createUISlice(...a),
  ...createGISSlice(...a),
}));
