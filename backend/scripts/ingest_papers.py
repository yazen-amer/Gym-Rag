from app.rag.ingest import ingest_papers

def main():
    files, chunks = ingest_papers()
    print(files, chunks)

if __name__ == "__main__":
    main()