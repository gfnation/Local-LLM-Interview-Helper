import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './index.css';

interface Question {
  id: number;
  topic: string;
  question: string;
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [idealAnswer, setIdealAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [hasDetailed, setHasDetailed] = useState(false);
  const [grounded, setGrounded] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [deepDive, setDeepDive] = useState<{ concept: string, explanation: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedback || loading || loadingDetailed) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feedback, loading, loadingDetailed]);

  useEffect(() => {
    fetch('http://localhost:5001/api/questions')
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((err) => console.error(err));

    fetch('http://localhost:5001/api/models')
      .then((res) => res.json())
      .then((availableModels) => {
        if (Array.isArray(availableModels) && availableModels.length > 0) {
          setModels(availableModels);
          // Set primary model if available, otherwise just use the first one
          if (availableModels.includes('llama3.1:8b')) {
            setModel('llama3.1:8b');
          } else if (availableModels.includes('qwen2.5-coder:7b')) {
            setModel('qwen2.5-coder:7b');
          } else {
            setModel(availableModels[0]);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const getRandomQuestion = () => {
    if (questions.length === 0) return;
    const randomIndex = Math.floor(Math.random() * questions.length);
    setCurrentQuestion(questions[randomIndex]);
    setAnswer('');
    setFeedback('');
    setIdealAnswer('');
    setDeepDive(null);
    setHasDetailed(false);
  };

  const submitAnswer = async (detailed = false) => {
    if (!currentQuestion || !answer.trim()) return;

    if (detailed) {
      setLoadingDetailed(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('http://localhost:5001/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer,
          model,
          detailed,
          grounded,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get evaluation');
      }

      if (detailed) {
        setIdealAnswer(data.feedback);
        setHasDetailed(true);
      } else {
        setFeedback(data.feedback);
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message.includes('timeout')
        ? 'Evaluation timed out. The model is taking too long to respond. Try a smaller model or try again.'
        : `Error: ${error.message}`;
      setFeedback(prev => prev + '\n\n' + errorMsg);
    } finally {
      if (detailed) {
        setLoadingDetailed(false);
      } else {
        setLoading(false);
      }
    }
  };

  const getDeepDive = async (concept: string) => {
    setLoadingDeepDive(true);
    setDeepDive(null);
    try {
      const response = await fetch('http://localhost:5001/api/deep_dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, model, grounded }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDeepDive({ concept, explanation: data.explanation });
    } catch (error: any) {
      console.error(error);
      setDeepDive({ concept, explanation: `Error: ${error.message}` });
    } finally {
      setLoadingDeepDive(false);
    }
  };

  const MarkdownContent = ({ content }: { content: string }) => {
    // Transform [concept:Term] into [Term](concept:concept_Term) 
    // We use a prefix that Markdown won't try to "fix" or encode prematurely
    const transformedContent = content.replace(/\[concept:\s*([^\]]+)\]/g, (_, p1) => {
      const encoded = p1.trim().replace(/\s+/g, '%20');
      return `[${p1}](#concept-${encoded})`;
    });

    return (
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('#concept-')) {
              const concept = decodeURIComponent(href.replace('#concept-', ''));
              return (
                <button
                  className="concept-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    getDeepDive(concept);
                  }}
                  disabled={loadingDeepDive}
                  type="button"
                >
                  {children}
                </button>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          },
          // Ensure code blocks look good
          code({ inline, className, children, ...props }: any) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {transformedContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className="container">
      <header className="header">
        <h1>AI Interview Prep</h1>
        <div className="model-selector">
          <label>Evaluation Model: </label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))
            ) : (
              <option disabled>No models found</option>
            )}
          </select>
        </div>
        <div className="grounding-toggle">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={grounded}
              onChange={(e) => setGrounded(e.target.checked)}
            />
            <span className="switch-text">Search Web</span>
          </label>
        </div>
      </header>

      <main className="main-content">
        <section className="card question-card">
          <h2>Interview Question</h2>
          {currentQuestion ? (
            <div className="question-text">
              <span className="badge">{currentQuestion.topic.replace('_', ' ')}</span>
              <p>{currentQuestion.question}</p>
            </div>
          ) : (
            <p className="placeholder">Click "Next Question" to start.</p>
          )}
          <button onClick={getRandomQuestion} className="btn primary-btn">
            {currentQuestion ? 'Next Question' : 'Start Interview'}
          </button>
        </section>

        {currentQuestion && (
          <section className="card answer-card">
            <h2>Your Answer</h2>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your explanation or code here..."
              rows={6}
              disabled={loading}
            ></textarea>
            <button
              onClick={() => submitAnswer()}
              disabled={loading || loadingDetailed || !answer.trim()}
              className="btn submit-btn"
            >
              {loading ? 'Evaluating...' : 'Submit Answer'}
            </button>
          </section>
        )}

        {feedback && (
          <section className="card feedback-card">
            <h2>Evaluation Feedback</h2>
            <div className="feedback-content">
              <MarkdownContent content={feedback} />
            </div>

            {loadingDeepDive && <p className="loading-text animate-pulse">Diving deep into concept...</p>}

            {deepDive && (
              <div className="deep-dive-box">
                <h3>Deep Dive: {deepDive.concept}</h3>
                <div className="deep-dive-content">
                  <MarkdownContent content={deepDive.explanation} />
                </div>
              </div>
            )}

            {idealAnswer && (
              <div className="ideal-answer-box">
                <h3>Senior Ideal Answer</h3>
                <div className="ideal-answer-content">
                  <MarkdownContent content={idealAnswer} />
                </div>
              </div>
            )}

            {!hasDetailed && (
              <button
                onClick={() => submitAnswer(true)}
                disabled={loading || loadingDetailed || loadingDeepDive}
                className="btn discussion-btn"
                style={{ marginTop: '1.5rem' }}
              >
                {loadingDetailed ? 'Generating...' : 'Ideal Answer'}
              </button>
            )}
          </section>
        )}
      </main>
      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}

export default App;
