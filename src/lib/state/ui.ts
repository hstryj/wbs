import { writable } from 'svelte/store';
import type { TabName } from '../types';
import { persistStore } from './persistence';

export const activeTab = writable<TabName>('table');
persistStore(activeTab, 'wbs_active_tab');
