import { GoogleGenAI } from "@google/genai";
import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  generatePromptsForSingleParagraph,
  type ScenePrompt,
  type PromptsApiResponse,
  type StorySegment
} from "./api";

const App = () => {
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState(640);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptsResult, setPromptsResult] = useState<PromptsApiResponse | null>(null);
  const [copyScriptStatus, setCopyScriptStatus] = useState("Copy Script");
  const [copyPromptsStatus, setCopyPromptsStatus] = useState("Copy All Prompts");

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY! }), []);

  const DURATION_PER_PROMPT = 6;

  const handleCopy = async (text: string, setStatus: React.Dispatch<React.SetStateAction<string>>, defaultText: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied!");
      setTimeout(() => setStatus(defaultText), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setStatus("Failed to copy");
      setTimeout(() => setStatus(defaultText), 2000);
    }
  };

  const handleCopyScript = () => {
    if (!promptsResult) return;
    const scriptText = promptsResult.story.map(s => s.paragraph).join('\n\n');
    handleCopy(scriptText, setCopyScriptStatus, 'Copy Script');
  };

  const handleCopyPrompts = () => {
    if (!promptsResult) return;
    const promptsText = promptsResult.story
      .flatMap(segment => segment.prompts)
      .map(
        (p) =>
          `Subjects: ${p.main_subjects}. Setting: ${p.setting}. Action: ${p.action}. Style: ${p.style}. Camera: ${p.camera}. Lighting: ${p.lighting}. Sound: ${p.sound}${p.negative ? `. Negative: ${p.negative}` : ''}`
      )
      .join('\n\n');
    handleCopy(promptsText, setCopyPromptsStatus, 'Copy All Prompts');
  };

  const handleGeneratePrompts = async () => {
    if (!idea || duration <= 0) {
      setError("Please provide a valid script and duration.");
      return;
    }
    setLoadingPrompts(true);
    setError(null);
    setPromptsResult(null);

    try {
        const providedScript = idea.split(/\n\s*\n/).filter(p => p.trim() !== '');
  
        if (providedScript.length === 0) {
          setError("Please provide a script with at least one paragraph.");
          setLoadingPrompts(false);
          return;
        }

        const promises = providedScript.map(paragraph => 
            generatePromptsForSingleParagraph(paragraph, ai, DURATION_PER_PROMPT)
        );

        const results = await Promise.allSettled(promises);
        
        const successfulSegments: StorySegment[] = [];
        const failedIndices: number[] = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulSegments.push(result.value);
            } else {
                console.error(`Failed to process paragraph ${index + 1}:`, result.reason);
                failedIndices.push(index + 1);
            }
        });

        if (failedIndices.length > 0) {
            setError(`Error: Failed to generate prompts for paragraph(s) ${failedIndices.join(', ')}. Displaying successful results only.`);
        }

        if (successfulSegments.length === 0) {
            if (!error) { 
                 setError("An error occurred while generating the prompts. All requests failed. Please try again.");
            }
            setPromptsResult(null);
            setLoadingPrompts(false);
            return; 
        }

        let sceneCounter = 1;
        const finalStory = successfulSegments.map(segment => ({
            ...segment,
            prompts: segment.prompts.map(prompt => ({
                ...prompt,
                scene_id: sceneCounter++
            }))
        }));

        const negativePromptText = "no text";
        const framingAndResolutionText = "Hyper-realistic, 8K resolution, 60fps, cinematic lighting—preserve the background and aspect ratio";
        
        const resultWithEnhancements: PromptsApiResponse = {
          story: finalStory.map(segment => ({
            ...segment,
            prompts: segment.prompts.map(prompt => ({
              ...prompt,
              style: `${(prompt.style || "").trim().replace(/\.$/, '')}. ${framingAndResolutionText}`,
              negative: negativePromptText,
            }))
          }))
        };
        
        setPromptsResult(resultWithEnhancements);

    } catch (e) {
        console.error("Parallel processing error:", e);
        setError("An error occurred while generating the prompts. Please try again.");
    } finally {
        setLoadingPrompts(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text').trim();
    
    if (!pastedText) return;
  
    const sentences = pastedText
      .replace(/(\r\n|\n|\r)/gm, " ") 
      .replace(/\s+/g, ' ')
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  
    if (sentences.length <= 1) { 
        const target = event.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const currentText = idea;
        const newText = currentText.substring(0, start) + pastedText + currentText.substring(end);
        setIdea(newText);
        return;
    }
    
    const paragraphs = [];
    const chunkSize = 8;
  
    for (let i = 0; i < sentences.length; i += chunkSize) {
      const chunk = sentences.slice(i, i + chunkSize);
      paragraphs.push(chunk.join(' '));
    }
  
    const formattedText = paragraphs.join('\n\n');
  
    const target = event.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentText = idea;
    const newText = currentText.substring(0, start) + formattedText + currentText.substring(end);
    setIdea(newText);
  };

  return (
    <main>
      <header>
        <h1>Cosmic Canvas: Space Documentary Prompt Generator</h1>
        <p className="description">
            Generate detailed visual prompts from your script for a space science documentary, using a curated set of RAW Astrophotography styles.
        </p>
      </header>

      <div className="form-container" role="form" aria-labelledby="form-heading">
        <h2 id="form-heading" className="sr-only">Generator Inputs</h2>
        <div className="form-group">
          <label htmlFor="idea-input">Your Documentary Script</label>
          <textarea
            id="idea-input"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste your full documentary script here. It will be auto-formatted into paragraphs."
            rows={5}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="duration-input">Total Video Duration (seconds)</label>
          <input
            id="duration-input"
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
            min="1"
            required
          />
        </div>
        <button onClick={handleGeneratePrompts} disabled={loadingPrompts}>
          {loadingPrompts ? "Generating Prompts..." : "✨ Generate Prompts"}
        </button>
      </div>
      
      <section className="results-container" aria-live="polite">
        {loadingPrompts && (
          <div className="loading">
            <div className="loader" role="status" aria-label="Loading"></div>
            <p>Generating prompts from your script... This may take a moment.</p>
          </div>
        )}
        {error && <div className="error">{error}</div>}

        {promptsResult && (
          <div className="story-section">
            <div className="section-header">
              <h2>Script & Prompts</h2>
              <div className="button-group">
                <button onClick={handleCopyScript} className="button-secondary">{copyScriptStatus}</button>
                <button onClick={handleCopyPrompts} className="button-secondary">{copyPromptsStatus}</button>
              </div>
            </div>
            {promptsResult.story.map((segment, index) => (
              <article key={index} className="paragraph-card">
                <h2>Paragraph {index + 1}</h2>
                <p className="paragraph-text">"{segment.paragraph}"</p>
                <div className="prompts-grid">
                  {segment.prompts.map((prompt) => (
                    <div key={prompt.scene_id} className="prompt-card">
                      <h3>Scene {prompt.scene_id}: {prompt.title}</h3>
                      <div className="prompt-details">
                        <p>
                            <strong>Subjects:</strong> {prompt.main_subjects}
                            {' '}<strong>Setting:</strong> {prompt.setting}
                            {' '}<strong>Action:</strong> {prompt.action}
                            {' '}<strong>Style:</strong> {prompt.style}
                            {' '}<strong>Camera:</strong> {prompt.camera}
                            {' '}<strong>Lighting:</strong> {prompt.lighting}
                            {' '}<strong>Sound:</strong> {prompt.sound}
                        </p>
                        {prompt.negative && (
                          <p className="negative">
                              <strong>Negative:</strong> {prompt.negative}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      
      <div aria-live="assertive" className="sr-only">
        {loadingPrompts && <p>Content is loading.</p>}
        {promptsResult && <p>Content has loaded.</p>}
        {error && <p>An error occurred: {error}</p>}
      </div>
    </main>
  );
};

const style = document.createElement('style');
style.textContent = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;
document.head.appendChild(style);


const root = createRoot(document.getElementById("root")!);
root.render(<App />);