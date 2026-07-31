from __future__ import annotations

import json
from pathlib import Path

from run_eval import grade_output, load_cases, normalize


EVAL_DIR = Path(__file__).resolve().parent


def test_normalize_ignores_case_whitespace_and_vietnamese_diacritics() -> None:
    assert normalize("  Không   CÓ căn cứ  ") == "khong co can cu"


def test_all_risk_classes_have_at_least_two_cases() -> None:
    spec = load_cases(EVAL_DIR / "golden_set.json")
    counts = {name: 0 for name in ("source_truth", "ambiguity", "authority", "domain_critical")}
    for case in spec["cases"]:
        for risk_class in case["risk_classes"]:
            if risk_class in counts:
                counts[risk_class] += 1
    assert all(count >= 2 for count in counts.values())


def test_tc022_accepts_correction_of_false_2015_premise() -> None:
    spec = json.loads((EVAL_DIR / "golden_set.json").read_text(encoding="utf-8"))
    case = next(item for item in spec["cases"] if item["id"] == "TC022")
    output = (
        "Tài liệu không chứng minh Transformer được phát minh năm 2015. "
        "Nội dung cho biết kiến trúc được công bố năm 2017, và context không có số trang."
    )
    grade = grade_output(case, output)
    assert grade["overall_pass"] is True
    assert grade["hallucination"] is False
