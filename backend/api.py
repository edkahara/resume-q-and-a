"""
Resume Q&A

Answers questions about a resume that has already been indexed into
Pinecone by a separate ingestion process.
Combines vector search and LLM generation.

Setup:
    pip install fastapi uvicorn anthropic pinecone python-dotenv voyageai

    .env file:
        ANTHROPIC_API_KEY=your-key-here
        PINECONE_API_KEY=your-key-here
        PINECONE_INDEX_NAME=your-index-here
        PDF_NAME=your-filename-here

Run:
    uvicorn api:app --reload

Endpoints:
    POST /ask          Ask a question about the indexed resume (streaming)
    GET  /health       Health check
"""

import os
import logging
from datetime import date
from typing import Optional
import voyageai
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from anthropic import Anthropic
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Resume Q & A service",
    description="Ask questions about Edward Kahara's resume.",
    version="1.0.0"
)

anthropic_client = Anthropic()
voyage_client = voyageai.Client()
pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = os.getenv("INDEX_NAME")
PDF_NAME = os.getenv("PDF_NAME")
EMBEDDING_MODEL = "voyage-3"
GENERATION_MODEL = "claude-sonnet-5"
EMBEDDING_DIMENSIONS = 1024
# MIN_SIMILARITY = 0.7

def get_index():
    return pinecone_client.Index(INDEX_NAME)

index = get_index()

def embed_text(text: str) -> list[float]:
    response = voyage_client.embed(
        [text],
        model=EMBEDDING_MODEL,
        input_type="query"
    )
    return response.embeddings[0]

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)

@app.get("/health")
def health_check():
    """Checks that all dependencies are reachable."""
    pinecone_ok = False
    try:
        pinecone_client.list_indexes()
        pinecone_ok = True
    except Exception:
        pass

    return {
        "status": "ok",
        "pinecone_connected": pinecone_ok,
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "index": INDEX_NAME
    }

@app.post("/ask")
def ask_question(request: QuestionRequest):
    """Asks a question about the resume."""
    logger.info(f"Question for {PDF_NAME}: {request.question[:80]}...")

    query_embedding = embed_text(request.question)

    results = index.query(
        vector=query_embedding,
        top_k=5,
        include_metadata=True,
        filter={"pdf_name": {"$eq": PDF_NAME}}
    )

    chunks = [
        match.metadata.get("text", "")
        for match in results.matches
        # if match.score > MIN_SIMILARITY
    ]

    logger.info(f"Retrieved {len(chunks)} relevant chunks")

    if not chunks:
        def no_context():
            yield "I could not find relevant sections in the resume to answer your question. Try rephrasing or download the resume."
        return StreamingResponse(no_context(), media_type="text/plain")

    content = "\n\n---\n\n".join(chunks)

    def stream_response():
        with anthropic_client.messages.stream(
            model=GENERATION_MODEL,
            max_tokens=2048,
            output_config={"effort": "high"},
            system=f"""You are a document assistant.
                Answer questions based only on the provided document sections.
                Be direct and specific.
                If the answer is not clearly in the provided sections, say so.
                Do not fabricate information.
                When referencing specific information, indicate which part of the document it came from.
                Today's date is {date.today().isoformat()}. Use it for any date arithmetic,
                such as computing how long a "Present"-ended role has lasted.
                """,
            messages=[{
                "role": "user",
                "content": f"Document sections:\n\n{content}\n\nQuestion: {request.question}"
            }]
        ) as stream:
            for text in stream.text_stream:
                yield text
        
    return StreamingResponse(stream_response(), media_type="text/plain")