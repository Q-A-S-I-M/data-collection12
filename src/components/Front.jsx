import React, { useState, useEffect, useCallback } from "react";
import "../App.css";

// A local "database" of sentences to avoid API failures
const CHALLENGE_QUOTES = [
  "Technology is changing how we interact with the world every single day. The way we type reveals subtle patterns.",
  "Every slight hesitation before a complex word and every burst of speed through familiar phrases tells a story.",
  "The ability to communicate effectively through a keyboard has become a fundamental skill in the modern digital era.",
  "Observation of these nuances provides deep insight into human-computer interaction and biometric security systems.",
  "Precision is often more important than raw speed when attempting to build a reliable machine learning model.",
  "A quick movement of the hands across the rows of keys can produce a wide array of unique rhythmic results."
];

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
  paragraphs,
  getProcessedDataForAPI,
  clearKeystrokes
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mode, setMode] = useState(null); 
  
  const [testInput, setTestInput] = useState("");
  const [predictedUser, setPredictedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testParagraph, setTestParagraph] = useState("");

  // --- Logic to pick a random local quote ---
  const pickNewLocalQuote = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * CHALLENGE_QUOTES.length);
    setTestParagraph(CHALLENGE_QUOTES[randomIndex]);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTestSubmit = async () => {
    const featureData = getProcessedDataForAPI();

    if (!featureData || testInput.trim().length < testParagraph.length * 0.4) {
      alert("Please type more of the sentence before submitting.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("https://keystroke-dynamics-model-hosting-production.up.railway.app/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featureData),
      });

      const data = await response.json();
      setPredictedUser(data.predicted_user || data.prediction); 
    } catch (error) {
      console.error("Error fetching prediction:", error);
      setPredictedUser("Error: Could not predict");
    } finally {
      setIsLoading(false);
    }
  };

  const onTestKeyDown = (e) => {
    handleKeyDown(e);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); 
      handleTestSubmit();
    }
  };

  const enterTestingMode = () => {
    clearKeystrokes(); 
    setTestInput("");
    setPredictedUser(null);
    setMode("testing");
    pickNewLocalQuote(); // Instant, no API wait!
  };

  return (
    <div className="app-container">
      {!isMobile && (
        <>
          {!mode && (
            <div className="card animate-up">
              <h1>Select Mode</h1>
              <div className="button-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button onClick={() => setMode("collection")}>Data Collection</button>
                <button onClick={enterTestingMode}>Testing</button>
              </div>
            </div>
          )}

          {mode === "collection" && (
            <>
              {step === "name" && (
                <div className="card animate-up">
                  <h1>Enter your name</h1>
                  <form onSubmit={handleNameSubmit}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus required />
                    <button type="submit">Start</button>
                  </form>
                </div>
              )}

              {step === "typing" && currentIndex < paragraphs.length && (
                <div className="card animate-up">
                  <h2>Paragraph {currentIndex + 1} of {paragraphs.length}</h2>
                  <p className="paragraph">{paragraphs[currentIndex]}</p>
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    placeholder="Please type the above sentence..."
                    autoFocus
                  />
                  <p className="hint">Press Enter to continue</p>
                </div>
              )}

              {step === "thankyou" && (
                <div className="card animate-up">
                  <h1>Thank You, {name}!</h1>
                  <p>Your data have been saved.</p>
                  <button onClick={() => window.location.reload()}>Finish</button>
                </div>
              )}
            </>
          )}

          {mode === "testing" && (
            <div className="card animate-up">
              <h1>Testing Mode</h1>
              
              {isLoading ? (
                <div className="loading-spinner">Processing typing patterns...</div>
              ) : predictedUser ? (
                <div className="result-area">
                  <h2 style={{ color: '#4CAF50' }}>Predicted User: {predictedUser}</h2>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                    <button onClick={() => { 
                      setPredictedUser(null); 
                      setTestInput(""); 
                      clearKeystrokes(); 
                      pickNewLocalQuote(); 
                    }}>Try Again</button>
                    <button onClick={() => setMode(null)} style={{ backgroundColor: '#666' }}>Exit</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="paragraph">{testParagraph}</p>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={onTestKeyDown}
                    onKeyUp={handleKeyUp}
                    placeholder="Type the sentence and press Enter..."
                    autoFocus
                  />
                  <p className="hint">Press Enter to predict user identity</p>
                  <div style={{ marginTop: '20px' }}>
                    <button onClick={() => setMode(null)} style={{ backgroundColor: '#666' }}>Back</button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Front;