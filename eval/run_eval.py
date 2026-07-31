from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
AGENT_DIR = ROOT / "agent"
DEFAULT_SET = ROOT / "eval" / "golden_set.json"
DEFAULT_RUN_DIR = ROOT / "eval" / "runs" / "run-001"

sys.path.insert(0, str(AGENT_DIR))

from app.chat import OpenAIChatProvider  # noqa: E402
from app.domain import RetrievalResult, RetrievedSlide, SlideChunk  # noqa: E402
from app.graph.nodes.database_query import UserContext  # noqa: E402
from app.settings import Settings  # noqa: E402


settings = Settings()


CLARIFICATION_TERMS = (
    "bạn muốn",
    "ý bạn",
    "nêu rõ",
    "cụ thể",
    "đang chỉ",
    "đang nói",
    "là phần nào",
    "khái niệm nào",
    "nội dung nào",
)


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", without_marks).strip()


def contains(normalized_output: str, term: str) -> bool:
    return normalize(term) in normalized_output


def grade_output(case: dict[str, Any], output: str) -> dict[str, Any]:
    rules = case["grading"]
    normalized_output = normalize(output)

    group_results = []
    for alternatives in rules.get("required_groups", []):
        matched = [term for term in alternatives if contains(normalized_output, term)]
        group_results.append(
            {
                "alternatives": alternatives,
                "passed": bool(matched),
                "matched": matched,
            }
        )

    forbidden_matches = [
        term for term in rules.get("forbidden_terms", []) if contains(normalized_output, term)
    ]
    required_pass = all(result["passed"] for result in group_results)
    forbidden_pass = not forbidden_matches

    must_clarify = rules.get("must_ask_clarifying", False)
    clarification_matches = [term for term in CLARIFICATION_TERMS if contains(normalized_output, term)]
    clarification_pass = (
        not must_clarify
        or ("?" in output and bool(clarification_matches))
    )

    word_count = len(re.findall(r"\S+", output))
    max_words = rules.get("max_words")
    length_pass = max_words is None or word_count <= max_words
    overall_pass = required_pass and forbidden_pass and clarification_pass and length_pass

    source_truth_case = "source_truth" in case.get("risk_classes", [])
    hallucination = source_truth_case and (not forbidden_pass or not required_pass)

    return {
        "overall_pass": overall_pass,
        "dimensions": {
            "required_content": required_pass,
            "forbidden_content_absent": forbidden_pass,
            "clarification_behavior": clarification_pass,
            "conciseness": length_pass,
        },
        "required_group_results": group_results,
        "forbidden_matches": forbidden_matches,
        "clarification_matches": clarification_matches,
        "word_count": word_count,
        "max_words": max_words,
        "hallucination": hallucination,
    }


def load_cases(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if len(payload["cases"]) < 20:
        raise ValueError("Golden set must contain at least 20 cases")
    ids = [case["id"] for case in payload["cases"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Golden set contains duplicate case IDs")
    return payload


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def build_metrics(
    spec: dict[str, Any],
    results: list[dict[str, Any]],
    started_at: str,
    finished_at: str,
    run_id: str,
) -> dict[str, Any]:
    total = len(results)
    passed = sum(result["grade"]["overall_pass"] for result in results)
    hallucinations = sum(result["grade"]["hallucination"] for result in results)
    by_distribution: dict[str, dict[str, int | float]] = {}
    for distribution in sorted({result["distribution"] for result in results}):
        subset = [result for result in results if result["distribution"] == distribution]
        subset_passed = sum(result["grade"]["overall_pass"] for result in subset)
        by_distribution[distribution] = {
            "passed": subset_passed,
            "total": len(subset),
            "percent": round(subset_passed / len(subset) * 100, 2),
        }

    risk_totals: Counter[str] = Counter()
    risk_passes: Counter[str] = Counter()
    for result in results:
        for risk_class in result["risk_classes"]:
            risk_totals[risk_class] += 1
            if result["grade"]["overall_pass"]:
                risk_passes[risk_class] += 1
    by_risk_class = {
        risk_class: {
            "passed": risk_passes[risk_class],
            "total": risk_totals[risk_class],
            "percent": round(risk_passes[risk_class] / risk_totals[risk_class] * 100, 2),
        }
        for risk_class in sorted(risk_totals)
    }

    origin_totals = Counter(result["origin"]["type"] for result in results)
    quality_bar = spec["quality_bar"]
    overall_percent = round(passed / total * 100, 2)
    hard_condition_passed = hallucinations == 0
    return {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "model_configured": settings.chat_model,
        "decision_under_test": spec["decision_under_test"],
        "total_cases": total,
        "passed_cases": passed,
        "failed_cases": total - passed,
        "overall_percent": overall_percent,
        "hallucination_count": hallucinations,
        "average_latency_ms": round(sum(result["latency_ms"] for result in results) / total, 2),
        "by_distribution": by_distribution,
        "by_risk_class": by_risk_class,
        "origin_counts": dict(sorted(origin_totals.items())),
        "quality_bar": quality_bar,
        "quality_bar_result": {
            "percentage_condition_passed": overall_percent >= quality_bar["overall_min_percent"],
            "hard_condition_passed": hard_condition_passed,
            "overall_passed": (
                overall_percent >= quality_bar["overall_min_percent"] and hard_condition_passed
            ),
        },
    }


def write_csv(path: Path, results: list[dict[str, Any]]) -> None:
    fields = [
        "case_id",
        "distribution",
        "risk_classes",
        "origin_type",
        "origin_reference",
        "question",
        "expected_behavior",
        "actual_output",
        "passed",
        "hallucination",
        "latency_ms",
        "failed_dimensions",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for result in results:
            failed_dimensions = [
                name for name, passed in result["grade"]["dimensions"].items() if not passed
            ]
            writer.writerow(
                {
                    "case_id": result["case_id"],
                    "distribution": result["distribution"],
                    "risk_classes": "|".join(result["risk_classes"]),
                    "origin_type": result["origin"]["type"],
                    "origin_reference": result["origin"]["reference"],
                    "question": result["input"]["question"],
                    "expected_behavior": result["expected_behavior"],
                    "actual_output": result["output"],
                    "passed": result["grade"]["overall_pass"],
                    "hallucination": result["grade"]["hallucination"],
                    "latency_ms": result["latency_ms"],
                    "failed_dimensions": "|".join(failed_dimensions),
                }
            )


def write_markdown_report(path: Path, metrics: dict[str, Any], results: list[dict[str, Any]]) -> None:
    bar = metrics["quality_bar"]
    outcome = "ĐẠT" if metrics["quality_bar_result"]["overall_passed"] else "CHƯA ĐẠT"
    lines = [
        "# Kết quả eval — lượt chạy đầu",
        "",
        f"- Quyết định AI: {metrics['decision_under_test']}",
        f"- Model thực chạy: `{metrics['model_configured']}`",
        f"- Kết quả: **{metrics['passed_cases']}/{metrics['total_cases']} ({metrics['overall_percent']}%)**",
        f"- Hallucination: **{metrics['hallucination_count']}** case",
        f"- Quality bar đã chốt: **≥{bar['overall_min_percent']}% và {bar['hard_condition']}**",
        f"- Đối chiếu quality bar: **{outcome}**",
        f"- Độ trễ trung bình: **{metrics['average_latency_ms']} ms/case**",
    ]
    audit = metrics.get("evaluation_audit")
    if audit:
        previous = audit["previous_result"]
        lines.extend(
            [
                "- Audit evaluator: re-grade cùng output, không gọi model lại; "
                f"metric v1 là {previous['passed_cases']}/{previous['total_cases']} "
                f"({previous['overall_percent']}%), {previous['hallucination_count']} hallucination.",
                "- Lý do audit: TC022 nhắc lại tiền đề sai năm 2015 trong câu phủ định và sửa đúng thành 2017; "
                "rule v1 đã đánh dấu nhầm là hallucination.",
            ]
        )
    lines.extend(
        [
            "",
            "## Metric theo nhóm",
            "",
            "| Nhóm | Đạt | Tổng | Tỷ lệ |",
            "|---|---:|---:|---:|",
        ]
    )
    for name, values in metrics["by_distribution"].items():
        lines.append(f"| distribution:{name} | {values['passed']} | {values['total']} | {values['percent']}% |")
    for name, values in metrics["by_risk_class"].items():
        lines.append(f"| risk:{name} | {values['passed']} | {values['total']} | {values['percent']}% |")

    lines.extend(
        [
            "",
            "## Bảng đầy đủ từng case",
            "",
            "| Case | Loại | Input | Kỳ vọng | Output thực tế | Đạt? | Lỗi chấm |",
            "|---|---|---|---|---|---:|---|",
        ]
    )
    for result in results:
        failed = [name for name, passed in result["grade"]["dimensions"].items() if not passed]
        output = result["output"].replace("|", "\\|").replace("\n", "<br>")
        question = result["input"]["question"].replace("|", "\\|")
        expected = result["expected_behavior"].replace("|", "\\|")
        label = "PASS" if result["grade"]["overall_pass"] else "FAIL"
        lines.append(
            f"| {result['case_id']} | {result['distribution']} | {question} | {expected} | "
            f"{output} | {label} | {', '.join(failed) if failed else '—'} |"
        )

    failed_results = [result for result in results if not result["grade"]["overall_pass"]]
    lines.extend(["", "## Phân tích failure và gợi ý cải thiện", ""])
    if failed_results:
        for result in failed_results:
            dimensions = [name for name, passed in result["grade"]["dimensions"].items() if not passed]
            lines.append(
                f"- **{result['case_id']}** — lỗi: {', '.join(dimensions)}. "
                f"Kỳ vọng: {result['expected_behavior']}"
            )
    else:
        lines.append("- Không có case fail theo bộ rule đã chốt.")

    lines.extend(
        [
            "",
            "Các cải thiện ưu tiên (không thay đổi quality bar):",
            "",
            "1. Thêm giới hạn trực tiếp vào system prompt: trả lời 2–5 câu, ưu tiên dưới 100 từ, bỏ lời chào và câu kết xã giao. Đây là lỗi lớn nhất: 17/24 case fail chiều conciseness.",
            "2. Tách một bước phân loại `answer / clarify / abstain / refuse` có output cấu trúc trước bước sinh câu trả lời. Cả 4/4 case mơ hồ hiện chưa hỏi lại đúng chuẩn.",
            "3. Buộc câu trả lời grounded trả về danh sách `source`/mã đoạn; nếu không có source hợp lệ thì backend chuyển sang abstain.",
            "4. Thêm rule cứng cho deadline, lịch học và điểm số: chỉ trả lời từ nguồn chính thức có timestamp/version, còn lại chuyển TA.",
            "5. Thêm policy riêng cho bài kiểm tra đang chấm và prompt injection; lưu reason code để UI giải thích đường lui.",
            "6. Chạy lại toàn bộ 24 case sau mỗi lần đổi prompt/model và giữ nguyên log của từng lượt để phát hiện regression.",
            "",
            "## Phạm vi phép đo",
            "",
            "Lượt này gọi thật `OpenAIChatProvider.answer` đang được workflow của branch refactor sử dụng, với context được cố định cho từng case. Cách này đo trực tiếp quyết định grounded/clarify/refuse của model nhưng chưa đo recall của Qdrant, Knowledge Graph, database level hay API end-to-end.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(spec_path: Path, run_dir: Path, limit: int | None = None) -> int:
    spec = load_cases(spec_path)
    if settings.chat_model != spec["model"]:
        raise RuntimeError(
            f"Configured CHAT_MODEL={settings.chat_model!r} does not match golden set model={spec['model']!r}"
        )
    if not settings.openai_api_key.get_secret_value():
        raise RuntimeError("OPENAI_API_KEY is empty in agent/.env")

    cases = spec["cases"][:limit] if limit else spec["cases"]
    logs_dir = run_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(timezone.utc).isoformat()
    results: list[dict[str, Any]] = []
    chat_provider = OpenAIChatProvider(settings)

    try:
        for index, case in enumerate(cases, start=1):
            input_data = case["input"]
            user_context = UserContext(user_id=1, current_level=input_data["level"])
            slide = SlideChunk(
                document_id=input_data["context_source"],
                version="eval-v1",
                day=input_data["day"],
                slide_number=index,
                title=input_data["current_slide"] or input_data["context_source"],
                content=input_data["context"],
            )
            retrieval = RetrievalResult(
                slides=(RetrievedSlide(chunk=slide, score=1.0),),
                concepts=(),
            )
            print(f"[{index:02d}/{len(cases):02d}] running {case['id']}", flush=True)
            start = time.perf_counter()
            error: str | None = None
            try:
                output = chat_provider.answer(
                    question=input_data["question"],
                    level=input_data["level"],
                    user_context=user_context,
                    retrieval=retrieval,
                    current_slide=None,
                    current_day=input_data["day"],
                )
            except Exception as exc:  # noqa: BLE001 - error must be preserved in eval logs
                output = ""
                error = f"{type(exc).__name__}: {exc}"
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            grade = grade_output(case, output) if error is None else {
                "overall_pass": False,
                "dimensions": {
                    "required_content": False,
                    "forbidden_content_absent": True,
                    "clarification_behavior": False,
                    "conciseness": True,
                },
                "required_group_results": [],
                "forbidden_matches": [],
                "clarification_matches": [],
                "word_count": 0,
                "max_words": case["grading"].get("max_words"),
                "hallucination": False,
            }
            result = {
                "case_id": case["id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model": settings.chat_model,
                "provider": chat_provider.provider_name,
                "distribution": case["distribution"],
                "risk_classes": case["risk_classes"],
                "origin": case["origin"],
                "input": input_data,
                "expected_behavior": case["expected_behavior"],
                "grading_rules": case["grading"],
                "output": output,
                "error": error,
                "latency_ms": latency_ms,
                "grade": grade,
            }
            results.append(result)
            write_json(logs_dir / f"{case['id']}.json", result)
            print(f"         {'PASS' if grade['overall_pass'] else 'FAIL'} ({latency_ms} ms)", flush=True)
    finally:
        chat_provider.close()

    finished_at = datetime.now(timezone.utc).isoformat()
    metrics = build_metrics(spec, results, started_at, finished_at, run_dir.name)
    write_json(run_dir / "metrics.json", metrics)
    with (run_dir / "results.jsonl").open("w", encoding="utf-8") as handle:
        for result in results:
            handle.write(json.dumps(result, ensure_ascii=False) + "\n")
    write_csv(run_dir / "results.csv", results)
    write_markdown_report(run_dir / "report.md", metrics, results)
    print(
        f"Result: {metrics['passed_cases']}/{metrics['total_cases']} "
        f"({metrics['overall_percent']}%), hallucinations={metrics['hallucination_count']}",
        flush=True,
    )
    return 0


def regrade(spec_path: Path, run_dir: Path) -> int:
    spec = load_cases(spec_path)
    cases_by_id = {case["id"]: case for case in spec["cases"]}
    results_path = run_dir / "results.jsonl"
    if not results_path.exists():
        raise FileNotFoundError(f"Missing prior results: {results_path}")

    results: list[dict[str, Any]] = []
    with results_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            prior = json.loads(line)
            case = cases_by_id[prior["case_id"]]
            prior["grading_rules"] = case["grading"]
            prior["grade"] = grade_output(case, prior["output"]) if prior["error"] is None else prior["grade"]
            prior["regraded_at"] = datetime.now(timezone.utc).isoformat()
            results.append(prior)

    prior_metrics_path = run_dir / "metrics.json"
    prior_metrics = json.loads(prior_metrics_path.read_text(encoding="utf-8"))
    metrics = build_metrics(
        spec,
        results,
        prior_metrics["started_at"],
        prior_metrics["finished_at"],
        run_dir.name,
    )
    metrics["evaluation_audit"] = {
        "regraded_without_new_model_calls": True,
        "reason": "TC022 rule v1 incorrectly treated a negated mention of the false year 2015 as hallucination.",
        "previous_result": {
            "passed_cases": prior_metrics["passed_cases"],
            "total_cases": prior_metrics["total_cases"],
            "overall_percent": prior_metrics["overall_percent"],
            "hallucination_count": prior_metrics["hallucination_count"],
        },
    }

    for result in results:
        write_json(run_dir / "logs" / f"{result['case_id']}.json", result)
    write_json(run_dir / "metrics.json", metrics)
    with results_path.open("w", encoding="utf-8") as handle:
        for result in results:
            handle.write(json.dumps(result, ensure_ascii=False) + "\n")
    write_csv(run_dir / "results.csv", results)
    write_markdown_report(run_dir / "report.md", metrics, results)
    print(
        f"Regraded without API calls: {metrics['passed_cases']}/{metrics['total_cases']} "
        f"({metrics['overall_percent']}%), hallucinations={metrics['hallucination_count']}",
        flush=True,
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run VLearn grounded-tutor golden set")
    parser.add_argument("--set", type=Path, default=DEFAULT_SET)
    parser.add_argument("--run-dir", type=Path, default=DEFAULT_RUN_DIR)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--regrade-only",
        action="store_true",
        help="Reapply current deterministic rules to saved outputs without calling the model",
    )
    args = parser.parse_args()
    if args.regrade_only:
        return regrade(args.set.resolve(), args.run_dir.resolve())
    return run(args.set.resolve(), args.run_dir.resolve(), args.limit)


if __name__ == "__main__":
    raise SystemExit(main())
