export const systems = {
  gmat: {
    name: "GMAT / LOCAL AI TUTOR",
    project: "gmat-system",
    steps: [
      [
        "Ask a question",
        "React + TypeScript",
        "A learner opens a practice question and asks the tutor for help. The interface sends the question ID, message, and conversation history to the API.",
        ["React", "TypeScript"],
      ],
      [
        "Receive the request",
        "FastAPI",
        "The /tutor/chat endpoint accepts the structured request and opens a connection to the local question database.",
        ["FastAPI", "Pydantic"],
      ],
      [
        "Retrieve context",
        "SQLite",
        "The service loads the question, correct answer, and official explanation. This is the context supplied to the tutor, so the response can relate to the actual exercise.",
        ["SQLite", "SQL"],
      ],
      [
        "Run local inference",
        "Ollama",
        "Python assembles the context and chat history, then calls a local Ollama model. The implementation tries a smaller fallback model when the first model is unavailable.",
        ["Ollama", "Python", "HTTPX"],
      ],
      [
        "Return the explanation",
        "API → interface",
        "The API returns the tutor reply to the practice interface. Connection failures produce explicit service errors rather than a fabricated answer.",
        ["JSON response", "Error handling"],
      ],
    ],
  },
  buddy: {
    name: "BUDDY / CONTEXTUAL INTELLIGENCE",
    project: "buddy",
    steps: [
      [
        "Reflect on the day",
        "React",
        "The user brings together their tasks, spending, and journal. These signals provide the context for a daily reflection.",
        ["React", "JavaScript"],
      ],
      [
        "Connect the service",
        "Node.js + Express",
        "The backend connects the application to its assistant services. Model access stays behind the server-side provider module.",
        ["Node.js", "Express"],
      ],
      [
        "Assemble the context",
        "Buddy Brain",
        "The review service combines completed tasks, expenses, mood, and journal content into a structured prompt. It asks for specific observations from that day.",
        ["Context assembly", "Prompt design"],
      ],
      [
        "Generate or fall back",
        "Groq + heuristics",
        "With a key available, the provider requests structured JSON from Groq. Missing keys or failed calls use a deterministic reflection fallback.",
        ["Groq", "JSON output", "Fallback logic"],
      ],
      [
        "Show useful reflection",
        "Structured response",
        "The returned result contains a summary, wins, improvements, a cross-domain connection, and a focus for tomorrow. The engine field records whether AI or heuristics produced it.",
        ["Typed shape", "React interface"],
      ],
    ],
  },
  moneyfest: {
    name: "MONEYFEST / EVIDENCE & VERIFICATION",
    project: "moneyfest",
    steps: [
      [
        "Collect the evidence",
        "Python ingestion",
        "Market prices, company filings, and news enter the data pipeline. Evidence is associated with the relevant company and its recorded exposures.",
        ["Python", "SQLite"],
      ],
      [
        "Check the movement",
        "Deterministic gate",
        "A quantitative gate separates ordinary market movement from events worth investigating. Ordinary movement does not need an attribution model call.",
        ["Versioned rules", "Statistical checks"],
      ],
      [
        "Propose an explanation",
        "Groq / Anthropic",
        "For eligible events, an attribution model receives a frozen evidence bundle and proposes candidate drivers through structured tool calls.",
        ["Groq", "Anthropic", "Tool calling"],
      ],
      [
        "Test the claims",
        "Rules + verifier",
        "Deterministic checks reject unsupported claims. Surviving candidates are passed to a second model for entailment verification. Rejected claims are logged.",
        ["Deterministic validation", "LLM verifier"],
      ],
      [
        "Cite or abstain",
        "Confidence + evidence",
        "Verified drivers are scored and rendered with evidence citations. If none survive, the system returns NO_DRIVER: there is no clear explanation supported by the evidence.",
        ["Citations", "Confidence rubric", "Abstention"],
      ],
    ],
  },
};
