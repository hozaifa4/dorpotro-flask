#!/usr/bin/env python3
import os
import re
import gzip
import json
import math
import time
import threading
import urllib.request
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, make_response, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

app = Flask(
    __name__,
    static_folder=os.path.join(DIST_DIR, "assets"),
    static_url_path="/assets",
    template_folder=DIST_DIR,
)

# Bangladesh Standard Time (UTC+6) so Vercel UTC servers classify deadlines accurately
BD_TZ = timezone(timedelta(hours=6))
EXCEL_EPOCH_BD = datetime(1899, 12, 30, 0, 0, tzinfo=BD_TZ)

R2_BASE = "https://pub-73034fb3150341c9b860d40d094b488f.r2.dev"
R2_ACTIVE_URL = os.environ.get("DORPOTRO_ACTIVE_CDN", f"{R2_BASE}/tenders_active.json")
R2_ARCHIVED_URL = os.environ.get("DORPOTRO_ARCHIVED_CDN", f"{R2_BASE}/tenders_archived.json")
R2_CDN_URL = os.environ.get("DORPOTRO_CDN_URL", f"{R2_BASE}/tenders_parsed_cache.json")

_cache_lock = threading.Lock()

# Server-side in-memory tiered caches
_active_cache = {
    "fetched_at": 0.0,
    "records": [],
    "active_count": 0,
    "archived_count": 0,
    "total_count": 0,
    "last_updated": "",
    "meta": None,
}

_archived_cache = {
    "fetched_at": 0.0,
    "records": [],
    "loaded": False,
    "merged_meta": None,
}

ACTIVE_TTL_SECONDS = 180
ARCHIVED_TTL_SECONDS = 1800

ANALYTICS_KEYS = (
    "id",
    "district",
    "procuringDistrict",
    "procurementNature",
    "packageDescription",
    "ministry",
    "organization",
    "estimatedCostAmt",
    "publicationDate",
    "tenderLink",
)

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

DATE_RE_BD = re.compile(r"^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?")
DATE_RE_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?")
PKG_PREFIX_RE_1 = re.compile(
    r"^(?:e\s*[-–]\s*)?[A-Za-z0-9_.\-/#()]+(?:/[A-Za-z0-9_.\-/#()]+)+(?:\s+Lot[-_\s]*\d+)?\s+",
    re.IGNORECASE,
)
PKG_PREFIX_RE_2 = re.compile(
    r"^(?:e\s*[-–]\s*)?[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-/]+\s+",
    re.IGNORECASE,
)
PAREN_CODE_RE = re.compile(r"\(([^)]+)\)")


def now_bd() -> datetime:
    """Current timezone-aware datetime in Bangladesh Standard Time (UTC+6)."""
    return datetime.now(BD_TZ)


def parse_dt(d_str, default_hh: int = 0, default_mm: int = 0):
    """
    Parses BD dates ('05-Nov-2026 17:00' or '5-Nov-2026'), ISO dates ('2026-11-05 17:00'),
    and Excel serial float dates ('46191.5875') into timezone-aware BD_TZ datetimes.
    """
    if d_str is None or d_str == "":
        return None
    s = str(d_str).strip()
    if not s or s in ("N/A", "null", "undefined"):
        return None

    m = DATE_RE_BD.match(s)
    if m:
        try:
            day, mon_str, year, hh, mm = m.groups()
            mon = MONTH_MAP.get(mon_str.lower(), 1)
            h_val = int(hh) if hh is not None else default_hh
            m_val = int(mm) if mm is not None else default_mm
            return datetime(int(year), mon, int(day), h_val, m_val, tzinfo=BD_TZ)
        except Exception:
            pass

    m2 = DATE_RE_ISO.match(s)
    if m2:
        try:
            year, mon, day, hh, mm = m2.groups()
            h_val = int(hh) if hh is not None else default_hh
            m_val = int(mm) if mm is not None else default_mm
            return datetime(int(year), int(mon), int(day), h_val, m_val, tzinfo=BD_TZ)
        except Exception:
            pass

    # Fallback: Excel serial float number (e.g. 46191.5875)
    try:
        num = float(s)
        if 35000.0 < num < 60000.0:
            return EXCEL_EPOCH_BD + timedelta(days=num)
    except Exception:
        pass

    return None


def get_short_method(method_str) -> str:
    """Matches frontend short method classifier `ho()` identically."""
    if not method_str:
        return "OTM"
    s = str(method_str).strip()
    u = s.upper()
    if "OPEN" in u or "OTM" in u:
        return "OTM"
    if "LIMITED" in u or "LTM" in u:
        return "LTM"
    if "QUOTATION" in u or "RFQ" in u:
        return "RFQ"
    if "DIRECT" in u or "DPM" in u:
        return "DPM"
    if "QCBS" in u or "QUALITY COST" in u:
        return "QCBS"
    if "SFB" in u or "FIXED BUDGET" in u:
        return "SFB"
    if "LCS" in u or "LEAST COST" in u:
        return "LCS"
    if "OSTETM" in u or "SINGLE STAGE" in u:
        return "OSTETM"
    if "TSTM" in u or "TWO STAGE" in u:
        return "TSTM"
    m = PAREN_CODE_RE.search(s)
    if m and m.group(1):
        return m.group(1).strip()
    return s


def clean_tender_display_description(t: dict, in_place: bool = False) -> dict:
    """
    Strips leading slash-separated package codes without slicing valid leading words
    such as 'Emergency', 'Urgent', or 'Special'. Precomputes index fields for fast search.
    """
    if not isinstance(t, dict):
        return t

    rec = t if in_place else dict(t)
    tid = str(rec.get("id", "")).replace(".0", "").strip()
    rec["id"] = tid

    desc = str(rec.get("packageDescription") or rec.get("briefDescription") or "").strip()
    pkg_no = str(rec.get("packageNo") or "").strip()

    if desc:
        d = desc
        if pkg_no and d.startswith(pkg_no):
            trimmed = d[len(pkg_no):].strip()
            if len(trimmed) > 5:
                d = trimmed

        if "/" in d[:75]:
            cleaned = PKG_PREFIX_RE_1.sub("", d)
            if cleaned != d and len(cleaned) > 5:
                d = cleaned.lstrip("\"' -:;,. ")
            else:
                cleaned2 = PKG_PREFIX_RE_2.sub("", d)
                if cleaned2 != d and len(cleaned2) > 5:
                    d = cleaned2.lstrip("\"' -:;,. ")

        d = d.strip("\"'")
        if d:
            rec["packageDescription"] = d

    pub_dt = parse_dt(rec.get("publicationDate", ""), default_hh=9, default_mm=0)
    sell_dt = parse_dt(rec.get("documentLastSellingDate", ""), default_hh=17, default_mm=0)
    if sell_dt is None and pub_dt is not None:
        sell_dt = pub_dt + timedelta(days=7)

    short_method = get_short_method(rec.get("procurementMethod", ""))
    district = str(rec.get("district") or rec.get("procuringDistrict") or "").strip()

    search_blob = " ".join(
        str(rec.get(k) or "")
        for k in (
            "id",
            "packageNo",
            "packageDescription",
            "organization",
            "procuringEntity",
            "officialInviter",
            "ministry",
            "district",
            "procuringDistrict",
            "category",
            "invitationRefNo",
            "briefDescription",
        )
    ).lower()

    rec["_sell_ts"] = sell_dt.timestamp() if sell_dt is not None else -1.0
    rec["_pub_ts"] = pub_dt.timestamp() if pub_dt is not None else 0.0
    rec["_id_int"] = int(tid) if tid.isdigit() else 0
    rec["_short_method"] = short_method
    rec["_district_norm"] = district
    rec["_search_blob"] = search_blob
    return rec


def strip_internal_fields(rec: dict) -> dict:
    return {k: v for k, v in rec.items() if not k.startswith("_")}


def sort_records(records: list) -> list:
    records.sort(key=lambda r: (r.get("_pub_ts", 0.0), r.get("_id_int", 0)), reverse=True)
    return records


def build_meta(records: list) -> dict:
    natures = sorted({str(r.get("procurementNature")).strip() for r in records if r.get("procurementNature")})
    methods_set = {"OTM", "LTM"}
    districts_set = set()
    orgs_set = set()
    pes_set = set()

    for r in records:
        sm = r.get("_short_method")
        if sm:
            methods_set.add(sm)
        dist = r.get("_district_norm")
        if dist:
            districts_set.add(dist)
        org = r.get("organization")
        if org:
            orgs_set.add(str(org).strip())
        pe = r.get("procuringEntity")
        if pe:
            pes_set.add(str(pe).strip())

    ordered_methods = [m for m in ("OTM", "LTM", "RFQ", "DPM", "OSTETM", "QCBS", "SFB", "LCS", "TSTM") if m in methods_set]
    for m in sorted(methods_set):
        if m not in ordered_methods:
            ordered_methods.append(m)

    return {
        "natures": natures or ["Goods", "Services", "Works"],
        "methods": ordered_methods,
        "districts": sorted(districts_set),
        "orgs": sorted(orgs_set),
        "pes": sorted(pes_set),
    }


def fetch_r2_json(url: str, timeout: int = 10):
    """Fetches JSON from Cloudflare R2 using gzip compression for 10x faster transfer."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Dorpotro-Flask-Backend/2.1",
            "Accept-Encoding": "gzip",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} from {url}")
        raw_bytes = resp.read()
        encoding = (resp.headers.get("Content-Encoding") or "").lower()
        if encoding == "gzip" or raw_bytes[:2] == b"\x1f\x8b":
            raw_bytes = gzip.decompress(raw_bytes)
        return json.loads(raw_bytes.decode("utf-8"))


def ensure_active_loaded():
    """
    Loads active tenders into server memory (2.1 MB gzip from R2), avoiding loading
    the 15 MB archived dump on cold starts unless needed for filtering or archived views.
    """
    now_ts = time.time()
    if _active_cache["records"] and (now_ts - _active_cache["fetched_at"] < ACTIVE_TTL_SECONDS):
        return

    with _cache_lock:
        now_ts = time.time()
        if _active_cache["records"] and (now_ts - _active_cache["fetched_at"] < ACTIVE_TTL_SECONDS):
            return

        now_dt = now_bd()
        now_bd_ts = now_dt.timestamp()

        # Fetch from Cloudflare R2 CDN (primary active tier, with master R2 fallback)
        for url in (R2_ACTIVE_URL, R2_CDN_URL):
            try:
                raw_data = fetch_r2_json(url, timeout=10)
                raw_list = raw_data.get("tenders", raw_data) if isinstance(raw_data, dict) else raw_data
                if isinstance(raw_list, list) and len(raw_list) > 0:
                    processed = [clean_tender_display_description(t, in_place=True) for t in raw_list if isinstance(t, dict)]
                    sort_records(processed)

                    # If fallback master URL was used, split active vs archived in-memory
                    if url == R2_CDN_URL:
                        act_recs = [r for r in processed if r["_sell_ts"] >= now_bd_ts]
                        arc_recs = [r for r in processed if r["_sell_ts"] < now_bd_ts]
                        _archived_cache.update({
                            "records": arc_recs,
                            "fetched_at": now_ts,
                            "loaded": True,
                            "merged_meta": build_meta(processed),
                        })
                        active_records = act_recs
                        act_count = len(act_recs)
                        arc_count = len(arc_recs)
                        tot_count = len(processed)
                    else:
                        active_records = processed
                        act_count = int(raw_data.get("active_count") or len(active_records)) if isinstance(raw_data, dict) else len(active_records)
                        arc_count = int(raw_data.get("archived_count") or 0) if isinstance(raw_data, dict) else 0
                        tot_count = int(raw_data.get("total") or (act_count + arc_count)) if isinstance(raw_data, dict) else (act_count + arc_count)
                        if _archived_cache["loaded"] and _archived_cache["records"]:
                            _archived_cache["merged_meta"] = build_meta(active_records + _archived_cache["records"])

                    _active_cache.update({
                        "fetched_at": now_ts,
                        "records": active_records,
                        "active_count": act_count,
                        "archived_count": arc_count,
                        "total_count": tot_count,
                        "last_updated": (raw_data.get("last_updated") if isinstance(raw_data, dict) else None) or now_dt.strftime("%d-%b-%Y %H:%M:%S"),
                        "meta": build_meta(active_records),
                    })
                    return
            except Exception as e:
                print(f"[Dorpotro R2 Notice] {url} fetch failed: {e}")


def ensure_archived_loaded():
    """Lazily loads archived tenders on the server when filtering or viewing archived/all tabs."""
    ensure_active_loaded()
    now_ts = time.time()
    if _archived_cache["loaded"] and (now_ts - _archived_cache["fetched_at"] < ARCHIVED_TTL_SECONDS):
        return

    with _cache_lock:
        now_ts = time.time()
        if _archived_cache["loaded"] and (now_ts - _archived_cache["fetched_at"] < ARCHIVED_TTL_SECONDS):
            return

        try:
            raw_data = fetch_r2_json(R2_ARCHIVED_URL, timeout=15)
            raw_list = raw_data.get("tenders", raw_data) if isinstance(raw_data, dict) else raw_data
            if isinstance(raw_list, list):
                active_ids = {r["id"] for r in _active_cache["records"]}
                processed = [
                    clean_tender_display_description(t, in_place=True)
                    for t in raw_list
                    if isinstance(t, dict) and str(t.get("id", "")).replace(".0", "").strip() not in active_ids
                ]
                sort_records(processed)
                merged_meta = build_meta(_active_cache["records"] + processed)
                _archived_cache.update({
                    "fetched_at": now_ts,
                    "records": processed,
                    "loaded": True,
                    "merged_meta": merged_meta,
                })
                if processed:
                    _active_cache["archived_count"] = len(processed)
                    _active_cache["total_count"] = len(_active_cache["records"]) + len(processed)
        except Exception as e:
            print(f"[Dorpotro Archived R2 Notice] {e}")


def record_matches_filters(r: dict, q_tokens: list, nature: str, method: str, district: str, org: str, pe: str, id_set: set = None) -> bool:
    if id_set is not None and r.get("id") not in id_set:
        return False
    if nature and r.get("procurementNature") != nature:
        if nature.upper() not in str(r.get("procurementNature", "")).upper():
            return False
    if method and r.get("_short_method") != method:
        if method.upper() not in str(r.get("procurementMethod", "")).upper():
            return False
    if district and r.get("_district_norm") != district and r.get("procuringDistrict") != district and r.get("district") != district:
        return False
    if org and r.get("organization") != org:
        return False
    if pe and r.get("procuringEntity") != pe:
        return False
    if q_tokens:
        blob = r.get("_search_blob", "")
        for tok in q_tokens:
            if tok not in blob:
                return False
    return True


def cached_json_response(payload: dict, max_age: int = 30, s_maxage: int = 120) -> object:
    resp = make_response(jsonify(payload), 200)
    resp.headers["Cache-Control"] = f"public, max-age={max_age}, s-maxage={s_maxage}, stale-while-revalidate=600"
    return resp


@app.route("/")
@app.route("/index.html")
def index():
    return send_from_directory(DIST_DIR, "index.html")


@app.route("/favicon.svg")
@app.route("/favicon.ico")
def serve_favicon():
    resp = make_response(send_from_directory(DIST_DIR, "favicon.svg", mimetype="image/svg+xml"))
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@app.route("/api/tenders")
def get_tenders_api():
    """
    On-demand paginated & filtered tenders endpoint.
    Transfers ~10 KB per page instead of forcing users to download 18+ MB of JSON.
    """
    ensure_active_loaded()

    page_raw = request.args.get("page", "1").strip()
    limit_raw = request.args.get("limit", "16").strip()

    tab_raw = request.args.get("tab", "active").strip().lower()
    if tab_raw == "closed":
        tab = "archived"
    elif tab_raw in ("active", "archived", "all"):
        tab = tab_raw
    else:
        tab = "active"

    q_raw = request.args.get("q", "").strip()
    q_lower = q_raw.lower()
    q_tokens = [tok for tok in q_lower.split() if tok]

    def norm_filter(val: str) -> str:
        v = (val or "").strip()
        return "" if v.upper() in ("", "ALL") else v

    nature = norm_filter(request.args.get("nature", ""))
    method = norm_filter(request.args.get("method", ""))
    district = norm_filter(request.args.get("district", ""))
    org = norm_filter(request.args.get("org", ""))
    pe = norm_filter(request.args.get("pe", ""))
    ids_param = request.args.get("ids", "").strip()
    include_meta = request.args.get("meta", "0").strip() == "1"

    id_set = {x.strip() for x in ids_param.split(",") if x.strip()} if ids_param else None
    has_filters = bool(q_tokens or nature or method or district or org or pe or id_set is not None)

    now_bd_ts = now_bd().timestamp()

    # Load archived dataset on the server ONLY when user filters/searches or views archived/all tabs
    # (keeps initial unfiltered Active cold-start ~0.2s while guaranteeing accurate filtered Archived counts)
    need_archived = tab in ("archived", "all") or has_filters
    if need_archived:
        ensure_archived_loaded()

    # Re-partition dynamically against live BD time so newly expired tenders move seamlessly to Archived
    active_pool = [r for r in _active_cache["records"] if r["_sell_ts"] >= now_bd_ts]
    newly_expired = [r for r in _active_cache["records"] if r["_sell_ts"] < now_bd_ts]

    unfiltered_active_count = len(active_pool)
    unfiltered_archived_count = (
        len(_archived_cache["records"]) + len(newly_expired)
        if _archived_cache["loaded"]
        else (_active_cache["archived_count"] + len(newly_expired))
    )

    if not has_filters:
        filtered_active = active_pool
        if need_archived:
            filtered_archived = sort_records(newly_expired + _archived_cache["records"]) if newly_expired else _archived_cache["records"]
        else:
            filtered_archived = []
        act_count = unfiltered_active_count
        arc_count = unfiltered_archived_count
        all_count = act_count + arc_count
    else:
        filtered_active = [
            r for r in active_pool
            if record_matches_filters(r, q_tokens, nature, method, district, org, pe, id_set)
        ]
        if _archived_cache["loaded"]:
            arch_source = (newly_expired + _archived_cache["records"]) if newly_expired else _archived_cache["records"]
            filtered_archived = [
                r for r in arch_source
                if record_matches_filters(r, q_tokens, nature, method, district, org, pe, id_set)
            ]
            if newly_expired and len(filtered_archived) > 1:
                sort_records(filtered_archived)
            arc_count = len(filtered_archived)
        else:
            filtered_archived = [
                r for r in newly_expired
                if record_matches_filters(r, q_tokens, nature, method, district, org, pe, id_set)
            ]
            arc_count = len(filtered_archived)

        act_count = len(filtered_active)
        all_count = act_count + arc_count

    if tab == "active":
        target_list = filtered_active
        tab_total = act_count
    elif tab == "archived":
        target_list = filtered_archived
        tab_total = arc_count
    else:
        target_list = sort_records(filtered_active + filtered_archived) if (filtered_active and filtered_archived) else (filtered_active or filtered_archived)
        tab_total = all_count

    # Check ID match banner (matches frontend `y.length >= 4` ID banner across active & archived)
    id_match_obj = None
    if len(q_raw) >= 4:
        search_space = (filtered_active + filtered_archived) if (filtered_active or filtered_archived) else target_list
        # Prefer exact ID match first, then substring ID match
        for r in search_space:
            if r.get("id", "") == q_raw:
                id_match_obj = strip_internal_fields(r)
                break
        if id_match_obj is None:
            for r in search_space:
                rid = r.get("id", "")
                if q_raw in rid:
                    id_match_obj = strip_internal_fields(r)
                    break

    try:
        limit = max(1, min(100, int(limit_raw or 16)))
    except ValueError:
        limit = 16
    total_pages = max(1, math.ceil(tab_total / limit)) if tab_total > 0 else 1
    try:
        page = max(1, min(total_pages, int(page_raw or 1)))
    except ValueError:
        page = 1

    start = (page - 1) * limit
    end = start + limit
    page_items = [strip_internal_fields(r) for r in target_list[start:end]]

    payload = {
        "total": tab_total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "active_count": act_count,
        "archived_count": arc_count,
        "all_count": all_count,
        "unfiltered_active_count": unfiltered_active_count,
        "last_updated": _active_cache["last_updated"],
        "id_match": id_match_obj,
        "tenders": page_items,
    }
    if include_meta:
        payload["meta"] = _archived_cache["merged_meta"] or _active_cache["meta"] or build_meta(active_pool)

    return cached_json_response(payload, max_age=30, s_maxage=120)


@app.route("/api/analytics")
def get_analytics_api():
    """
    Lightweight slim dataset loaded ONLY when the user opens the Tender Analytics Hub tab.
    Omits heavy descriptions, addresses, and eligibility paragraphs (~95% smaller).
    """
    ensure_active_loaded()
    now_bd_ts = now_bd().timestamp()
    slim = [
        {k: r.get(k, "") for k in ANALYTICS_KEYS if r.get(k) not in ("", None)}
        for r in _active_cache["records"]
        if r["_sell_ts"] >= now_bd_ts
    ]
    return cached_json_response(
        {
            "total": len(slim),
            "last_updated": _active_cache["last_updated"],
            "tenders": slim,
        },
        max_age=60,
        s_maxage=300,
    )


@app.route("/sw.js")
def serve_sw():
    resp = make_response(send_from_directory(DIST_DIR, "sw.js", mimetype="application/javascript"))
    resp.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return resp


if __name__ == "__main__":
    ensure_active_loaded()
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    app.run(debug=debug_mode, host=host, port=port)
