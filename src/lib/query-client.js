import { QueryClient } from '@tanstack/react-query';
import { ACCOUNT_DATA_CHANGED_EVENT } from '@/api/accountDataClient';
import { FOCUS_VIEW_QUERY_KEYS, TASK_VIEW_QUERY_KEYS } from '@/lib/task-workflows';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

const ENTITY_QUERY_KEYS = {
	Task: TASK_VIEW_QUERY_KEYS,
	FocusSession: FOCUS_VIEW_QUERY_KEYS,
	UserProfile: [['dashboard']],
};

if (typeof window !== 'undefined' && !window.__freewayAccountDataQueryBridge) {
	window.__freewayAccountDataQueryBridge = true;
	window.addEventListener(ACCOUNT_DATA_CHANGED_EVENT, (event) => {
		const queryKeys = ENTITY_QUERY_KEYS[event.detail?.entityName] || [];
		queryKeys.forEach((queryKey) => {
			queryClientInstance.invalidateQueries({ queryKey });
		});
	});
}
