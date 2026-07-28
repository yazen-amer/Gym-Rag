from app.config import get_settings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag.vectorstore import get_vectorstore
import time

settings = get_settings()

def ingest_papers() -> tuple[int, int]:
    pdfs = sorted(settings.papers_dir.glob("*.pdf"))
    files_processed = 0
    chunks_added = 0
    vector_store = get_vectorstore()

    for pdf in pdfs:
       files_processed+=1
       loader = PyPDFLoader(
           file_path = pdf,
           mode = "page",
           pages_delimiter = ""
       )
       docs = loader.load()
       for doc in docs:
               doc.metadata["title"] = pdf.stem
               doc.metadata["source"] = pdf.name
               doc.metadata["page"] += 1
       text_splitter = RecursiveCharacterTextSplitter(
            chunk_size = settings.chunk_size,
            chunk_overlap = settings.chunk_overlap,
            add_start_index = True
       )
       all_chunks = text_splitter.split_documents(docs)
       chunks_added += len(all_chunks)
       vector_store.add_documents(all_chunks)
       time.sleep(20)

    return files_processed, chunks_added
