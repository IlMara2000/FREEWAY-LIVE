/**
 * Freeway Life - Query Client Configuration
 * 
 * Configurazione ottimizzata:
 * - staleTime: evita refetch a ogni mount
 * - gcTime: garbage collection dopo 10 minuti
 * - retry: 1 solo tentativo per errori di rete
 * - refetchOnWindowFocus: disabilitato per performance
 */

import { QueryClient } from '@tanstack/react-query';
import { ACCOUNT_DATA_CHANGED_EVENT } from '@/api/accountDataClient';
import { FOCUS_VIEW_QUERY_KEYS, TASK_VIEW_QUERY_KEYS } from '@/lib/task-workflows';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 30 * 1000,        // 30 secondi prima di considerare stale
			gcTime: 10 * 60 * 1000,       // 10 minuti di garbage collection
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
		},
		mutations: {
			retry: 0,
		},
	},
});

const ENTITY_QUERY_KEYS = {
	Task: TASK_VIEW_QUERY_KEYS,
	FocusSession: FOCUS_VIEW_QUERY_KEYS,
	UserProfile: [['dashboard']],
	Alarm: [['alarms']],
	Note: [['notes'], ['brain-note-tasks']],
	NoteFolder: [['note-folders']],
};

if (typeof window !== 'undefined' && !window.__freewayAccountDataQueryBridge) {
	window.__freewayAccountDataQueryBridge = true;
	window.addEventListener(ACCOUNT_DATA_CHANGED_EVENT, (event) => {
		const queryKeys = ENTITY_QUERY_KEYS[event.detail?.entityName] || [];
		queryKeys.forEach((queryKey) => {
			queryClientInstance.invalidateQueries({ queryKey, refetchType: 'active' });
		});
	});
}