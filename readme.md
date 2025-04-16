# Multi-Agent Real Estate Chatbot Documentation

## Tools & Technologies Used

### Frontend
- **Next.js** (React framework)
- **Tailwind CSS** (styling)
- **React-Markdown** (markdown rendering)
- **Highlight.js** (code syntax highlighting)

### Backend
- **FastAPI** (Python backend framework)
- **Google Vision API** (image analysis)
- **Google Gemini 1.5 Flash** (AI model)
- **Python-dotenv** (environment management)

### Deployment
- Vercel (frontend hosting)
- Google Cloud Platform (Vision API)
- Render/FastAPI-compatible hosting (backend)

## Agent Switching Logic

### Decision Flowchart
```plaintext
                    ┌─────────────┐
                    │ User Input  │
                    └──────┬──────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼────────┐                ┌─────────▼─────────┐
│ Contains Image? │                │ Text Classification│
└────────┬────────┘                └─────────┬─────────┘
         │                                   │
    ┌────▼─────┐                       ┌─────▼────┐
    │ Agent 1  │                ┌──────┤ FAQ?     ├─────┐
    │ (Issues) │                │      └────┬─────┘     │
    └──────────┘                │           │           │
                         ┌──────▼─────┐ ┌────▼──────┐    │
                         │ Agent 2    │ │ Agent 1   │    │
                         │ (Tenancy)  │ │ (Issues)  │    │
                         └────────────┘ └───────────┘    │
                                    ┌───────────────┐    │
                                    │ Ask Clarifying│◄───┘
                                    │ Question      │
                                    └───────────────┘
