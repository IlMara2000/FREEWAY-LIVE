export async function requestTaskDescriptionSuggestion(task) {
  const response = await fetch('/api/groq/task-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || '',
      status: task?.status || '',
      source: task?.source || 'task',
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Groq non e disponibile in questo momento.');
  }

  return payload;
}

export async function requestTaskBreakdown(task) {
  const response = await fetch('/api/groq/task-breakdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task?.title || '',
      description: task?.description || '',
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Groq non e disponibile in questo momento.');
  }

  return payload;
}
