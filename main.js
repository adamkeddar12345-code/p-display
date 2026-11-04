import Decimal from "decimal.js";

// initialize global p as a Decimal (preserve existing Decimal if present)
window.p = (typeof window.p !== 'undefined' && window.p && window.p instanceof Decimal) ? window.p : new Decimal(0);

// ownership / credit display logic
// set the project owner here; change as needed
const PROJECT_OWNER = 'jad';

 // set persistent credit notice text
 const noticeEl = document.querySelector('.notice');
 if (noticeEl) {
   noticeEl.textContent = '@Jad';
 }
// milestones
const ZERO = 0
const ONE = 1
const INF = 2
const RRT = 3
const MIF = 4
 // show a brief "Thanks for 6,000 views (or less)!" notification (auto-hide; click to dismiss) and play celebration sound
 const thanksEl = document.getElementById('thanksNotif');
 const celebrationEl = document.getElementById('celebration');
 const celebrationBig = document.getElementById('celebrationBig');
 if (thanksEl) {
   // reveal for a longer time then hide (bigger milestone)
   const showDuration = 9000; // ms
   const hide = () => {
     thanksEl.classList.remove('visible');
     setTimeout(() => {
       if (thanksEl && thanksEl.parentNode) { /* kept for potential re-show */ }
     }, 400);
   };
   // allow click to dismiss immediately
   thanksEl.addEventListener('click', hide);
   // reveal on next tick for CSS transition and attempt to play celebration sounds
   requestAnimationFrame(() => {
     thanksEl.classList.add('visible');
     // layered playback: try the lighter celebration then multiple staggered big stings for an impactful "huge" celebration
     if (celebrationEl) {
       try {
         celebrationEl.currentTime = 0;
         celebrationEl.volume = 0.9;
         celebrationEl.play().catch(() => { /* autoplay denied; user interaction required */ });
       } catch (e) { /* silent */ }
     }
     if (celebrationBig) {
       try {
         // immediate primary big sting
         celebrationBig.currentTime = 0;
         celebrationBig.volume = 1.0;
         celebrationBig.play().catch(() => { /* autoplay denied */ });

         // create a deep underlying "sub" layer by playing a slowed clone for extra weight
         setTimeout(() => {
           try {
             const sub = celebrationBig.cloneNode(true);
             sub.playbackRate = 0.6;
             sub.volume = 0.9;
             sub.currentTime = 0;
             document.body.appendChild(sub);
             sub.play().catch(() => {}).finally(() => setTimeout(() => sub.remove(), 8000));
           } catch (e) { /* silent */ }
         }, 40);

         // layered duplicates with slight timing offsets and varied playbackRate/volume to build a huge stacked sound
         const layers = [
           {delay: 120, vol: 0.98, rate: 1.005},
           {delay: 240, vol: 0.92, rate: 0.995},
           {delay: 360, vol: 0.86, rate: 1.02},
           {delay: 480, vol: 0.78, rate: 0.98},
           {delay: 620, vol: 0.7, rate: 1.03},
         ];
         layers.forEach(cfg => {
           setTimeout(() => {
             try {
               const clone = celebrationBig.cloneNode(true);
               clone.volume = cfg.vol;
               clone.playbackRate = cfg.rate;
               clone.currentTime = 0;
               document.body.appendChild(clone);
               clone.play().catch(() => {}).finally(() => setTimeout(() => clone.remove(), 8000));
             } catch (e) { /* silent */ }
           }, cfg.delay);
         });

         // a few short quick echoes for shimmer
         [800, 980, 1160].forEach((d, i) => {
           setTimeout(() => {
             try {
               const echo = celebrationBig.cloneNode(true);
               echo.volume = 0.55 - i * 0.08;
               echo.playbackRate = 1 + i * 0.02;
               echo.currentTime = 0.08; // start slightly into sample for brightness
               document.body.appendChild(echo);
               echo.play().catch(() => {}).finally(() => setTimeout(() => echo.remove(), 5000));
             } catch (e) { /* silent */ }
           }, d);
         });
       } catch (e) { /* silent */ }
     }
     setTimeout(hide, showDuration);
   });
 }

const pRaw = document.getElementById('pRaw'); // central large display
const pSmall = document.getElementById('pSmall'); // top-left compact readout
const resetBtn = document.getElementById('reset');
const setPBtn = document.getElementById('setP');
const setPInput = document.getElementById('setPVal');
const pauseBtn = document.getElementById('pause');
const ambienceToggle = document.getElementById('ambienceToggle');
const ambienceEl = document.getElementById('ambience');
const speedInput = document.getElementById('speed');
const textAlignToggle = document.getElementById('textAlignToggle');
const centerEl = document.querySelector('.center');

 // donation UI (top-right)
 const donateBtn = document.getElementById('donateBtn');
 
 // animation base rate: 0.000075 per second (will be multiplied by speed)
 const RATE_PER_SEC = 0.000075;
 let animating = true;
 
 // remove donate UI if current project creator isn't the expected owner
 (async () => {
   try {
     if (window.websim && typeof window.websim.getCreator === 'function') {
       const creator = await window.websim.getCreator();
       const ownerUsername = creator && (creator.username || creator.name || creator.id);
       if (ownerUsername !== PROJECT_OWNER) {
         // hide/remove donate button to avoid showing tip UI for other owners
         if (donateBtn && donateBtn.parentNode) donateBtn.parentNode.removeChild(donateBtn);
       }
     }
   } catch (e) {
     // if any error, silently leave the donate UI in place (safer fallback)
     console.warn('Could not verify project owner for donate UI:', e);
   }
 })();

// initialize text alignment from localStorage (default: center)
const ALIGN_KEY = 'p_display_text_align';
let currentAlign = localStorage.getItem(ALIGN_KEY) || 'center';
applyTextAlign();
if (textAlignToggle) {
  textAlignToggle.addEventListener('click', () => {
    currentAlign = (currentAlign === 'center') ? 'left' : 'center';
    localStorage.setItem(ALIGN_KEY, currentAlign);
    applyTextAlign();
  });
}

function applyTextAlign(){
  if (!centerEl) return;
  if (currentAlign === 'left') {
    centerEl.classList.add('align-left');
    if (textAlignToggle) {
      textAlignToggle.textContent = 'Text: Left';
      textAlignToggle.setAttribute('aria-pressed', 'true');
    }
  } else {
    centerEl.classList.remove('align-left');
    if (textAlignToggle) {
      textAlignToggle.textContent = 'Text: Center';
      textAlignToggle.setAttribute('aria-pressed', 'false');
    }
  }
}

// initialize UI
updateUI();

// buttons
resetBtn.addEventListener('click', () => {
  p = new Decimal(0);
  updateUI();
});



// set p from input (clamped -4..4)
if (setPBtn && setPInput) {
  setPBtn.addEventListener('click', () => {
    const v = parseFloat(setPInput.value);
    if (Number.isFinite(v)) {
      p = new Decimal(v);
      updateUI();
    }
  });
}

pauseBtn.addEventListener('click', () => {
  animating = !animating;
  pauseBtn.textContent = animating ? 'Pause' : 'Resume';
});

// donation handler: prompts for amount (10..25000) and optional message, then opens websim post flow
if (donateBtn && window.websim) {
  donateBtn.addEventListener('click', async () => {
    try {
      // ask for credit amount
      let raw = prompt("Enter tip amount (10 - 25,000 credits):", "10");
      if (raw === null) return; // cancelled
      raw = raw.replace(/[^\d.]/g, '');
      const amt = Math.floor(Number(raw));
      if (!Number.isFinite(amt) || amt < 10 || amt > 25000) {
        alert("Amount must be a whole number between 10 and 25,000.");
        return;
      }
      // optional message
      const msg = prompt("Optional message to include with the tip (leave blank for none):", "");
      // call websim.postComment which will let the user confirm/edit before posting
      const payload = { content: msg || `Tip: ${amt} credits`, credits: amt };
      const res = await window.websim.postComment(payload);
      if (res && res.error) {
        alert("Failed to post tip: " + res.error);
      } else {
        // success note: the platform will emit comment:created; give immediate feedback on the button briefly
        if (donateBtn) {
          const prev = donateBtn.textContent;
          donateBtn.textContent = `Thanks — ${amt}`;
          setTimeout(() => { if (donateBtn) donateBtn.textContent = prev; }, 4000);
        }
      }
    } catch (e) {
      console.error("Donate error:", e);
      alert("Could not send tip. Try again after interacting with the page.");
    }
  });
}

// sections panel controls
const sectionsPanel = document.getElementById('sectionsPanel');
const sectionsClose = document.getElementById('sectionsClose');
const sectionItems = document.querySelectorAll('.section-item');
if (sectionsClose) {
  sectionsClose.addEventListener('click', () => {
    if (sectionsPanel) sectionsPanel.style.display = 'none';
  });
}
/* Sections are view-only now: remove interactive jumping behaviour.
   Sections are kept view-only as non-interactive labels for reference. */

// ambience toggle: default on; allow user to mute/play
if (ambienceToggle && ambienceEl) {
  // try to start playback (may be blocked by browser autoplay policies)
  const tryPlay = () => {
    ambienceEl.play().then(() => {
      ambienceToggle.textContent = 'Ambience: On';
      ambienceToggle.setAttribute('aria-pressed', 'true');
    }).catch(() => {
      ambienceToggle.textContent = 'Ambience: Off';
      ambienceToggle.setAttribute('aria-pressed', 'false');
    });
  };
  // attempt to play on load
  tryPlay();

  ambienceToggle.addEventListener('click', () => {
    if (ambienceEl.paused) {
      ambienceEl.play().then(() => {
        ambienceToggle.textContent = 'Ambience: On';
        ambienceToggle.setAttribute('aria-pressed', 'true');
      }).catch(() => {
        ambienceToggle.textContent = 'Ambience: Off';
        ambienceToggle.setAttribute('aria-pressed', 'false');
      });
    } else {
      ambienceEl.pause();
      ambienceToggle.textContent = 'Ambience: Off';
      ambienceToggle.setAttribute('aria-pressed', 'false');
    }
  });
}

// speed input behavior: clamp and update display/background if changed
if (speedInput) {
  speedInput.addEventListener('input', () => {
    const v = parseFloat(speedInput.value);
    if (Number.isNaN(v)) speedInput.value = '0';
    // apply immediate UI update (so background can react as p moves)
    updateUI();
  });
}

// utility helpers
function formatMantissa(m, sig = 15) {
  let s = Number(m).toPrecision(sig);
  s = s.replace(/(?:\.0+|(\.\d+?)0+)$/, '$1');
  return s;
}
function showdifcolors(n, ind){
  // ensure ind has a usable default (1) and declare colors locally
  ind = (typeof ind === 'undefined' || ind === null) ? 1 : ind;
  const colors = ["white", "red", "orange", "yellow", "green", "blue", "indigo", "violet", "pink", "red"]; // JS is 0-indexed
  if (n < 0.5) {
    const t = n / 0.5;
    const start = 1;
    const end = 1000;
    const exp = (start * (end / start)**t);
    return `<span class="${colors[Math.max(0, Math.min(colors.length-1, ind))]}">${Math.floor(exp)}</span>+<span class="${colors[Math.max(0, Math.min(colors.length-1, ind-1))]}">${d(exp%1 * 3.61)}</span>`;
  } else {
    const t = (n - 0.5) / 0.5;
    const start = 1.03;
    const end = 3.61;
    const exp = (start * (end / start)**t);
    return `<span class="${colors[Math.max(0, Math.min(colors.length-1, ind))]}">${d(exp)}</span>`
  }
}
function showinfinity(n, ind){
  // ensure ind has a usable default (1) and declare colors locally
  ind = (typeof ind === 'undefined' || ind === null) ? 0 : ind;
  const colors = ["₰", "⨃", "†", "§", "⊝", `Z`]; // JS is 0-indexed
  const input = (typeof colors[ind-1] === 'undefined' || colors[ind-1] === null) ? `[∞<sub>${ind}</sub>]`: colors[ind-1]
  if (ind == 0) {
    return d(1 + n*3)
  }
  if (n < 0.5) {
    const t = n*2;
    const start = 1;
    const end = 1000;
    const exp = (start * (end / start)**t);
    return `(${Math.floor(exp)}${input})+${showinfinity((exp%1 *(ind)) %1, Math.floor(exp%1 *(ind)))}`;
  } else {
    const t = (n - 0.5) / 0.5
    return `${input}<sup>${showinfinity((t*ind)%1, Math.floor(t*ind))}</sup>`
  }
}

function totheafn(n, ind){
  // ensure ind has a usable default (1) and declare colors locally
  ind = (typeof ind === 'undefined' || ind === null) ? 0 : ind;
  const colors = ["𝕭", "𖥜", "ᛜ", "𖥚", "𖢻", "𓊗", "+/-", "ᴑ", "𖣀", "𐄺"]; // JS is 0-indexed
  const input = (typeof colors[ind-1] === 'undefined' || colors[ind-1] === null) ? `[ꗈ<sub>${ind}</sub>]`: colors[ind-1]
  if (ind == 0) {
    return d(1 + n*5.8)
  }
  if (n < 0.5) {
    const t = n*2;
    const start = 1;
    const end = 1000;
    const exp = (start * (end / start)**t);
    return `<sub>${Math.floor(exp)}</sub>${input}+${totheafn((exp%1 *(ind)) %1, Math.floor(exp%1 *(ind)))}`;
  } else {
    const t = (n - 0.5) / 0.5
    return `${input}<sup>${totheafn((t*ind)%1, Math.floor(t*ind))}</sup>`
  }
}
function idkwhattonamethis(n, ind){
  // ensure ind has a usable default (1) and declare colors locally
  ind = (typeof ind === 'undefined' || ind === null) ? 0 : ind;
  const colors = ["p<sup>ಥ</sup>⚜[1]", "p🔳￣﹃￣🔲[1]", "p🌐<sub>🔅</sub>[1]", "p✨皿▔[1]"]; // JS is 0-indexed
  const input = (typeof colors[ind-1] === 'undefined' || colors[ind-1] === null) ? `p<sup>🎞</sup>-${ind}-`: colors[ind-1]
  if (ind == 0) {
    return d(1 + n*5.8)
  }
  if (n < 0.5) {
    const t = n*2;
    const start = 1;
    const end = 10000;
    const exp = (start * (end / start)**t);
    return `<sub>${Math.floor(exp)}🔁</sub>${input}+${idkwhattonamethis((exp%1 *(ind)) %1, Math.floor(exp%1 *(ind)))}`;
   } else {
    const t = (n - 0.5) / 0.5
    return `${input}<sub>${idkwhattonamethis((t*ind)%1, Math.floor(t*ind))}</sub>`
  }
}
function formatNum(n){
  if (typeof n === 'string') return n;
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(6)).toString();
}
function d(v) {
  return displayedValueFor(v)
}
function displayedValueFor(pVal){
    // 0 .. 0.001 : still show 0
  if (pVal < 0) {return `-${displayedValueFor(-pVal)}`};
if (pVal >= 0 && pVal < 0.0005) return `0.` + `0`.repeat(10**(1 - pVal*2000)) + `*${(10**(-(10**(1 - pVal*2000))%1 +1)).toFixed(2)}`;

  if (pVal >= 0.0005 && pVal < 0.001) return `0`;

  // 0.001 .. 0.01 : format from 1/⨀^1000 down to 1/⨀
  if (pVal >= 0.001 && pVal <= 0.01) {
    const t = (pVal - 0.001) / (0.01 - 0.001); // 0..1
    // map t=0 -> 1000, t=1 -> 1
    const startExp = 2;
    const endExp = 1;
    const expRaw = startExp + t * (endExp - startExp);
    const expN = d(expRaw);
    if (expN <= 1) return `1/⨀`;
    return `1/⨀<sup>${expN}</sup>`;
  }

  // 0.01 .. 0.018 : exponential interpolation from 1/Ω^1000 --> 1/Ω^2
  if (pVal > 0.01 && pVal <= 0.018) {
    const t = (pVal - 0.01) / (0.018 - 0.01);
    const startExp = 1000;
    const endExp = 2;
    const expRaw = startExp * Math.pow(endExp / startExp, t);
    const expN = Math.max(2, Math.round(expRaw));
    return `${Math.floor(10**(expRaw%1))}/Ω<sup>${expN}</sup>`;
  }

  // 0.018 .. 0.02 : exponential from 1/Ω --> 1000000000/Ω (mantissa grows exponentially)
  if (pVal > 0.018 && pVal <= 0.02) {
    const t = (pVal - 0.018) / (0.02 - 0.018);
    const start = 1;
    const end = 1e9;
    const valRaw = start * Math.pow(end / start, t);
    const val = Math.max(1, Math.round(valRaw));
    return `${val}/Ω`;
  }

  // existing ranges retained for p > 0.02
  if (pVal > 0.02 && pVal <= 0.1) {
    const t = (pVal - 0.02) / (0.1 - 0.02);
    const start = 1000;
    const end = 2;
    const nRaw = start * Math.pow(end / start, t);
    const n = Math.round(nRaw);
    return `1/∞<sup>${n}</sup>`;
  }

  if (pVal > 0.1 && pVal <= 0.2) {
    const t = (pVal - 0.1) / 0.1;
    const startExp = 1;
    const endExp = 2;
    const inner = startExp + t
      return `${d(inner)}/∞`;
  }

  // p = 0.2 .. 0.3 : exponential from "10^-10^^308" to "10^-10^^3"
  if (pVal > 0.2 && pVal <= 0.3) {
    const t = (pVal - 0.2) / (0.3 - 0.2);
    const startExp = 308;
    const endExp = 3;
    const expRaw = startExp * Math.pow(endExp / startExp, t);
    const expN = Math.max(3, Math.round(expRaw));
    return `10<sup>-10^^${expN}</sup>`;
  }

  // p = 0.3 .. 0.4 : exponential from "10^-10^10000000000" to "10^-10^10"
  if (pVal > 0.3 && pVal <= 0.4) {
    const t = (pVal - 0.3) / (0.4 - 0.3);
    const startVal = 1e10;
    const endVal = 10;
    const valRaw = startVal * Math.pow(endVal / startVal, t);
    const valN = Math.max(10, Math.round(valRaw));
    return `10<sup>-10<sup>${valN}</sup></sup>`;
  }

  // p = 0.4 .. 0.5 : exponential from "10^-10000000000" to "10^-325"
  if (pVal > 0.4 && pVal <= 0.5) {
    const t = (pVal - 0.4) / (0.5 - 0.4);
    const startVal = 1e10;
    const endVal = 325;
    const valRaw = startVal * Math.pow(endVal / startVal, t);
    const valN = Math.max(325, Math.round(valRaw));
    return `10<sup>-${valN}</sup>`;
  }

  // p = 0.5 .. 0.75 : exponential from 5e-324 to 0.000001
  if (pVal > 0.5 && pVal <= 0.75) {
    const t = (pVal - 0.5) / (0.75 - 0.5);
    // represent values as decimal or tiny exponent form; map start=5e-324 -> end=1e-6 exponentially
    const start = 5e-324; // smallest positive subnormal double
    const end = 1e-6;
    // to avoid underflow in intermediate math, interpolate exponents in base10 space
    const startLog = Math.log10(start); // ~ -323.305...
    const endLog = Math.log10(end); // -6
    const logVal = startLog + t * (endLog - startLog);
    // if extremely small, show as 5e-324 when near start, otherwise format as scientific if <1e-3
    if (logVal <= -308) {
      return '5e-324';
    }
    const val = Math.pow(10, logVal);
    if (val < 0.001) {
      // format as scientific with 3 significant digits
      return `${formatMantissa(val / Math.pow(10, Math.floor(Math.log10(val))), 3)}e${Math.floor(Math.log10(val))}`;
    }
    return String(parseFloat(val.toFixed(12)));
  }

  // p = 0.75 .. 1 : exponential from 0.000001 to 1
  if (pVal > 0.75 && pVal <= 1.0) {
    const t = (pVal - 0.75) / (1.0 - 0.75);
    const start = 1e-6;
    const end = 1;
    const val = start * Math.pow(end / start, t);
    if (val < 0.001) {
      const exp = Math.floor(Math.log10(val));
      const mant = val / Math.pow(10, exp);
      return `${formatMantissa(mant, 4)}e${exp}`;
    }
    return String(parseFloat(val.toFixed(6)));
  }

  // p = 1.0 .. 1.1 : display from 1 to 1,000,000,000 (expo)
  if (pVal > 1.0 && pVal <= 1.1) {
    const t = (pVal - 1.0) / (0.1);
    const start = 1;
    const end = 1e10;
    const val = start * Math.pow(end / start, t);
    return String(val.toLocaleString());
  }

  // p = 1.1 .. 1.2 : 1.00e+9 to ~1.79e+308 (expo)
  if (pVal > 1.1 && pVal <= 1.2) {
    const t = (pVal - 1.1) / (0.1);
    const startExp = 9;
    const endExp = 308;
    const exp = (startExp + t * (endExp - startExp));
    const mant = 10**(exp%1); // small mantissa growth
    const mantStr = formatMantissa(mant, 3);
    return `${mantStr} x 10<sup>${Math.floor(exp)}</sup>`;
  }

  // p = 1.2 .. 1.3 : 10^308 to 10^1000000000
  if (pVal > 1.2 && pVal <= 1.4) {
    const t = (pVal - 1.2) / 0.2;
    const start = 1.0248855071650044426;
    const end = 1.399;
    const exp = d(start * Math.pow(end / start, t));
    return `10<sup>${exp}</sup>`;
  }

  // p = 1.4 .. 1.5 : 10^^4 to 10^^1000
  if (pVal > 1.4 && pVal <= 1.5) {
    const t = (pVal - 1.4) / 0.1;
    const start = 10;
    const end = 1000;
    const n = Math.max(10, Math.round(start * Math.pow(end / start, t)));
    return `10^^${n}`;
  }

  // p = 1.5 .. 1.6 : 10{2.2}10 to 10{10}10  (notation 10{k}10)
  if (pVal > 1.5 && pVal <= 1.6) {
    const t = (pVal - 1.5) / 0.1;
    const start = 2.2;
    const end = 10;
    const k = (start * Math.pow(end / start, t));
    return `10${"↑".repeat(Math.floor(k))}${Math.floor(10**(10**(k%1.0)))}`;
  }

  // p = 1.6 .. 1.65 : 10{10}10 to 10{10000000000}10
  if (pVal > 1.6 && pVal <= 1.65) {
    const t = (pVal - 1.6) / 0.05;
    const start = 10;
    const end = 10000000000;
    const k = Math.max(10, Math.round(start * Math.pow(end / start, t)));
    return `10{${k}}10`;
  }

  // p = 1.65 .. 1.7 : TREE(3) to TREE(1000000)
  if (pVal > 1.65 && pVal <= 1.7) {
    const t = (pVal - 1.65) / 0.05;
    const start = 3;
    const end = 1000000;
    const n = Math.max(3, Math.round(start * Math.pow(end / start, t)));
    return `TREE(${n})`;
  }

  // p = 1.7 .. 1.75 : TREE(TREE(3)) to TREE(TREE(100000))
  if (pVal > 1.7 && pVal <= 1.75) {
    const t = (pVal - 1.7) / 0.05;
    const start = 3;
    const end = 100000;
    const inner = Math.max(3, Math.round(start * Math.pow(end / start, t)));
    return `TREE(TREE(${inner}))`;
  }

  // p = 1.75 .. 1.8 : SSCG(3) to SSCG(10000000)
  if (pVal > 1.75 && pVal <= 1.775) {
    const t = (pVal - 1.75) / 0.025;
    const start = 3;
    const end = 10000000;
    const n = Math.max(3, Math.round(start * Math.pow(end / start, t)));
    return `SSCG(${n})`;
  }
if (pVal > 1.775 && pVal <= 1.8) {
    const t = (pVal - 1.775) / 0.025;
    const start = 1.130435;
    const end = 1.7999999999999;
    const n = (start + t * (end - start))
    return `Rayo(${d(n)})`;
  }

  // p = 1.8 .. 1.81 : Oblivion
  if (pVal > 1.8 && pVal <= 1.81) return `Oblivion[${((pVal-1.8)*10000).toFixed(1)}]`;

  // p = 1.81 .. 1.82 : Utter Oblivion
  if (pVal > 1.81 && pVal <= 1.82) return 'Utter Oblivion' + `[${((pVal-1.81)*10000).toFixed(1)}]`;

  // p = 1.82 .. 1.9 : Tier 2 Oblivion to Tier 1000 Oblivion
  if (pVal > 1.82 && pVal <= 1.9) {
    const t = (pVal - 1.82) / (1.9 - 1.82);
    const start = 2;
    const end = 1000;
    const tier = Math.max(2, Math.round(start * Math.pow(end / start, t)));
    return `[${tier}]-Oblivion`;
  }

  // p = 1.9 .. 1.95 : Tier 1000 Oblivion to Tier 100000000 Oblivion
  if (pVal > 1.9 && pVal <= 1.925) {
    const t = (pVal - 1.9) / 0.025;
    const start = 1000;
    const end = 1000000000;
    const tier = Math.max(1000, Math.round(start * Math.pow(end / start, t)));
    return `[${tier}]-Oblivion`;
  }
  if (pVal > 1.925 && pVal <= 1.95) {
    const t = (pVal - 1.925) / 0.025;
    const start = 1.1;
    const end = 1.8;
    const tier = Math.max(1.1, (start * Math.pow(end / start, t)));
    return `[${displayedValueFor(tier)}]-Oblivion`;
  }

  // p = 1.95 .. 2 : ∞^0.01 to ∞^0.99
  if (pVal > 1.95 && pVal < 2) {
    const t = (pVal - 1.95) / 0.05;
    const start = 0.01;
    const end = 0.99;
    const exp = (start + t * (end - start)).toFixed(2);
    return `ω<sub>${exp}</sub>`;
  }

  // p = 2.00 .. 2.25 : ∞^1.00 to ∞^2.24
  if (pVal >= 2 && pVal < 2.25) {
    const t = (pVal - 2.0) / 0.25;
    const start = 1.00;
    const end = 2.249;
    const exp = (start + t * (end - start));
    return `ω<sub>${d(exp)}</sub>`;
  } 
  if (pVal >= 2.25 && pVal < 2.5) {
    const t = (pVal - 2.25) / 0.25;
    const start = 1.00;
    const end = 2.499;
    const exp = (start + t * (end - start));
    return `Ω<sup>${d(exp)}</sup>`;
  }
  if (pVal >= 2.5 && pVal < 2.75) {
    const t = (pVal - 2.5) / 0.25;
    const start = 1.00;
    const end = 2.749;
    const exp = (start + t * (end - start));
    return `⨀<sup>${d(exp)}</sup>`;
  }
  if (pVal >= 2.75 && pVal < 2.8) {
    const t = (pVal - 2.75) / 0.05;
    const start = 0;
    const end = 2.75;
    const exp = (start + t * (end - start));
    return `${d(exp)}<sub>[ↁ1]</sub>`;
  }
  if (pVal >= 2.8 && pVal < 2.9) {
    const t = (pVal - 2.8) / 0.1;
    const start = Math.log10(2);
    const end = 2;
    const exp = 10**(start + t * (end - start));
    return `${d(exp%1 * 2.75)}<sub>[ↁ${Math.floor(exp)}]</sub>`;
  }
  if (pVal >= 2.9 && pVal < 3) {
    const t = (pVal - 2.9) / 0.1;
    const start = 1.02;
    const end = 2.999;
    const exp = (start + t * (end - start));
    return `1<sub>[ↁ${d(exp)}]</sub>`;
  }
  if (pVal >= 3 && pVal < 3.1) {
    const t = (pVal - 3) / 0.1;
    const start = 0;
    const end = 25;
    const exp = (start + t * (end - start));
    return `⁛<sup>${("ABCDEFGHIJKLMNOPQRSTUVWXYZ")[Math.floor(exp)]}<sub>#(${d(1+ (exp%1)*2)})</sub></sup>`;
  }
  if (pVal >= 3.1 && pVal < 3.15) {
    const t = (pVal - 3.1) / 0.05;
    const start = 27;
    const end = 1000;
    const exp = (start * (end / start)**t);
    return `⁛<sup>l#${Math.floor(exp)}<sub>#(${d(1+ (exp%1)*2)})</sub></sup>`;
  }
  if (pVal >= 3.15 && pVal < 3.2) {
    const t = (pVal - 3.15) / 0.05;
    const start = 1.03;
    const end = 3.199;
    const exp = (start * (end / start)**t);
    return `⁛<sup>l#${d(exp)}<sub>#1</sub></sup>`;
  }
  if (pVal >= 3.2 && pVal < 3.25) {
    const t = (pVal - 3.2) / 0.05;
    const start = 2;
    const end = 100;
    const exp = (start * (end / start)**t);
    const tee = 3 + (exp%1)*0.2
    return `<sub><sup>${Math.floor(exp)}</sup></sub>~${d(tee)}`;
  }
  if (pVal >= 3.25 && pVal < 3.3) {
    const t = (pVal - 3.25) / 0.05;
    const start = 1.02;
    const end = 3.299;
    const exp = (start + (end - start)*t);
    const tee = 3 + (exp%1)*0.2
    return `<sub><sup>${d(exp)}</sup></sub>~${d(3)}`;
  }
    if (pVal >= 3.3 && pVal < 3.35) {
    const t = (pVal - 3.3) / 0.05;
    const start = 2;
    const end = 100;
    const exp = (start * (end / start)**t);
    return `(+<sub>${Math.floor(exp)}</sub>)${d(exp%1 * 3.3)}`;
  }
  if (pVal >= 3.35 && pVal < 3.4) {
    const t = (pVal - 3.35) / 0.05;
    const start = 1.02;
    const end = 3.399;
    const exp = (start + t * (end - start));
    return `(+<sub>${d(exp)}</sub>)1`;
  }
  if (pVal >= 3.4 && pVal < 3.45) {
    const t = (pVal - 3.4) / 0.05;
    const start = 1;
    const end = 3.4499;
    const exp = (start + t * (end - start));
    return `${d(exp)}<sup>⨳</sup>`;
  }
  if (pVal >= 3.45 && pVal < 3.475) {
    const t = (pVal - 3.45) / 0.025;
    const start = 4;
    const end = 10;
    const exp = (start + t * (end - start));
    return `${d(1 + (exp%1)*2.45)}<sup>${`⨳`.repeat(Math.floor(exp))}</sup>`;
  }
  if (pVal >= 3.475 && pVal < 3.5) {
    const t = (pVal - 3.475) / 0.025;
    const start = 1.01;
    const end = 3.499;
    const exp = (start + t * (end - start));
    return `1.000<sup>⨳⨳⨳...<sub>*${d(exp)}</sub>...⨳⨳⨳</sup>`;
  }
  if (pVal >= 3.5 && pVal < 3.51) {
    const t = (pVal - 3.5) / 0.01;
    const start = 1.01;
    const end = 3.499;
    const exp = (start + t * (end - start));
    return `1.000<sup>⨳⨳⨳...<sub>*${d(exp)}</sub>...⨳⨳⨳</sup>`;
  }
  // wnr eras
  if (pVal >= 3.51 && pVal < 3.52) {
    const t = (pVal - 3.51) / 0.01;
    const start = 0;
    const end = 3.51;
    const exp = (start + t * (end - start));
    return `2∄(${d(exp)})`;
  }
  if (pVal >= 3.52 && pVal < 3.53) {
    const t = (pVal - 3.52) / 0.01;
    const start = Math.log10(3);
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${Math.floor(exp)}∄${d(exp%1 * 3.51)}`;
  }
  if (pVal >= 3.53 && pVal < 3.54) {
    const t = (pVal - 3.53) / 0.01;
    const start = 1.03;
    const end = 3.51;
    const exp = (start + t * (end - start));
    return `${d(exp)}∄1`;
  }
  // x⨛.x
  if (pVal >= 3.54 && pVal < 3.55) {
    const t = (pVal - 3.54) / 0.01;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${d(exp%1 * 3.54)}⨛.${Math.floor(exp)}`;
  }
  if (pVal >= 3.55 && pVal < 3.56) {
    const t = (pVal - 3.55) / 0.01;
    const start = 1.03;
    const end = 3.51;
    const exp = (start + t * (end - start));
    return `1⨛.${d(exp)}`;
  }
  // x⌘x
  if (pVal >= 3.56 && pVal < 3.57) {
    const t = (pVal - 3.56) / 0.01;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${Math.floor(exp)}⌘${d(exp%1 * 3.56)}`;
  }
  if (pVal >= 3.57 && pVal < 3.58) {
    const t = (pVal - 3.57) / 0.01;
    const start = 1.03;
    const end = 3.51;
    const exp = (start + t * (end - start));
    return `${d(exp)}⌘1`;
  }
  // CX(x)
  if (pVal >= 3.58 && pVal < 3.59) {
    const t = (pVal - 3.58) / 0.01;
    const start = 1+(Math.log10(5)/100);
    const end = 3.5899;
    const exp = (start + t * (end - start));
    return `1<sub>CX(${d(exp)})</sub>1`;
  }
  // Reincarnation Number (x🛞x)
  if (pVal >= 3.59 && pVal < 3.6) {
    const t = (pVal - 3.59) / 0.01;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${(Math.floor(exp)+"<rainbow>🛞</rainbow>").replace("1<rainbow>🛞</rainbow>", "<rainbow>🛞</rainbow>")}${d(exp%1 * 3.58)}`;
  }
  // CX(x)
  if (pVal >= 3.6 && pVal < 3.61) {
    const t = (pVal - 3.6) / 0.01;
    const start = 1+(Math.log10(5)/100);
    const end = 3.59;
    const exp = (start + t * (end - start));
    return `${d(exp)}<rainbow>🛞</rainbow>1`;
  }
  if (pVal >= 3.61 && pVal < 3.65) {
    const t = (pVal - 3.61) / 0.04;
    const start = 1;
    const end = 8.99;
    const exp = (start + t * (end - start));
    return showdifcolors(exp%1, Math.floor(exp))
  }
  if (pVal >= 3.65 && pVal < 3.675) {
    const t = (pVal - 3.65) / 0.025;
    const start = 9;
    const end = 1000;
    const exp = (start + t * (end - start));
    return `${showdifcolors(exp%1, Math.floor(exp-2)%8 + 2)} <sub>C(${Math.floor(exp)})</sub>`
  }
  if (pVal >= 3.675 && pVal < 3.7) {
    const t = (pVal - 3.675) / 0.025;
    const start = 1.03;
    const end = 3.6999;
    const exp = (start + t * (end - start));
    return `${showdifcolors(0.00001, Math.floor((exp*3000)%8)+1)} <sub>C(${d(exp)})</sub>`;
  }
    if (pVal >= 3.7 && pVal < 3.75) {
    const t = (pVal - 3.7) / 0.05;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${(Math.floor(exp)+"♾️").replace("1♾️", "♾️")}${d(exp%1 * 3.7)}`;
  }
  // CX(x)
  if (pVal >= 3.75 && pVal < 3.8) {
    const t = (pVal - 3.75) / 0.05;
    const start = 1.03;
    const end = 3.7999;
    const exp = (start + t * (end - start));
    return `${d(exp)}♾️1`;
  }
  if (pVal >= 3.8 && pVal < 3.85) {
    const t = (pVal - 3.8) / 0.05;
    const start = 1.01;
    const end = 3.8499999;
    const exp = (start + t * (end - start));
    return `↑[${d(exp)}]↑`;
  }
  if (pVal >= 3.85 && pVal < 3.9) {
    const t = (pVal - 3.85) / 0.05;
    const start = 1.01;
    const end = 3.8999999;
    const exp = (start + t * (end - start));
    return `↑[↑${d(exp)}]↑`;
  }
  if (pVal >= 3.9 && pVal < 3.95) {
    const t = (pVal - 3.9) / 0.05;
    const start = 1.01;
    const end = 3.9499999;
    const exp = (start + t * (end - start));
    return `↑[↑|${d(exp)}|↑]↑`;
  }
  if (pVal >= 3.95 && pVal < 4) {
    const t = (pVal - 3.95) / 0.05;
    const start = 1.01;
    const end = 3.9999999;
    const exp = (start + t * (end - start));
    return `&↑[↑|${d(exp)}|↑]↑&`;
  }
  
 if (pVal >= 4 && pVal < 4.1) {
    const t = (pVal - 4) / 0.1;
    const start = 1;
    const end = 5.999;
    const exp = (start * (end/start)**t);
    return showinfinity(exp%1, Math.floor(exp)+1);
  }
  if (pVal >= 4.1 && pVal < 4.15) {
    const t = (pVal - 4.1) / 0.05;
    const start = 1+(Math.log10(10)/100);
    const end = 4.1499999;
    const exp = (start + t * (end - start));
    return `[∞<sub>${d(exp)}</sub>]`;
  }
  if (pVal >= 4.15 && pVal < 4.2) {
    const t = (pVal - 4.15) / 0.05;
    const start = 4;
    const end = 4.999;
    const exp = (start * (end/start)**t);
    return showinfinity(exp%1, Math.floor(exp)+1).replace("⊝", `<span class="red">[</span><sub><sup>1</sup></sub><span class="red">]</span>`);
  }
  if (pVal >= 4.15 && pVal < 4.2) {
    const t = (pVal - 4.15) / 0.05;
    const start = 4;
    const end = 4.999;
    const exp = (start * (end/start)**t);
    return showinfinity(exp%1, Math.floor(exp)+1).replace("⊝", `<span class="red">[</span><sub><sup>1</sup></sub><span class="red">]</span>`);
  }
  if (pVal >= 4.2 && pVal < 4.25) {
    const t = (pVal - 4.2) / 0.05;
    const start = 1.0;
    const end = 4.249999;
    const exp = (start + (end-start)*t);
    return `₯{(${d(exp)})}`;
  }
  if (pVal >= 4.25 && pVal < 4.3) {
    const t = (pVal - 4.25) / 0.05;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "1, ".repeat(exp - 1) + d(exp%1 * 3.25 +1)
    return `₯{(${concat})}`;
  }
  if (pVal >= 4.3 && pVal < 4.325) {
    const t = (pVal - 4.3) / 0.025;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "1,, ".repeat(exp - 1) + d(exp%1 * 3.3 +1)
    return `₯{(${concat})}`;
  }
  if (pVal >= 4.325 && pVal < 4.35) {
    const t = (pVal - 4.325) / 0.025;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "1,,, ".repeat(exp - 1) + d(exp%1 * 3.325 +1)
    return `₯{(${concat})}`;
  }
  if (pVal >= 4.35 && pVal < 4.375) {
    const t = (pVal - 4.325) / 0.025;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "1,^".repeat(exp - 1) + d(exp%1 * 3.325 +1)
    return `₯{(${concat})}`;
  }
  
  if (pVal >= 4.375 && pVal < 4.75) {
    const t = (pVal - 4.375) / 0.375;
    const start = 1.0;
    const end = 4.74;
    const exp = (start + (end-start)*t);
    return `⟠<sup>${d(exp)}<sup>`;
  }
  
  if (pVal >= 4.75 && pVal < 5) {
    const t = (pVal - 4.75) / 0.25;
    const start = 1.02158;
    const end = 4.75;
    const exp = (start + (end-start)*t);
    return `OL(${d(exp)})`;
  }
  
  if (pVal >= 5 && pVal < 5.1) {
    const t = (pVal - 5) / 0.1;
    const start = 1.0;
    const end = 5.05;
    const exp = (start + (end-start)*t);
    return `SOL(${d(exp)})`;
  }
  
  if (pVal >= 5.1 && pVal < 5.2) {
    const t = (pVal - 5.1) / 0.1;
    const start = 1.0;
    const end = 5.15;
    const exp = (start + (end-start)*t);
    return `MOL(${d(exp)})`;
  }
  
  if (pVal >= 5.2 && pVal < 5.3) {
    const t = (pVal - 5.2) / 0.1;
    const start = 1.0;
    const end = 5.25;
    const exp = (start + (end-start)*t);
    return `GOL(${d(exp)})`;
  }
  
  if (pVal >= 5.3 && pVal < 5.4) {
    const t = (pVal - 5.3) / 0.1;
    const start = 1.0;
    const end = 5.35;
    const exp = (start + (end-start)*t);
    return `POL(${d(exp)})`;
  }
  
  if (pVal >= 5.4 && pVal < 5.5) {
    const t = (pVal - 5.4) / 0.1;
    const start = 1.0;
    const end = 5.45;
    const exp = (start + (end-start)*t);
    return `TOL(${d(exp)})`;
  }
  
  if (pVal >= 5.5 && pVal < 5.55) {
    const t = (pVal - 5.5) / 0.05;
    const start = 1.0;
    const end = 5.525;
    const exp = (start + (end-start)*t);
    return `${d(exp)}-OL(0)`;
  }
  
  if (pVal >= 5.55 && pVal < 5.7) {
    const t = (pVal - 5.55) / 0.15;
    const start = 1.0;
    const end = 5.6;
    const exp = (start + (end-start)*t);
    return `???[${d(exp)}]`;
  }
  
  if (pVal >= 5.7 && pVal < 5.73) {
    const t = (pVal - 5.7) / 0.03;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${(Math.floor(exp)+"<red>Ⰶ</red>").replace("1<red>Ⰶ</red>", "<red>Ⰶ</red>")}${d(exp%1 * 5.71)}`;
      }
  if (pVal >= 5.73 && pVal < 5.85) {
    const t = (pVal - 5.73) / 0.12;
    const start = 1.09;
    const end = 5.73;
    const exp = (start + t * (end - start));
    return `${d(exp)}Ⰶ1`;
  }
  
  if (pVal >= 5.85 && pVal < 6) {
    const t = (pVal - 5.85) / 0.15;
    const start = 1;
    const end = 5.99999;
    const exp = (start + t * (end - start));
    return `${d(exp)}⍨1`;
  }
  
  if (pVal >= 6 && pVal < 6.1) {
    const t = (pVal - 6) / 0.1;
    const start = Math.log10(2);
    const end = 2;
    const exp = 10**(start + t * (end - start));
    return `${d(exp%1 * 6)}⍨${Math.floor(exp)}`;
  }
    if (pVal >= 6.1 && pVal < 6.2) {
    const t = (pVal - 6.1) / 0.1;
    const start = 1.02;
    const end = 6.1;
    const exp = (start + t * (end - start));
    return `1⍨${d(exp)}`;
  }
  
  if (pVal >= 6.2 && pVal < 6.25) {
    const t = (pVal - 6.2) / 0.05;
    const start = 1;
    const end = 6.2;
    const exp = (start + t * (end - start));
    return `${d(exp)}⍨⍨1`;
  }
  
  if (pVal >= 6.25 && pVal < 6.3) {
    const t = (pVal - 6.25) / 0.05;
    const start = Math.log10(2);
    const end = 2;
    const exp = 10**(start + t * (end - start));
    return `${d(exp%1 * 6)}⍨⍨${Math.floor(exp)}`;
  }
    if (pVal >= 6.3 && pVal < 6.389) {
    const t = (pVal - 6.3) / 0.089;
    const start = 1.012;
    const end = 6.3;
    const exp = (start + t * (end - start));
    return `1⍨⍨${d(exp)}`;
  }
  if (pVal >= 6.389 && pVal < 6.5) {
    const t = (pVal - 6.389) / 0.121;
    const start = 1.46;
    const end = 6.389;
    const exp = (start + t * (end - start));
    return `1(⍨x${d(exp)})1`;
     }
  if (pVal >= 6.5 && pVal < 6.55) {
    const t = (pVal - 6.5) / 0.05;
    const start = 1.0;
    const end = 6.5;
    const exp = (start + (end-start)*t);
    return `𖣐 〒 [${d(exp)}]`;
  }
  if (pVal >= 6.55 && pVal < 6.6) {
    const t = (pVal - 6.55) / 0.05;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "〒 x ".repeat(exp - 1) + d(exp%1 * 5.4 +1)
    return `𖣐 [${concat}]`;
  }
  if (pVal >= 6.6 && pVal < 6.65) {
    const t = (pVal - 6.6) / 0.05;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "〒, ".repeat(exp - 1) + d(exp%1 * 5.4 +1)
    return `𖣐 [${concat}]`;
  }
  if (pVal >= 6.65 && pVal < 6.7) {
    const t = (pVal - 6.65) / 0.05;
    const start = 2.0;
    const end = 10;
    const exp = (start + (end-start)*t);
    const concat = "[〒 / 〒]➤ ".repeat(exp - 1) + d(exp%1 * 5.4 +1)
    return `𖣐 ⎡${concat}⎦`;
 }
  if (pVal >= 6.7 && pVal < 6.75) {
    const t = (pVal - 6.7) / 0.05;
    const start = 1.0;
    const end = 6.7;
    const exp = (start + (end-start)*t);
    return `𖣐[.]<span class="red">←</span><sup>${d(exp)}`;
    }
 if (pVal >= 6.75 && pVal < 7) {
    const t = (pVal - 6.75) / 0.25;
    const start = 1;
    const end = 11.999;
    const exp = (start * (end/start)**t);
    return totheafn(exp%1, Math.floor(exp)+1);
  }
  if (pVal >= 7 && pVal < 7.05) {
    const t = (pVal - 7) / 0.05;
    const start = 1+(Math.log10(10)/100);
    const end = 7.001;
    const exp = (start + t * (end - start));
    return `[ꗈ<sub>${d(exp)}</sub>]`;
  }

  if (pVal >= 7.05 && pVal < 7.15) {
    const t = (pVal - 7.05) / 0.1;
    const start = 1.0;
    const end = 7.14;
    const exp = (start + (end-start)*t);
    return `◬(${d(exp)})`;
  }
  if (pVal >= 7.15 && pVal < 7.25) {
    const t = (pVal - 7.15) / 0.1;
    const start = 1.0;
    const end = 7.0501;
    const exp = (start + (end-start)*t);
    return `◬x${d(exp)}`;
 }
  if (pVal >= 7.25 && pVal < 7.35) {
    const t = (pVal - 7.25) / 0.1;
    const start = 1.0;
    const end = 7.051;
    const exp = (start + (end-start)*t);
    return `◬x◬x◬x◬x...x${d(exp)}`;
      }
  if (pVal >= 7.35 && pVal < 7.45) {
    const t = (pVal - 7.35) / 0.1;
    const start = 0;
    const end = 30;
    const exp = (start + t * (end - start));
    return `☍<sup>${("ABCDEFGHIJKLMNOPQRSTUVWXYZΩↁ⟠◬")[Math.floor(exp)]}</sup> ${d(1+ (exp%1)*6.4)}`;
   }

  if (pVal >= 7.45 && pVal < 7.5) {
    const t = (pVal - 7.45) / 0.05;
    const start = 1.0;
    const end = 7.45;
    const exp = (start + (end-start)*t);
    return `ጁ+${d(exp)}`;
 }

  if (pVal >= 7.5 && pVal < 7.55) {
    const t = (pVal - 7.5) / 0.05;
    const start = 1.0;
    const end = 7.5;
    const exp = (start + (end-start)*t);
    return `ጁ++${d(exp)}`;
      }
  
  if (pVal >= 7.55 && pVal < 7.6) {
    const t = (pVal - 7.55) / 0.05;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `${("ጁx"+Math.floor(exp + 3)).replace("ጁx4+", "ጁx3+")} +${d(exp%1 * 7.56)}`;
         }
  if (pVal >= 7.6 && pVal < 7.8) {
    const t = (pVal - 7.6) / 0.2;
    const start = 1.03;
    const end = 7.6;
    const exp = (start + t * (end - start));
    return `ጁx${d(exp)} +1`;
  }
  if (pVal >= 7.8 && pVal < 7.9) {
    const t = (pVal - 7.8) / 0.1;
    const start = 1.002;
    const end = 7.89;
    const exp = (start + t * (end - start));
    return `ጁ<sub>${d(exp)}</sub>ጁ`;
  }
  if (pVal >= 7.9 && pVal < 8) {
    const t = (pVal - 7.9) / 0.1;
    const start = 1.004;
    const end = 7.99;
    const exp = (start + t * (end - start));
    return `ጁ 🎇${d(exp)}🎆`;
  }
  if (pVal >= 8 && pVal < 8.02) {
    const t = (pVal - 8) / 0.02;
    const start = 1;
    const end = 8.018;
    const exp = (start + t * (end - start));
    return `Ѯ;📺${d(exp)}`;
  }
  if (pVal >= 8.02 && pVal < 8.03) {
    const t = (pVal - 8.02) / 0.01;
    const start = 1;
    const end = 8.028;
    const exp = (start + t * (end - start));
    return `Ѯ;📺📺${d(exp)}`;
  }
  if (pVal >= 8.03 && pVal < 8.1) {
    const t = (pVal - 8.03) / 0.07;
    const start = 1.003;
    const end = 8.099;
    const exp = (start + t * (end - start));
    return `Ѯ;📺📺...x${d(exp)}`;
  }
  if (pVal >= 8.1 && pVal < 8.12) {
    const t = (pVal - 8.1) / 0.02;
    const start = 1;
    const end = 8.118;
    const exp = (start + t * (end - start));
    return `ѮѮ;📺${d(exp)}`;
  }
  if (pVal >= 8.12 && pVal < 8.2) {
    const t = (pVal - 8.12) / 0.08;
    const start = 1.003;
    const end = 8.199;
    const exp = (start + t * (end - start));
    return `ѮѮ;📺📺...x${d(exp)}`;
  }
  if (pVal >= 8.2 && pVal < 8.4) {
    const t = (pVal - 8.2) / 0.2;
    const start = Math.log10(3);
    const end = 2;
    const exp = 10**(start + t * (end - start));
    return `Ѯx${Math.floor(exp)};📺${d(exp%1 * 6)}`;
  }
  if (pVal >= 8.4 && pVal < 8.7) {
    const t = (pVal - 8.4) / 0.3;
    const start = 1.02;
    const end = 8.4;
    const exp = (start + t * (end - start));
    return `Ѯx${d(exp)};📺`;
  }
  if (pVal >= 8.7 && pVal < 9) {
    const t = (pVal - 8.7) / 0.3;
    const start = 1.003;
    const end = 8.7;
    const exp = (start + t * (end - start));
    return `Ѯ<sup>${d(exp)}</sup>;📺`;
  }
  if (pVal >= 9 && pVal < 9.2) {
    const t = (pVal - 9) / 0.2;
    const start = 1;
    const end = 9;
    const exp = (start + t * (end - start));
    return `ℕ𖢣${d(exp)}`;
  }
  if (pVal >= 9.2 && pVal < 9.4) {
    const t = (pVal - 9.2) / 0.2;
    const start = 1.003;
    const end = 9.2;
    const exp = (start + t * (end - start));
    return `ℕ𖢣x${d(exp)}`;
  }
  if (pVal >= 9.4 && pVal < 9.6) {
    const t = (pVal - 9.4) / 0.2;
    const start = 1.003;
    const end = 9.4;
    const exp = (start + t * (end - start));
    return `ℕ𖢣xX${d(exp)}`;
  }
  if (pVal >= 9.6 && pVal < 9.8) {
    const t = (pVal - 9.6) / 0.2;
    const start = 1.003;
    const end = 9.6;
    const exp = (start + t * (end - start));
    return `ℕ𖢣y${d(exp)}`;
  }
  if (pVal >= 9.8 && pVal < 9.9) {
    const t = (pVal - 9.8) / 0.1;
    const start = 1.003;
    const end = 9.8;
    const exp = (start + t * (end - start));
    return `ℕ𖢣z${d(exp)}`;
  }
  if (pVal >= 9.9 && pVal < 10) {
    const t = (pVal - 9.9) / 0.1;
    const start = 1.003;
    const end = 9.9;
    const exp = (start + t * (end - start));
    return `ℕ𖢣<sub>[🔄]</sub>${d(exp)}`;
  }
 if (pVal >= 10 && pVal < 10.1) {
    const t = (pVal - 10) / 0.1;
    const start = 1.003;
    const end = 10;
    const exp = (start + t * (end - start));
    return `ℕ𖢣𖢣${d(exp)}`;
  }
 if (pVal >= 10.1 && pVal < 10.2) {
    const t = (pVal - 10.1) / 0.1;
    const start = 1.003;
    const end = 10.1;
    const exp = (start + t * (end - start));
    return `ℕ𖢣...𖢣[${d(exp)}]`;
  }
 if (pVal >= 10.2 && pVal < 10.25) {
    const t = (pVal - 10.2) / 0.05;
    const start = 1.003;
    const end = 10.21;
    const exp = (start + t * (end - start));
    return `p[${d(exp)}]`;
  }
 if (pVal > 10.25 && pVal <= 10.3) {
    const t = (pVal - 10.25) / 0.05;
    const start = 1.1;
    const end = 5;
    const k = (start * Math.pow(end / start, t));
    return `p[${"<sub>🔁</sub>".repeat(Math.floor(k))}${Math.floor(10**(10**(k%1.0)))}]`;
  }
 
 if (pVal >= 10.3 && pVal < 10.35) {
    const t = (pVal - 10.3) / 0.05;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `p[${(Math.floor(exp)+"🔂").replace("1🔂", "🔂")}${d(exp%1 * 10.3)}]`;
      }
  if (pVal >= 10.35 && pVal < 10.4) {
    const t = (pVal - 10.35) / 0.05;
    const start = 1.003;
    const end = 10.35;
    const exp = (start + t * (end - start));
    return `p[${d(exp)}🔂1]`;
  }
 if (pVal >= 10.4 && pVal < 10.45) {
    const t = (pVal - 10.4) / 0.05;
    const start = 0;
    const end = 3;
    const exp = 10**(start + t * (end - start));
    return `p[${(Math.floor(exp)+"<sub>2</sub>🔁").replace("1<sub>2</sub>🔁", "<sub>2</sub>🔁")}${d(exp%1 * 10.4)}]`;
      }
  if (pVal >= 10.45 && pVal < 10.5) {
    const t = (pVal - 10.45) / 0.05;
    const start = 1.003;
    const end = 10.4;
    const exp = (start + t * (end - start));
    return `p[${d(exp)}<sub>2</sub>🔁1]`;
  }
 if (pVal >= 10.5 && pVal < 10.6) {
    const t = (pVal - 10.5) / 0.1;
    const start = 0;
    const end = 11.999;
    const exp = (start * (end/start)**t);
    return idkwhattonamethis(exp%1, Math.floor(exp)+1);
  }
  if (pVal == 1/0) {
    return `f<sup><span class="red">‽∞‽</span></sup>(<span class="red">‽(∞)</span>)`
  }
const highestpVal = 10
  if (pVal > 10**308) {
    const t = (pVal - 10**308)/7.976931348623157e+307
    return `(<span class="blue">↻</span>↑↑${displayedValueFor(t*(100-0.2)+1.2)})<sup>${d((pVal-4.9)%(highestpVal-1) + 1)}</sup>`
}
  if (pVal > highestpVal*10**21 - 1) {
    const inverseT = (Math.log(pVal) + 3280*Math.log(10)) / (2990*Math.log(10))
    return `(<span class="blue">↻</span>↑↑` + d(inverseT) + ")<sup>" + d((pVal-4.9)%(highestpVal-1) + 1) + "</sup>"
  }
  return `(<span class="blue">↻</span>↑↑` + Math.floor((pVal-4.9)/(highestpVal-1)).toLocaleString() + ")<sup>" + d((pVal-4.9)%(highestpVal-1) + 1) + "</sup>";
}

function updateUI(){
  // update central display (fancy formatted) and small top-left numeric p
  // displayedValueFor expects a JS number; convert Decimal to Number for UI formatting
  pRaw.innerHTML = `<flip>${String(displayedValueFor(p.toNumber()))}</flip>`;
  if (pSmall) pSmall.textContent = formatNum(p.toNumber());

  // reflect current speed value visibly (no extra UI element beyond the input)
  if (speedInput) {
    // clamp display value
    const sv = parseFloat(speedInput.value);
    if (!Number.isFinite(sv)) speedInput.value = '1';
  }

  updateBackground();
}

function updateBackground(){
  // dark rainbow gradient based on p mapped from -4..4 into 0..1
  const pct = 0; // map -4..4 into 0..1
  const hue = Math.round(pct * 360); // 0..360
  const hue2 = (hue + 60) % 360;
  const hue3 = (hue + 300) % 360;
  // build a deeper, richer trio-stop gradient for dark rainbow feel
  const stop1 = `hsl(${hue} 60% 8%)`;
  const stop2 = `hsl(${hue2} 55% 10%)`;
  const stop3 = `hsl(${hue3} 50% 12%)`;
  document.body.style.background = '#000';
  // reinforce readable glow by ensuring page accents remain slightly translucent
  const sheet = document.documentElement.style;
  // no-op if not needed, left for possible future tweaks
}

// animation loop: increment p automatically at RATE_PER_SEC * speed
let lastTime = null;
function animate(timeMs) {
  if (!lastTime) lastTime = timeMs;
  const dt = (timeMs - lastTime) / 1000; // seconds
  lastTime = timeMs;

  if (animating) {
    const speed = (speedInput && !Number.isNaN(parseFloat(speedInput.value))) ? parseFloat(speedInput.value) : 1;
    // increment Decimal p using Decimal arithmetic
    p = p.plus(new Decimal(RATE_PER_SEC).times(new Decimal(speed)).times(new Decimal(dt)));
    updateUI();
  }

  requestAnimationFrame(animate);
}

// start animation immediately
requestAnimationFrame(animate);
