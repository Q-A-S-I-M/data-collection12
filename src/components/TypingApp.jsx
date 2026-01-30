import React, { useState, useRef, useEffect, useCallback } from "react";
import { ref, set, push } from "firebase/database";
import { db } from "../firebaseConfig";
import Front from "./Front";

const paragraphs = [
  "Liam typed the last word, paused, and smiled at the glowing screen.",
  "Ella asked softly, 'Did you just skip a key or press it twice?'",
  "Typing calm words like 'sad' or 'tap' feels smooth and steady.",
  "Quick hands stumble on words like 'jump' and 'vex' without warning.",
  "Nora stopped for a breath, then typed again, steady and sure.",
  "Letters far apart make the rhythm break, then return with ease.",
  "Slow moments appear between small words, not in the long ones.",
  "Theo whispered, 'Keep calm, just type what you see, not what you think.'",
  "Sometimes a pause feels longer than the word that follows it.",
  "The line ended quietly, leaving a soft click as the last key fell."
];

export default function TypingApp() {
  const [step, setStep] = useState("name");
  const [name, setName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputText, setInputText] = useState("");

  const inputRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);
  const keystrokeData = useRef([]);
  const pressedKeys = useRef({});
  const modifiers = useRef({ Shift: false, Ctrl: false, Alt: false, Meta: false });

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // ----------------- UTIL HELPERS -----------------
  function getKeyArray(data) {
    return (data || [])
      .filter(d => d && !d.type && d.timeDown !== undefined)
      .map(d => ({
        ...d,
        timeUp: d.timeUp ?? d.timeDown,
      }))
      .sort((a, b) => a.timeDown - b.timeDown);
  }

  function getDelaysFromKeys(keys) {
    const delays = [];
    for (let i = 0; i < keys.length - 1; i++) {
      const up = keys[i].timeUp ?? keys[i].timeDown;
      const nextDown = keys[i + 1].timeDown;

      const delay = nextDown - up;
      delays.push(delay);
    }
    return delays;
  }

  function getIKDArray(keys, multiplier = 3) {
    const ikd = [];
    for (let i = 1; i < keys.length; i++) {
      const d = keys[i].timeDown - keys[i - 1].timeDown;
      if (d > 0) ikd.push(d);
    }
    const m = mean(ikd);
    const sd = stdDev(ikd);
    return ikd.filter(v => v <= m + multiplier * sd);
  }


  function getHoldTimes(keys) {
      return keys
        .map(k => {
          if (!k.timeUp || k.timeUp < k.timeDown) return 0;
          return k.timeUp - k.timeDown;
        })
        .filter(v => !isNaN(v)); 
    }


  function mean(arr) {
    if (!arr?.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function median(arr) {
  if (!arr?.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
}

  function stdDev(arr, sample = false) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((s, x) => s + (x - m) ** 2, 0) / (sample ? arr.length - 1 : arr.length);
  return Math.sqrt(variance);
}

  // ----------------- FEATURE CALCULATORS -----------------

  function averageHoldTime(data) {
    const keys = getKeyArray(data);
    const holdTimes = getHoldTimes(keys);
    return holdTimes.length > 0 ? mean(holdTimes) : 0;
}

  function holdTimeStdDev(data) {
    const keys = getKeyArray(data);
    const holdTimes = getHoldTimes(keys);
    return stdDev(holdTimes);
}

  function averageIKD(data) {
  const keys = getKeyArray(data);
  const ikd = getIKDArray(keys)
    .filter(v => Number.isFinite(v) && v > 0); 
  
  return ikd.length ? mean(ikd) : 0;
}

  function medianIKD(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys);
    return median(ikd);
  }

  function ikdStdDev(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys);
    return stdDev(ikd);
  }

  function entropyOfIKD(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys).filter(v => Number.isFinite(v) && v > 0 && v < 5000);
    
    if (ikd.length < 10) return 0; 
    
    const binEdges = [0, 50, 100, 150, 200, 300, 500, 1000, 2000, 5000];
    const bins = new Array(binEdges.length - 1).fill(0);
    
    let classifiedCount = 0;
    ikd.forEach(v => {
        for (let i = 0; i < binEdges.length - 1; i++) {
            if (v >= binEdges[i] && v < binEdges[i + 1]) {
                bins[i]++;
                classifiedCount++;
                return;
            }
        }
        if (v === 5000) {
            bins[bins.length - 1]++;
            classifiedCount++;
        }
    });
    
    if (classifiedCount === 0) return 0;
    
    const probs = bins.map(b => b / classifiedCount).filter(p => p > 0);
    
    if (probs.length <= 1) return 0;
    
    const entropy = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
    
    const maxEntropy = Math.log2(probs.length);
    return entropy / maxEntropy;
}

function skewnessOfIKD(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys).filter(v => v > 0 && v < 10000); 
    if (ikd.length < 2) return 0;
    const m = mean(ikd);
    const sd = stdDev(ikd);
    if (sd === 0) return 0;
    const n = ikd.length;
    const g = ikd.reduce((s,x) => s + Math.pow((x - m), 3), 0) / n;
    return g / Math.pow(sd, 3);
}
function autocorrLag1IKD(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys).filter(v => v > 0 && v < 10000);
    if (ikd.length < 2) return 0;
    const m = mean(ikd);
    const num = ikd.slice(0, -1).reduce((s, x, i) => s + (x - m) * (ikd[i+1] - m), 0);
    const den = ikd.reduce((s, x) => s + Math.pow(x - m, 2), 0);
    return den === 0 ? 0 : num / den;
}

  const COGNITIVE_PAUSE_THRESHOLD = 500; 

function pauseCount(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys);
    return ikd.filter(d => d > COGNITIVE_PAUSE_THRESHOLD).length;
}

function averagePauseLength(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys);
    const pauses = ikd.filter(d => d > COGNITIVE_PAUSE_THRESHOLD);
    return pauses.length > 0 ? mean(pauses) : 0;
}

  function burstCount(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys);
    if (!ikd.length) return keys.length ? 1 : 0;
    
    let bursts = 1; 
    for (const d of ikd) {
        if (d > COGNITIVE_PAUSE_THRESHOLD) bursts++;
    }
    return bursts;
}
function burstAnalysis(data) {
    const keys = getKeyArray(data);
    const ikd = getIKDArray(keys); 
    
    if (!keys.length) return { count: 0, averageLength: 0, maxLength: 0 };
    
    const bursts = [];
    let currentBurst = 1; 
    
    for (let i = 0; i < ikd.length; i++) {
        if (ikd[i] > COGNITIVE_PAUSE_THRESHOLD) {
            bursts.push(currentBurst);
            currentBurst = 1;
        } else {
            currentBurst++;
        }
    }
    
    if (currentBurst > 0) {
        bursts.push(currentBurst);
    }
    
    return {
        count: bursts.length,
        averageLength: bursts.length > 0 ? mean(bursts) : 0,
        maxLength: bursts.length > 0 ? Math.max(...bursts) : 0,
        totalKeys: keys.length,
        burstLengths: bursts
    };
}

  function averageBurstLength(data) {
    const analysis = burstAnalysis(data);
    return analysis.averageLength;
}

function maxBurstLength(data) {
    const analysis = burstAnalysis(data);
    return analysis.maxLength;
}

  function backspaceCount(data) {
    const keys = getKeyArray(data);
    return keys.filter(k => k.key === "Backspace").length;
}

function backspaceRatio(data) {
    const keys = getKeyArray(data);
    const total = keys.length;
    if (!total) return 0;
    return backspaceCount(data) / total;
}

  function correctionLatencyMean(data) {
    const keys = getKeyArray(data);
    const latencies = [];
    
    for (let i = 1; i < keys.length; i++) {
        if (keys[i].key === "Backspace" && keys[i-1].key !== "Backspace") {
            const latency = keys[i].timeDown - keys[i-1].timeUp;
            if (latency >= 0 && latency < 10000) {
                latencies.push(latency);
            }
        }
    }
    
    return latencies.length > 0 ? mean(latencies) : 0;
}

  function errorRate(data) {
    const keys = getKeyArray(data);
    const valid = keys.filter(k => !["Shift","Control","Alt","Meta"].includes(k.key));
    if (!valid.length) return 0;
    const backs = valid.filter(k => k.key === "Backspace").length;
    return backs / valid.length;
}

  function shiftPressCount(data) {
    const keys = getKeyArray(data);
    return keys.filter(k => k.key === "Shift").length;
  }

  function tempoChangeRate(data) {
    const keys = getKeyArray(data);
    if (keys.length < 3) return 0;
    const ikd = getIKDArray(keys).filter(v => v > 0); 
    if (ikd.length < 2) return 0;
    
    let changes = 0;
    for (let i = 1; i < ikd.length; i++) {
        const prev = ikd[i-1];
        const cur = ikd[i];
        const change = Math.abs(cur - prev) / prev;
        if (change > 0.25) changes++;
    }
    return changes / (ikd.length - 1);
}

  function typingSpeedWPM(data) {
    const keys = getKeyArray(data);
    if (keys.length < 10) return 0;
    
    const firstKey = keys[0];
    const lastKey = keys[keys.length - 1];
    const totalTimeMinutes = (lastKey.timeDown - firstKey.timeDown) / 60000;
    
    if (totalTimeMinutes <= 0) return 0;
    
    const wordCount = keys.filter(k => k.key === ' ').length + 1;
    return Math.round(wordCount / totalTimeMinutes);
}

  function commonDigraphTiming(data) {
    const keys = getKeyArray(data);
    const digraphs = {};
    
    for (let i = 1; i < keys.length; i++) {
        const pair = (keys[i-1].key + keys[i].key).toLowerCase();
        if (/^[a-z]{2}$/.test(pair)) {
            const time = keys[i].timeDown - keys[i-1].timeDown;
            if (!digraphs[pair]) digraphs[pair] = [];
            digraphs[pair].push(time);
        }
    }
    
    const commonPairs = ['th', 'he', 'in', 'er', 'an', 're', 'nd', 'at', 'on', 'nt'];
    
    const features = {};
    commonPairs.forEach(pair => {
        features[`digraph_${pair}`] = digraphs[pair] ? mean(digraphs[pair]) : 0;
    });
    
    return features;
}

  // ----------------- PROCESS PARAGRAPHS -----------------
  const processParagraphData = useCallback(() => {
    const allData = keystrokeData.current || [];

    const grouped = {};
    for (const entry of allData) {
      const idx = entry.paragraphIndex || 0;
      if (!grouped[idx]) grouped[idx] = [];
      grouped[idx].push(entry);
    }

    const paragraphFeatures = [];

    const sortedKeys = Object.keys(grouped).map(k => Number(k)).sort((a,b)=>a-b);

    for (const idx of sortedKeys) {
      const group = grouped[idx];
      const keys = getKeyArray(group);

      const features = {
        name: name.trim(),
        avgHoldTime: +(averageHoldTime(group) || 0).toFixed(3),
        holdTimeStdDev: +(holdTimeStdDev(group) || 0).toFixed(3),
        avgIKD: +(averageIKD(group) || 0).toFixed(3),
        medianIKD: +(medianIKD(group) || 0).toFixed(3),
        ikdStdDev: +(ikdStdDev(group) || 0).toFixed(3),
        pauseCount: pauseCount(group),
        avgPauseLength: +averagePauseLength(group).toFixed(3),
        burstCount: burstCount(group),
        avgBurstLength: +averageBurstLength(group).toFixed(3),
        maxBurstLength: maxBurstLength(group),
        backspaceCount: backspaceCount(group),
        backspaceRatio: +backspaceRatio(group).toFixed(3),
        correctionLatencyMean: +correctionLatencyMean(group).toFixed(3),
        errorRate: +errorRate(group).toFixed(3),
        shiftPressCount: shiftPressCount(group),
        tempoChangeRate: +tempoChangeRate(group).toFixed(3),
        typingSpeedWPM: typingSpeedWPM(group),
        entropyIKD: +entropyOfIKD(group).toFixed(3),
        skewnessIKD: +skewnessOfIKD(group),
        autocorrLag1IKD: +autocorrLag1IKD(group),
        commonDigraphTiming: +mean(Object.values(commonDigraphTiming(group))).toFixed(3) || 0
      };

      paragraphFeatures.push(features);
    }

    console.log("📊 Paragraph-by-paragraph features (full):", paragraphFeatures);
    localStorage.setItem("processedFeaturesFull", JSON.stringify({
      user: name.trim(),
      generatedAt: new Date().toISOString(),
      paragraphs: paragraphFeatures
    }));

    try {
      console.table(paragraphFeatures.map(p => {
        return {
          name: name,
          avgHoldTime: p.avgHoldTime,
          holdTimeStdDev: p.holdTimeStdDev,
          avgIKD: p.avgIKD,
          medianIKD: p.medianIKD,
          ikdStdDev: p.ikdStdDev,
          pauseCount: p.pauseCount,
          avgPauseLength: p.avgPauseLength,
          burstCount: p.burstCount,
          avgBurstLength: p.avgBurstLength,
          maxBurstLength: p.maxBurstLength,
          backspaceCount: p.backspaceCount,
          backspaceRatio: p.backspaceRatio,
          correctionLatencyMean: p.correctionLatencyMean,
          errorRate: p.errorRate,
          shiftPressCount: p.shiftPressCount,
          tempoChangeRate: p.tempoChangeRate,
          typingSpeedWPM: p.typingSpeedWPM,
          entropyIKD: p.entropyIKD,
          skewnessIKD: p.skewnessIKD,
          autocorrLag1IKD: p.autocorrLag1IKD,
          commonDigraphTiming: p.commonDigraphTiming
        };
      }));
    } catch (e) {
    }
    const userRef = push(ref(db, "data"));
    set(userRef, {
      features: paragraphFeatures,
    })
      .then(() => console.log("✅ Data stored in Firebase"))
      .catch((err) => console.error("❌ Firebase Error:", err));
    return paragraphFeatures;
  }, [name]);

const handleNext = useCallback((typedValue) => {
  const now = performance.now();
  const paraIndex = currentIndexRef.current;
  const expected = paragraphs[paraIndex].trim();

  if (typedValue.trim() !== expected) {
    alert("You must type the full paragraph correctly before proceeding.");

    setInputText("");

    keystrokeData.current = keystrokeData.current.filter(
      (entry) => entry.paragraphIndex !== paraIndex + 1
    );

    pressedKeys.current = {};
    modifiers.current = { Shift: false, Ctrl: false, Alt: false, Meta: false };

    setTimeout(() => inputRef.current?.focus(), 0);
    return;
  }

  keystrokeData.current.push({
    type: "PARAGRAPH_END",
    paragraphIndex: paraIndex + 1,
    time: now,
    textTyped: typedValue,
  });

  setInputText("");
  pressedKeys.current = {};

  const nextIndex = paraIndex + 1;
  if (nextIndex < paragraphs.length) {
    setCurrentIndex(nextIndex);
    currentIndexRef.current = nextIndex;
    setTimeout(() => inputRef.current?.focus(), 0);
  } else {
    const raw = { user: name.trim(), data: keystrokeData.current };
    localStorage.setItem("rawKeystrokeData", JSON.stringify(raw));
    processParagraphData();
    setStep("thankyou");
  }
}, [name, paragraphs, processParagraphData]);

const handleKeyDown = useCallback((e) => {
  const now = performance.now();

  if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "c")) {
    e.preventDefault();
    return;
  }

  if (e.key === "Enter") {
    if (step === "typing") {
      e.preventDefault();
      const val = inputRef.current?.value ?? "";
      if (!val.trim()) {
        alert("Please type the sentence before pressing Enter.");
        inputRef.current?.focus();
        return;
      }
      handleNext(val.trim());
      return;
    }
    return; 
  }

  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
    modifiers.current[e.key === "Control" ? "Ctrl" : e.key] = true;
  }

  pressedKeys.current[e.code] = now;
  keystrokeData.current.push({
    paragraphIndex: currentIndexRef.current + 1,
    key: e.key,
    code: e.code,
    timeDown: now,
    timeUp: null,
  });
}, [handleNext]);

const handleKeyUp = useCallback((e) => {
  const now = performance.now();

  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
    modifiers.current[e.key === "Control" ? "Ctrl" : e.key] = false;
  }

  const reverseIndex = [...keystrokeData.current]
    .reverse()
    .findIndex(entry => entry.code === e.code && entry.timeUp === null);

  if (reverseIndex !== -1) {
    const actualIndex = keystrokeData.current.length - 1 - reverseIndex;
    keystrokeData.current[actualIndex].timeUp = now;
  }

  delete pressedKeys.current[e.code];
}, []);

const handleNameSubmit = (e) => {
  e.preventDefault();
  if (!name.trim()) return;
  keystrokeData.current = [];
  pressedKeys.current = {};
  modifiers.current = { Shift: false, Ctrl: false, Alt: false, Meta: false };
  setCurrentIndex(0);
  currentIndexRef.current = 0;
  setInputText("");
  setStep("typing");
};

const calculateFeatures = (data, userName) => {
    if (!data || data.length === 0) return null;

    return {
        avgHoldTime: +(averageHoldTime(data) || 0).toFixed(3),
        medianIKD: +(medianIKD(data) || 0).toFixed(3),
        holdTimeStdDev: +(holdTimeStdDev(data) || 0).toFixed(3),
        tempoChangeRate: +tempoChangeRate(data).toFixed(3),
        typingSpeedWPM: typingSpeedWPM(data),
        entropyIKD: +entropyOfIKD(data).toFixed(3),
        maxBurstLength: maxBurstLength(data),
        commonDigraphTiming: +mean(Object.values(commonDigraphTiming(data))).toFixed(3) || 0,
        skewnessIKD: +skewnessOfIKD(data),
        ikdStdDev: +(ikdStdDev(data) || 0).toFixed(3),
        correctionLatencyMean: +correctionLatencyMean(data).toFixed(3),
        backspaceRatio: +backspaceRatio(data).toFixed(3)
    };
};

const getProcessedDataForAPI = useCallback(() => {
    return calculateFeatures(keystrokeData.current);
}, [name]);

// ----------------- UI -----------------
return (
  <Front
    step={step}
    name={name}
    setName={setName}
    currentIndex={currentIndex}
    inputText={inputText}
    setInputText={setInputText}
    inputRef={inputRef}
    handleNameSubmit={handleNameSubmit}
    handleKeyDown={handleKeyDown}
    handleKeyUp={handleKeyUp}
    paragraphs={paragraphs}
    getProcessedDataForAPI={getProcessedDataForAPI}
    clearKeystrokes={() => { keystrokeData.current = []; }}
  />
);

}
