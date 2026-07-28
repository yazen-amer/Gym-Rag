from pathlib import Path
import json
from app.rag.retriever import retrieve
import time

cases_path = Path(__file__).resolve().parent / "cases.json"

def run_eval():
    pass_count = 0
    with open(cases_path, 'r') as file:
        cases = json.load(file)
        case_count = len(cases)
        for case in cases:
            result_sources = retrieve(case["question"])
            for source in result_sources:
                if source.title in case["expected_sources"]:
                    pass_count+=1
                    break
            print("\nQuestion:", case["question"])
            print("Expected:", case["expected_sources"])
            print("Retrieved:", [source.title for source in result_sources])
            time.sleep(7)
    score = pass_count/case_count
    print(score)
    return score

if __name__ == "__main__":
    run_eval()