export function createAudio() {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!enabled) return null;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(c, freq, t, dur, type, gain) {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noise(c, t, dur, gain) {
    const length = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 900;
    const amp = c.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(c.destination);
    src.start(t);
  }

  function play(fn) {
    const c = ac();
    if (!c) return;
    fn(c, c.currentTime);
  }

  return {
    setEnabled(value) {
      enabled = value;
      if (!enabled && ctx && ctx.state === "running") ctx.suspend();
      if (enabled && ctx && ctx.state === "suspended") ctx.resume();
    },
    swipe() {
      play((c, t) => noise(c, t, 0.07, 0.05));
    },
    coin(perfect) {
      play((c, t) => {
        tone(c, perfect ? 880 : 660, t, 0.08, "triangle", 0.05);
        tone(c, perfect ? 1320 : 990, t + 0.05, 0.1, "sine", 0.04);
      });
    },
    vest() {
      play((c, t) => tone(c, 520, t, 0.14, "sine", 0.04));
    },
    loss() {
      play((c, t) => {
        tone(c, 180, t, 0.16, "sawtooth", 0.03);
        tone(c, 110, t + 0.04, 0.18, "triangle", 0.03);
      });
    },
    jackpot() {
      play((c, t) => {
        [523, 659, 784, 1046].forEach((freq, i) => tone(c, freq, t + i * 0.07, 0.18, "triangle", 0.05));
      });
    },
    buy() {
      play((c, t) => tone(c, 740, t, 0.09, "square", 0.03));
    },
  };
}
