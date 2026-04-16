import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { taskTitle } = await req.json();

    if (!taskTitle) {
      return NextResponse.json({ error: 'Nessun titolo fornito' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key mancante su Vercel' }, { status: 500 });
    }

    // Chiamata all'API ultra-veloce di Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modello super veloce ed efficiente
        response_format: { type: 'json_object' }, // Costringiamo Groq a rispondere in JSON pulito
        messages: [
          {
            role: 'system',
            content: `Sei un assistente specializzato in ADHD. Il tuo scopo è combattere la "paralisi esecutiva". 
            L'utente ti darà un'attività da fare. Tu devi spezzarla in massimo 3 o 4 micro-step elementari, specifici e facilissimi da iniziare (zero frizione mentale).
            DEVI rispondere ESCLUSIVAMENTE con un oggetto JSON valido in questo formato: {"steps": ["micro-step 1", "micro-step 2", "micro-step 3"]}.
            Nessun altro testo, solo il JSON.`
          },
          {
            role: 'user',
            content: `Dividi questo task: ${taskTitle}`
          }
        ],
        temperature: 0.3, // Temperatura bassa per risposte precise e non troppo creative
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore da Groq:", data);
      return NextResponse.json({ error: 'Errore durante la divisione del task' }, { status: 500 });
    }

    // Estraiamo la risposta JSON di Groq
    const groqResponse = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ steps: groqResponse.steps });

  } catch (error) {
    console.error('Errore API Slicer:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}