let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceLoadAttempted = false;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const enUS = voices.filter(v => v.lang === 'en-US' && !v.localService);
  if (enUS.length > 0) return enUS[0];

  const enUSAny = voices.filter(v => v.lang === 'en-US');
  if (enUSAny.length > 0) return enUSAny[0];

  const enAny = voices.filter(v => v.lang.startsWith('en'));
  if (enAny.length > 0) return enAny[0];

  return null;
}

async function ensureVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice) return cachedVoice;
  if (voiceLoadAttempted) return cachedVoice;

  const voice = pickEnglishVoice();
  if (voice) {
    cachedVoice = voice;
    voiceLoadAttempted = true;
    return voice;
  }

  return new Promise<SpeechSynthesisVoice | null>((resolve) => {
    let settled = false;

    const finish = (v: SpeechSynthesisVoice | null) => {
      if (settled) return;
      settled = true;
      voiceLoadAttempted = true;
      cachedVoice = v;
      resolve(v);
    };

    speechSynthesis.addEventListener('voiceschanged', () => {
      finish(pickEnglishVoice());
    }, { once: true });

    setTimeout(() => {
      finish(pickEnglishVoice());
    }, 1000);
  });
}

ensureVoice();

export async function speakText(text: string) {
  if (!('speechSynthesis' in window)) return;

  const voice = await ensureVoice();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}
