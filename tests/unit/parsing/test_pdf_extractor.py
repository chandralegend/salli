"""
Unit tests for the PDF extractor helper functions.
No real PDF files needed — tests feed structured data directly.
"""
from decimal import Decimal

import pytest

from salli.adapters.parsing.pdf_extractor import (
    _header_map,
    _is_credit,
    _normalise_date,
    _parse_amount,
    _parse_table,
)


def test_normalise_date_dmy_slash():
    assert _normalise_date("25/04/2025") == "2025-04-25"


def test_normalise_date_dmy_dash():
    assert _normalise_date("01-12-2025") == "2025-12-01"


def test_normalise_date_iso():
    assert _normalise_date("2025-07-15") == "2025-07-15"


def test_normalise_date_text_month():
    assert _normalise_date("03 Jan 2026") == "2026-01-03"


def test_normalise_date_invalid():
    assert _normalise_date("not a date") is None


def test_parse_amount_comma():
    assert _parse_amount("1,234,567.89") == Decimal("1234567.89")


def test_parse_amount_plain():
    assert _parse_amount("50000.00") == Decimal("50000.00")


def test_parse_amount_empty():
    assert _parse_amount("") is None


def test_is_credit_only_credit():
    assert _is_credit("", "50000.00") is True


def test_is_credit_only_debit():
    assert _is_credit("15000.00", "") is False


def test_is_credit_both_empty():
    assert _is_credit("", "") is None


def test_header_map_standard():
    headers = ["Date", "Description", "Debit", "Credit", "Ref"]
    m = _header_map(headers)
    assert m["date"] == 0
    assert m["desc"] == 1
    assert m["debit"] == 2
    assert m["credit"] == 3
    assert m["ref"] == 4


def test_header_map_alternate_names():
    headers = ["Txn Date", "Narration", "Withdrawals", "Deposits", "Cheque No"]
    m = _header_map(headers)
    assert "date" in m
    assert "desc" in m
    assert "debit" in m
    assert "credit" in m


def test_parse_table_standard():
    table = [
        ["Date", "Description", "Debit", "Credit", "Ref"],
        ["25/04/2025", "SALARY CREDIT", "", "300,000.00", "REF001"],
        ["01/05/2025", "ATM WITHDRAWAL", "10,000.00", "", "REF002"],
        ["", "", "", "", ""],  # blank row — should be skipped
    ]
    rows = _parse_table(table, page=1)
    assert len(rows) == 2
    assert rows[0]["credit_flag"] is True
    assert rows[0]["amount"] == Decimal("300000.00")
    assert rows[0]["date"] == "2025-04-25"
    assert rows[0]["bank_ref"] == "REF001"
    assert rows[1]["credit_flag"] is False
    assert rows[1]["amount"] == Decimal("10000.00")


def test_parse_table_no_date_header():
    # Table without a recognisable date column → no rows extracted
    table = [["Item", "Qty", "Price"], ["Widget", "2", "500.00"]]
    assert _parse_table(table, page=1) == []


def test_parse_table_skips_rows_without_date():
    table = [
        ["Date", "Description", "Debit", "Credit"],
        ["not-a-date", "Mystery row", "100.00", ""],
        ["15/06/2025", "Utility payment", "5000.00", ""],
    ]
    rows = _parse_table(table, page=1)
    assert len(rows) == 1
    assert rows[0]["amount"] == Decimal("5000.00")
