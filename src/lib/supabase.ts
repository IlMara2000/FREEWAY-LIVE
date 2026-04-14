// Questo è un finto database temporaneo per non far crashare l'app
// Lo sostituiremo con quello vero nel prossimo passaggio!
export const supabase = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) })
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
  } as any;