import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/ahorrapp/Dashboard.tsx';
let c = readFileSync(path, 'utf8');

// These are the corrupted multi-byte sequences that result from double-encoding UTF-8
// Each pair: [corrupted_string, correct_emoji]
const fixes = [
  // Greeting emojis
  ['ðŸ\u2019\u2039', '\u{1F44B}'],   // 👋 wave
  ['â˜€ï¸', '\u{2600}\uFE0F'],       // ☀️ sun
  ['ðŸŒ\u2122', '\u{1F319}'],        // 🌙 moon  
  ['ðŸ\u2019¤', '\u{1F4A4}'],        // 💤 sleep
  // Goal emojis
  ['ðŸ›¡ï¸', '\u{1F6E1}\uFE0F'],     // 🛡️ shield
  ['âœˆï¸', '\u{2708}\uFE0F'],       // ✈️ plane
  ['ðŸ\u2019»', '\u{1F4BB}'],        // 💻 laptop
  ['ðŸš—', '\u{1F697}'],             // 🚗 car
  ['ðŸ ', '\u{1F3E0}'],              // 🏠 house
  ['ðŸ\u2019', '\u{1F48D}'],         // 💍 ring
  ['ðŸŽ"', '\u{1F393}'],             // 🎓 graduation
  ['ðŸŒ´', '\u{1F334}'],             // 🌴 palm tree
  ['ðŸŽ\u2122', '\u{1F381}'],        // 🎁 gift  (must come before shorter match)
  ['ðŸ"ˆ', '\u{1F4C8}'],             // 📈 chart up
  ['ðŸŽ¯', '\u{1F3AF}'],             // 🎯 target
];

let count = 0;
for (const [bad, good] of fixes) {
  const before = c;
  c = c.split(bad).join(good);
  if (c !== before) count++;
}

writeFileSync(path, c, 'utf8');
console.log(`Fixed ${count} emoji sequences`);
