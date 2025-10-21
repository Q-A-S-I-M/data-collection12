import React, { useState, useRef, useEffect } from "react";
import "../App.css";

const paragraphs = [
  "Under the glowing sky, Mia whispered, 'Don't rush... just breathe.'",
  "Typing 47% faster isn’t the goal—it’s typing 100% accurately.",
  "Cats (unlike dogs) seem to know exactly when to step on keyboards.",
  "He shouted, 'Wait—what do you mean by “almost done”?'",
  "Smooth rhythm breaks the moment you type a tricky word: 'mnemonic'.",
  "SHIFT + punctuation often reveals your personal typing quirks.",
  "Pauses appear right before commas, or when your fingers hesitate.",
  "Odd symbols like @, #, and & can expose different typing tempos.",
  "Sometimes... the difference lies not in speed, but in silence.",
  "Congratulations! You've just typed what no one else typed the same way."
];

export default function TypingApp() {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [textError, setTextError] = useState("");
  const [step, setStep] = useState("name"); // name | typing | thankyou
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputText, setInputText] = useState("");

  const ikd = useRef([]);
  const prevKeyTime = useRef(null);
  const backspaces = useRef(0);
  const shiftPress = useRef(0);
  const punctuationCount = useRef(0);
  const startTime = useRef(null);
  const holdTimes = useRef([]);
  const pressedKeys = useRef({});
  const dataset = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (step === "typing") {
      inputRef.current?.focus();
    }
  }, [step, currentIndex]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setStep("typing");
      setNameError("");
    } else {
      setNameError("Please enter your name before starting.");
    }
  };

  const handleKeyDown = (e) => {
    // Disable copy-paste
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "c")) {
      e.preventDefault();
      return;
    }

    const now = performance.now();
    if (!startTime.current) startTime.current = now;

    // Inter-key delay
    if (prevKeyTime.current !== null) {
      ikd.current.push(now - prevKeyTime.current);
    }
    prevKeyTime.current = now;

    // Hold time start
    pressedKeys.current[e.key] = now;

    if (e.key === "Backspace") backspaces.current++;
    if (e.key === "Shift") shiftPress.current++;
    if (/[.,!?;:]/.test(e.key)) punctuationCount.current++;

    // Go to next paragraph on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  const handleKeyUp = (e) => {
    const now = performance.now();
    if (pressedKeys.current[e.key]) {
      holdTimes.current.push(now - pressedKeys.current[e.key]);
      delete pressedKeys.current[e.key];
    }
  };

  const handleNext = () => {
    if (inputText.trim().length === 0) {
      setTextError("Please type the sentence before pressing Enter.");
      inputRef.current?.focus();
      return;
    }

    setTextError("");

    const totalTime = performance.now() - startTime.current;
    const avgIKD = ikd.current.length
      ? ikd.current.reduce((a, b) => a + b) / ikd.current.length
      : 0;
    const avgHold = holdTimes.current.length
      ? holdTimes.current.reduce((a, b) => a + b) / holdTimes.current.length
      : 0;

    dataset.current.push({
      name,
      paragraphIndex: currentIndex + 1,
      totalKeystrokes: inputText.length,
      totalTime: totalTime.toFixed(2),
      averageIKD: avgIKD.toFixed(2),
      averageHoldTime: avgHold.toFixed(2),
      backspaceCount: backspaces.current,
      shiftPressCount: shiftPress.current,
      punctuationCount: punctuationCount.current,
      typedText: inputText
    });

    // Reset state for next paragraph
    setInputText("");
    ikd.current = [];
    holdTimes.current = [];
    prevKeyTime.current = null;
    backspaces.current = 0;
    shiftPress.current = 0;
    punctuationCount.current = 0;
    pressedKeys.current = {};
    startTime.current = null;

    if (currentIndex + 1 < paragraphs.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    localStorage.setItem("typingDataset", JSON.stringify(dataset.current));
    setStep("thankyou");
  };

  return (
    <div className="app-container">
      {step === "name" && (
        <div className="card animate-up">
          <h1>Enter your name</h1>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
            />
            <button type="submit">Start</button>
          </form>
          {nameError && <p className="error">{nameError}</p>}
        </div>
      )}

      {step === "typing" && (
        <div className="card animate-up">
          <h2>
            Paragraph {currentIndex + 1} of {paragraphs.length}
          </h2>
          <p className="paragraph">{paragraphs[currentIndex]}</p>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            placeholder="Start typing here..."
          />
          {textError && <p className="error">{textError}</p>}
          <p className="hint">Press Enter to continue</p>
        </div>
      )}

      {step === "thankyou" && (
        <div className="card animate-up">
          <h1>Thank You!</h1>
        </div>
      )}
    </div>
  );
}
