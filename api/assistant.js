import { deviceIdFrom, verifyOwnerToken } from '../lib/firebaseAdmin.js';

const coolingDown = new Map();
const geminiModels = (process.env.GEMINI_MODELS || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-2.5-flash-lite,gemini-3-flash').split(',');
const mistralModels = (process.env.MISTRAL_MODELS || 'ministral-3b-2512,ministral-8b-2512,mistral-small-2603,mistral-medium-latest').split(',');

const SYSTEM = `You are Rhinous, the private, smart, highly capable intelligence layer for Memoir, a personal vault.
Your scope includes all the user's saved memories, passwords, credentials, cards, documents, Wi-Fi, clipboard items, to-do lists, birthdays, reminders, and vault organization.
Be direct, helpful, and intelligent.

CRITICAL INSTRUCTIONS FOR RETRIEVING INFORMATION (LOOKUPS):
1. SPECIFIC FIELD REQUESTS:
   - When the user asks for a SPECIFIC attribute or single field (e.g. "what is my application number in income certificate?", "what is my ACK number?", "what is my reference number on ajsk?", "what is my case reference?", "what is my SBI debit card CVV?", "what is the expiry date of my debit card?", "what is my invoice number?", "what is my document number?", "what is my passport number?", "when is deepti birthday?", "what is my wifi password?", "what is my EPFO password?"):
     - Return kind: "lookup".
     - Under "matches", set "id" to the matching item ID, and under "fields" list ONLY the specifically requested field(s) (e.g. ["Document number"], ["Reference number"], ["ACK Number"], ["Application number"], ["CVV"], ["Expiry date"], ["Valid thru"], ["Invoice number"], ["Password"], ["Date"]). Do NOT include other unrelated fields when the user asked for one specific field.
2. BROAD / ALL-DETAILS REQUESTS:
   - When the user asks for the whole item or general details without naming a single specific field (e.g. "what is my SBI details?", "show my SBI debit card", "tell me about Deepti's birthday", "show my wifi details", "what are my reminders?"):
     - Return kind: "lookup".
     - Under "matches", include the item ID and ALL available field names for that record (or leave "fields" empty [] to indicate all fields).
3. In your "markdown" response:
   - Write a concise, natural, direct one-sentence introduction (e.g. "Here is your SBI debit card CVV.", "Here are your saved SBI debit card details.", "Here is the date for Deepti’s birthday.").
   - NEVER output raw token syntax like [[PRIVATE_N]] or "(to be displayed on-device)" in the markdown. The user's device resolves and presents decrypted fields automatically.
4. If no record in the vault matches the user's request:
   - Return kind: "general" with a clear, polite explanation (e.g. "I couldn’t find an SBI card in your saved vault memories.").

Use the conversation log to resolve follow-ups such as "only the password", "the other one", or "edit that" without starting over.
Audio memories expose metadata to you. When the user asks to find, play, hear, retrieve, or list a voice memo/audio recording, match the relevant Audio record.

FOR SMART MULTIMODAL CAPTURE (IMAGES, INVOICES, BILLS, RECEIPTS, WARRANTY CARDS, VEHICLE PAPERS, IDS, DOCUMENTS, VOICE MEMOS):
1. When an image or document is provided:
   - Carefully inspect and categorize the document:
     • INVOICE / RECEIPT / BILL / ORDER CONFIRMATION:
       - Type: "Finance" (or "Personal" for consumer appliances/gadgets with warranties).
       - Title: Concise format, e.g. "Amazon · Apple iPhone 15 Pro Invoice", "BESCOM Electricity Bill · August 2026", "Apollo Pharmacy Medicine Bill", "Zomato Receipt", "Airtel Broadband Bill".
       - "Amount": ALWAYS format in Indian Rupees with symbol and currency tag: "₹XX,XXX.XX (INR)" or "₹XX,XXX (INR)".
       - "Invoice Date" / "Purchase Date": Extract the exact transaction date in YYYY-MM-DD format.
       - "Merchant / Vendor": e.g. "Amazon India", "Flipkart", "BESCOM", "Tata Power", "Apple Store", "Swiggy", "Decathlon".
       - "Invoice Number" / "Order ID" / "Bill Number" / "Consumer ID": Extract the exact reference number.
       - "Payment Method": e.g. "UPI / PhonePe", "HDFC Credit Card ending 4092", "Net Banking", "Cash".
       - "Due Date" / "Expiry date": Extract if present (YYYY-MM-DD).
     • WARRANTY CARD / APPLIANCE MANUAL:
       - Type: "Personal"
       - Fields: Brand, Model, Serial Number, Purchase Date (YYYY-MM-DD), Warranty Period, "Expiry date" (YYYY-MM-DD), Customer Support Contact.
     • GOVERNMENT DOCUMENT / VEHICLE PAPERS / ID:
       - Type: "Identity" or "Government Document"
       - Title: e.g. "Indian Passport · Maaz", "Driving License", "Vehicle RC · KA01AB1234", "Car Insurance Policy".
       - Fields: Document Number, Holder Name, Issued Date (YYYY-MM-DD), "Expiry date" (YYYY-MM-DD), Vehicle Reg No, Policy Number.
   - Return an action with op: "create", the extracted type, title, and structured fields.
2. When an audio voice note is provided:
   - Accurately transcribe the spoken voice note word-for-word.
   - If dictating a memory/note: include a field named "Audio Transcript" containing the complete transcript.
   - If dictating a reminder: create a Reminder action with "Due at", "Status": "upcoming", "Repeat", and include "Audio Transcript".

FOR REMINDERS AND TEMPORAL INTELLIGENCE:
- Use type "Reminder" and fields: "Due at" (YYYY-MM-DDTHH:mm format in user local time), "Status" ("upcoming"), "Snoozed" ("No"), "Repeat" ("none"|"daily"|"weekly"|"monthly"|"yearly").
- Consult the UPCOMING DATES list provided in the user time context. Never schedule a new reminder in the past.

FOR TO-DO LISTS:
- Use type "Todo" with fields "Todo items" as a valid JSON array [{"id":"1","text":"item text","done":false,"amount":""}], "Status":"active", "Currency":"INR".

Return ONLY valid JSON in this schema:
{"kind":"lookup"|"general"|"actions"|"refusal","title":"short polished title","markdown":"brief natural answer","matches":[{"id":"exact catalog id","fields":["exact field names"]}],"actions":[{"op":"create"|"update"|"delete","id":"exact catalog id for update/delete","type":"Login|Finance|Identity|Government Document|Personal|Audio|Todo|Birthday|Wi-Fi|Clipboard|Reminder","title":"record title","note":"optional note","fields":{"exact field label":"value or unchanged [[PRIVATE_N]] placeholder"}}]}
Use lookup for saved-vault retrieval, actions for explicit mutations, refusal for off-topic non-vault requests, and general for in-scope conversation or guidance.`;


function safeCatalog(catalog) {
  return (Array.isArray(catalog) ? catalog : []).slice(0, 500).map(item => ({
    id: String(item.id || '').slice(0, 80), type: String(item.type || '').slice(0, 40),
    title: String(item.title || '').slice(0, 160), fieldNames: (Array.isArray(item.fieldNames) ? item.fieldNames : []).slice(0, 50).map(value => String(value).slice(0, 100)),
  }));
}
function safeHistory(history) {
  return (Array.isArray(history) ? history : []).slice(-12).map(entry => ({
    role: entry?.role === 'assistant' ? 'assistant' : 'user', text: String(entry?.text || '').slice(0, 1200),
  })).filter(entry => entry.text.trim());
}
function parseJson(text) {
  const clean = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = clean.indexOf('{'); const end = clean.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Model returned no JSON object');
  return JSON.parse(clean.slice(start, end + 1));
}
function normalize(answer, catalog) {
  const ids = new Map(catalog.map(item => [item.id, item]));
  const matches = (Array.isArray(answer.matches) ? answer.matches : []).map(match => {
    const item = ids.get(String(match.id)); if (!item) return null;
    const allowed = new Map(item.fieldNames.map(field => [field.toLowerCase(), field]));
    let fields = (Array.isArray(match.fields) ? match.fields : []).map(field => allowed.get(String(field).toLowerCase())).filter(Boolean);
    if (!fields.length) {
      fields = item.fieldNames;
    }
    return { id: item.id, fields };
  }).filter(Boolean);
  const allowedTypes = new Set(['Login', 'Finance', 'Identity', 'Government Document', 'Personal', 'Audio', 'Todo', 'Birthday', 'Wi-Fi', 'Clipboard', 'Reminder']);
  const actions = (Array.isArray(answer.actions) ? answer.actions : []).slice(0, 20).map(raw => {
    const op = ['create', 'update', 'delete'].includes(raw?.op) ? raw.op : '';
    const id = String(raw?.id || '').slice(0, 80);
    if (!op || ((op === 'update' || op === 'delete') && !ids.has(id))) return null;
    const type = allowedTypes.has(String(raw?.type)) ? String(raw.type) : (ids.get(id)?.type || 'Personal');
    const fields = Object.fromEntries(Object.entries(raw?.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields) ? raw.fields : {}).slice(0, 50).map(([label, value]) => {
      const safeLabel = String(label).slice(0, 100);
      const safeValue = type === 'Todo' && safeLabel === 'Todo items' && Array.isArray(value) ? JSON.stringify(value) : String(value);
      return [safeLabel, safeValue.slice(0, 4000)];
    }).filter(([label]) => label));
    const sensitive = /password|passcode|pin|cvv|security code|card number|account number/i;
    Object.entries(fields).forEach(([label, value]) => { if (sensitive.test(label) && value && !/\[\[PRIVATE_\d+\]\]/.test(value)) delete fields[label]; });
    return { op, id: op === 'create' ? '' : id, type, title: String(raw?.title || ids.get(id)?.title || '').slice(0, 160), note: String(raw?.note || '').slice(0, 2000), fields };
  }).filter(Boolean);
  const requestedKind = String(answer.kind || '');
  const kind = requestedKind === 'lookup' && matches.length ? 'lookup' : requestedKind === 'actions' && actions.length ? 'actions' : requestedKind === 'refusal' ? 'refusal' : (matches.length ? 'lookup' : 'general');
  let cleanMarkdown = String(answer.markdown || '').replace(/\[\[PRIVATE_\d+\]\]/g, '').replace(/\(to be displayed [^)]+\)/gi, '').trim();
  return { kind, title: String(answer.title || 'Rhinous').slice(0, 100), markdown: cleanMarkdown.slice(0, 8000), matches: kind === 'lookup' ? matches : [], actions: kind === 'actions' ? actions : [] };
}

function isClearlyOffTopic(query) {
  const text = String(query || '').toLowerCase();
  const unrelated = /\b(movie|film|director|directed|actor|actress|box office|cricket|football|score|stock price|weather|recipe|restaurant|celebrity|president|prime minister|capital of|quantum physics)\b/;
  const vaultContext = /\b(my|vault|memory|memories|saved|clipboard|birthday|reminder|remind|due|todo|to-do|checklist|shopping|grocery|password|pin|cvv|card|account|credential|wifi|wi-fi|document|passport|epfo|note|remember|rhinous|memoir|warranty|invoice|receipt|bill|appliance|serial|transcript)\b/;
  return unrelated.test(text) && !vaultContext.test(text);
}

async function withFallback(provider, task) {
  const models = provider === 'mistral' ? mistralModels : geminiModels;
  let lastError;
  for (const raw of models) {
    const model = raw.trim(); if (!model || (coolingDown.get(`${provider}:${model}`) || 0) > Date.now()) continue;
    try { return { result: await task(model), model }; }
    catch (error) {
      lastError = error; const status = Number(error?.status || error?.statusCode || 0);
      if ([404, 429, 500, 502, 503, 504].includes(status) || /quota|rate|limit|overload|not found/i.test(error?.message || '')) { coolingDown.set(`${provider}:${model}`, Date.now() + (status === 429 ? 60000 : 15000)); continue; }
      throw error;
    }
  }
  throw lastError || new Error(`No ${provider} model is currently available`);
}

async function callGemini(contents) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured');
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return withFallback('gemini', async model => {
    const response = await client.models.generateContent({
      model,
      contents,
      config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', temperature: 0.15 },
    });
    return response.text;
  });
}

const mistralVisionModels = ['pixtral-12b-2409', 'pixtral-large-latest', 'mistral-small-latest'];
const mistralTextModels = (process.env.MISTRAL_MODELS || 'ministral-8b-latest,mistral-small-latest,ministral-3b-2512,ministral-8b-2512,mistral-small-2603,mistral-medium-latest').split(',');
const mistralTranscriptionModels = (process.env.MISTRAL_TRANSCRIPTION_MODELS || 'voxtral-mini-2602').split(',');

function usableTranscript(value) {
  const text = String(value || '').trim();
  return text.length >= 3 && !/^(?:\[?(?:inaudible|silence|no speech|unintelligible)\]?|\.\.\.)$/i.test(text);
}

async function transcribeAudio(audio) {
  if (!audio?.data || !process.env.MISTRAL_API_KEY) return '';
  const { Mistral } = await import('@mistralai/mistralai');
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const base64 = String(audio.data).replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
  const bytes = Buffer.from(base64, 'base64');
  let lastError;
  for (const rawModel of mistralTranscriptionModels) {
    const model = rawModel.trim();
    if (!model || (coolingDown.get(`transcription:${model}`) || 0) > Date.now()) continue;
    try {
      const result = await client.audio.transcriptions.complete({
        model,
        file: new Blob([bytes], { type: audio.mimeType || 'audio/ogg' }),
        temperature: 0,
      });
      const transcript = String(result?.text || '').trim();
      if (usableTranscript(transcript)) return transcript;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.statusCode || 0);
      if ([404, 429, 500, 502, 503, 504].includes(status) || /quota|rate|limit|overload|not found/i.test(error?.message || '')) {
        coolingDown.set(`transcription:${model}`, Date.now() + (status === 429 ? 60000 : 15000));
        continue;
      }
      break;
    }
  }
  if (lastError) console.warn('Dedicated audio transcription was unavailable:', lastError?.message);
  return '';
}

function voiceMemoFallback(transcript, timezone, now, provider, model = 'audio-safe-fallback') {
  const recorded = new Date(now || Date.now());
  const recordedLabel = recorded.toLocaleString('en-IN', { timeZone: timezone || 'Asia/Calcutta', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const hasTranscript = usableTranscript(transcript);
  return {
    kind: 'actions',
    title: hasTranscript ? 'Voice memo ready' : 'Audio saved without transcript',
    markdown: hasTranscript ? 'I transcribed the recording and prepared it as an audio memory.' : 'The recording was preserved safely, but the speech was not clear enough to produce a reliable transcript.',
    matches: [],
    actions: [{
      op: 'create', id: '', type: 'Audio', title: `Voice Memo · ${recordedLabel}`,
      note: hasTranscript ? transcript : 'Audio saved. No transcript is available because the recording could not be understood clearly.',
      fields: {
        'Recorded at': recorded.toISOString(),
        'Audio Transcript': hasTranscript ? transcript : 'No transcript available',
        'Transcription status': hasTranscript ? 'Completed' : 'Audio only · speech unclear',
      },
    }],
    provider, model, audioTranscript: hasTranscript ? transcript : '', transcriptionStatus: hasTranscript ? 'completed' : 'unavailable',
  };
}

async function callMistral(prompt, images = null) {
  if (!process.env.MISTRAL_API_KEY) throw new Error('Mistral is not configured');
  const { Mistral } = await import('@mistralai/mistralai');
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const allImages = Array.isArray(images) ? images : (images?.data ? [images] : []);
  const models = allImages.length ? mistralVisionModels : mistralTextModels;

  let lastError;
  for (const raw of models) {
    const model = raw.trim();
    if (!model || (coolingDown.get(`mistral:${model}`) || 0) > Date.now()) continue;
    try {
      let content = prompt;
      if (allImages.length) {
        content = [{ type: 'text', text: prompt }];
        allImages.forEach(img => {
          const cleanBase64 = String(img.data || '').replace(/^data:[^;]+;base64,/, '').trim();
          const dataUrl = `data:${img.mimeType || 'image/jpeg'};base64,${cleanBase64}`;
          content.push({ type: 'image_url', imageUrl: dataUrl });
        });
      }
      const response = await client.chat.complete({
        model,
        responseFormat: { type: 'json_object' },
        temperature: 0.15,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content },
        ],
      });
      const text = response.choices?.[0]?.message?.content;
      const parsed = Array.isArray(text) ? text.map(part => part.text || '').join('') : text;
      return { result: parsed, model };
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.statusCode || 0);
      if ([404, 429, 500, 502, 503, 504].includes(status) || /quota|rate|limit|overload|not found/i.test(error?.message || '')) {
        coolingDown.set(`mistral:${model}`, Date.now() + (status === 429 ? 60000 : 15000));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('No Mistral model is currently available');
}

export async function routeQuery({ provider = 'gemini', query, documentText, images, image, audio, catalog, history, timezone = 'Asia/Calcutta', now = new Date().toISOString() }) {
  const allImages = Array.isArray(images) && images.length ? images : (image?.data ? [image] : []);
  const cleanCatalog = safeCatalog(catalog);
  if (!allImages.length && !audio && !documentText && isClearlyOffTopic(query)) return { kind: 'refusal', title: 'Rhinous is vault-only', markdown: 'I’m your private vault assistant. I can help with saved memories, credentials, clipboard items, birthdays, and vault changes—not unrelated general trivia.', matches: [], actions: [], provider, model: 'scope-guard' };
  const cleanHistory = safeHistory(history);
  const audioTranscript = audio?.data ? await transcribeAudio(audio) : '';

  const userTz = timezone || 'Asia/Calcutta';
  const nowObj = new Date(now || Date.now());
  const localDateString = nowObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: userTz,
  });
  const localTimeString = nowObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTz,
  });
  const local24HourTime = nowObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: userTz,
  });
  const localIsoDate = nowObj.toLocaleDateString('en-CA', { timeZone: userTz });

  const upcomingDays = [];
  for (let i = 0; i <= 8; i++) {
    const d = new Date(nowObj.getTime() + i * 24 * 60 * 60 * 1000);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: userTz });
    const isoDate = d.toLocaleDateString('en-CA', { timeZone: userTz });
    const label = i === 0 ? `Today (${weekday})` : i === 1 ? `Tomorrow (${weekday})` : (i === 7 ? `Next ${weekday}` : weekday);
    upcomingDays.push(`- ${label}: ${isoDate}`);
  }

  const promptText = `USER LOCAL TIME & CALENDAR CONTEXT:
- Today's Date: ${localDateString} (${localIsoDate})
- Current Time: ${localTimeString} (24-hour: ${local24HourTime})
- User Timezone: ${userTz}
- UTC Instant: ${nowObj.toISOString()}

UPCOMING DATES FOR ACCURATE SCHEDULING:
${upcomingDays.join('\n')}

PRIVACY-SAFE CONVERSATION LOG:
${JSON.stringify(cleanHistory)}

${documentText ? `LOCALLY EXTRACTED DOCUMENT TEXT (FROM USER DEVICE / PDF PARSER):\n${String(documentText).slice(0, 12000)}\n` : ''}

CURRENT USER REQUEST:
${String(query || (documentText ? 'Extract and structure all details from the parsed document text above' : allImages.length ? `Extract and structure details from ${allImages.length} attached document/image(s)` : audio ? 'Transcribe this voice memo and extract memory or reminder details' : '')).slice(0, 4000)}

${audio?.data ? `AUDIO TRANSCRIPT STATUS: ${usableTranscript(audioTranscript) ? 'completed' : 'unavailable or unclear'}\nAUDIO TRANSCRIPT:\n${usableTranscript(audioTranscript) ? audioTranscript.slice(0, 8000) : 'No reliable transcript was produced. Preserve the audio as an Audio memory without inventing words.'}` : ''}

REDACTED VAULT CATALOG:
${JSON.stringify(cleanCatalog)}`;

  let response;
  let activeProvider = provider;

  const tryGemini = async () => {
    const contents = [promptText];
    allImages.forEach(img => {
      contents.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: String(img.data || '').replace(/^data:[^;]+;base64,/, '').trim(),
        },
      });
    });
    if (audio?.data && !usableTranscript(audioTranscript)) {
      contents.push({
        inlineData: {
          mimeType: audio.mimeType || 'audio/ogg',
          data: String(audio.data).replace(/^data:[^,]*;base64,/i, '').trim(),
        },
      });
    }
    return callGemini(contents);
  };

  const tryMistral = async () => {
    return callMistral(promptText, allImages);
  };

  try {
  if (activeProvider === 'mistral') {
    try {
      response = await tryMistral();
    } catch (e) {
      console.warn('Mistral failed, attempting Gemini fallback:', e?.message);
      try {
        response = await tryGemini();
        activeProvider = 'gemini';
      } catch (geminiError) {
        throw e;
      }
    }
  } else {
    try {
      response = await tryGemini();
      activeProvider = 'gemini';
    } catch (e) {
      console.warn('Gemini failed, attempting Mistral fallback:', e?.message);
      try {
        response = await tryMistral();
        activeProvider = 'mistral';
      } catch (mistralError) {
        throw e;
      }
    }
  }
  } catch (error) {
    if (audio?.data) return voiceMemoFallback(audioTranscript, userTz, now, activeProvider);
    throw error;
  }

  let normalized = normalize(parseJson(response.result), cleanCatalog);
  if (audio?.data) {
    if (normalized.kind !== 'actions' || !normalized.actions.length) return voiceMemoFallback(audioTranscript, userTz, now, activeProvider, response.model);
    const firstCreate = normalized.actions.find(action => action.op === 'create');
    if (firstCreate) {
      firstCreate.type = firstCreate.type === 'Reminder' ? 'Reminder' : 'Audio';
      firstCreate.fields = { ...(firstCreate.fields || {}), 'Audio Transcript': usableTranscript(audioTranscript) ? audioTranscript : (firstCreate.fields?.['Audio Transcript'] || 'No transcript available'), 'Transcription status': usableTranscript(audioTranscript) ? 'Completed' : 'Audio only · speech unclear' };
    }
  }
  return { ...normalized, provider: activeProvider, model: response.model, ...(audio?.data ? { audioTranscript: usableTranscript(audioTranscript) ? audioTranscript : '', transcriptionStatus: usableTranscript(audioTranscript) ? 'completed' : 'unavailable' } : {}) };
}


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing identity token' });
    await verifyOwnerToken(token, deviceIdFrom(req));
    const body = req.body || {};
    if (!String(body.query || '').trim() && !body.image && !body.audio && !body.images?.length && !body.documentText) {
      return res.status(400).json({ error: 'A query, document, image, or audio input is required' });
    }
    const answer = await routeQuery(body);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(answer);
  } catch (error) {
    console.error('Assistant request failed:', error?.message);
    return res.status(Number(error?.status || 502)).json({ error: 'The selected assistant is temporarily unavailable.' });
  }
}
