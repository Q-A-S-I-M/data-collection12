import React, { useState, useEffect, useRef } from "react";
import "../App.css";

function Front({
  step,
  name,
  setName,
  currentIndex,
  inputText,
  setInputText,
  inputRef,
  handleNameSubmit,
  handleKeyDown,
  handleKeyUp,
  paragraphs
}) {

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ----------------- UI -----------------
  return (
    <div className="app-container">
      {/* 🚫 Mobile/tablet blocking screen */}
      {isMobile && (
        <div className="mobile-block">
          <div className="card animate-up">
            <h1>Desktop Only</h1>
            <p>
              This typing experiment needs a full keyboard and works only on
              desktops or laptops.
            </p>
            <p className="note">
              Please open this site on a computer to continue.
            </p>
          </div>
        </div>
      )}

      {/* ✅ Main App (hidden if mobile) */}
      {!isMobile && (
        <>
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
            </div>
          )}

          {step === "typing" && currentIndex < paragraphs.length && (
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
                placeholder="Please type the above sentence here..."
                autoFocus
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()} 
                onDrop={(e) => e.preventDefault()}
                style={{
                  userSelect: "none",
                  pointerEvents: "auto",
                }}
              />
              <p className="hint">Press Enter to continue</p>
            </div>
          )}

          {step === "thankyou" && (
            <div className="card animate-up">
              <h1>Thank You, {name}!</h1>
              <p>Your data have been saved.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Front;
