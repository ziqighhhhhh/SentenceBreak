let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceLoadPromise: Promise<SpeechSynthesisVoice | null> | null = null;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'en-US') ?? voices.find(v => v.lang.startsWith('en')) ?? null;
}

function loadEnglishVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice) return Promise.resolve(cachedVoice);
  if (voiceLoadPromise) return voiceLoadPromise;

  voiceLoadPromise = new Promise((resolve) => {
    const voice = pickEnglishVoice();
    if (voice) { cachedVoice = voice; resolve(voice); return; }

    speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoice = pickEnglishVoice();
      resolve(cachedVoice);
    }, { once: true });
  });

  return voiceLoadPromise;
}

loadEnglishVoice();

export async function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;

  const voice = await loadEnglishVoice();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}
