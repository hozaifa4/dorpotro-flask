#!/usr/bin/env python3
import os
import json
import re
from datetime import datetime
from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__, static_folder="dist/assets", static_url_path="/assets", template_folder="dist")

# In-memory high-speed cache
_cached_mtime = 0
_cached_data = {"total": 0, "active_count": 0, "archived_count": 0, "last_updated": "", "tenders": []}

def parse_dt(d_str):
    if not d_str:
        return datetime.min
    d_str = str(d_str).strip()
    try:
        m = re.match(r'^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}:\d{2}))?', d_str)
        if m:
            day, mon, year, t = m.groups()
            return datetime.strptime(f"{day.zfill(2)}-{mon}-{year} {t or '00:00'}", "%d-%b-%Y %H:%M")
        m2 = re.match(r'^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?', d_str)
        if m2:
            y, m, d, t = m2.groups()
            return datetime.strptime(f"{y}-{m}-{d} {t or '00:00'}", "%Y-%m-%d %H:%M")
    except Exception:
        pass
    return datetime.min

R2_CDN_URL = os.environ.get("DORPOTRO_CDN_URL", "https://pub-73034fb3150341c9b860d40d094b488f.r2.dev/tenders_parsed_cache.json")
_last_fetch_time = 0

def load_live_tenders():
    """
    Cloudflare R2 CDN অথবা লোকাল ক্যাশ থেকে লাইভ ডেটা পড়ে।
    Fast In-Memory Caching সহ অপ্টিমাইজড।
    """
    global _cached_mtime, _cached_data, _last_fetch_time
    now = datetime.now()
    
    # 1. Return in-memory cache if less than 60 seconds old
    if _cached_data.get("tenders") and (time.time() - _last_fetch_time < 60):
        return _cached_data

    # 2. Try fetching from Cloudflare R2 Edge CDN
    import urllib.request
    try:
        req = urllib.request.Request(R2_CDN_URL, headers={"User-Agent": "Dorpotro-Flask-Backend"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                raw_data = json.loads(resp.read().decode('utf-8'))
                tenders = raw_data.get("tenders", raw_data) if isinstance(raw_data, dict) else raw_data
                if isinstance(tenders, list) and len(tenders) > 0:
                    active_count = sum(1 for t in tenders if parse_dt(t.get('documentLastSellingDate', '')) >= now)
                    archived_count = len(tenders) - active_count
                    _last_fetch_time = time.time()
                    _cached_data = {
                        "total": len(tenders),
                        "active_count": raw_data.get("active_count", active_count) if isinstance(raw_data, dict) else active_count,
                        "archived_count": raw_data.get("archived_count", archived_count) if isinstance(raw_data, dict) else archived_count,
                        "last_updated": raw_data.get("last_updated", now.strftime("%d-%b-%Y %H:%M:%S")) if isinstance(raw_data, dict) else now.strftime("%d-%b-%Y %H:%M:%S"),
                        "tenders": tenders
                    }
                    return _cached_data
    except Exception as e:
        print(f"Cloudflare CDN fetch fallback notice: {e}")

    # 3. Fallback to candidate local paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_paths = [
        os.path.join(base_dir, "raw_datasets", "tenders_parsed_cache.json"),
        os.path.join(base_dir, "tenders_parsed_cache.json"),
        os.path.join(base_dir, "dist", "tenders.json")
    ]
    
    for path in candidate_paths:
        if os.path.exists(path):
            try:
                mtime = os.path.getmtime(path)
                if mtime == _cached_mtime and _cached_data.get("tenders"):
                    return _cached_data
                
                with open(path, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
                
                tenders = raw_data.get("tenders", raw_data) if isinstance(raw_data, dict) else raw_data
                if not isinstance(tenders, list):
                    tenders = []

                active_count = sum(1 for t in tenders if parse_dt(t.get('documentLastSellingDate', '')) >= now)
                archived_count = len(tenders) - active_count

                _cached_mtime = mtime
                _cached_data = {
                    "total": len(tenders),
                    "active_count": raw_data.get("active_count", active_count) if isinstance(raw_data, dict) else active_count,
                    "archived_count": raw_data.get("archived_count", archived_count) if isinstance(raw_data, dict) else archived_count,
                    "last_updated": raw_data.get("last_updated", now.strftime("%d-%b-%Y %H:%M:%S")) if isinstance(raw_data, dict) else now.strftime("%d-%b-%Y %H:%M:%S"),
                    "tenders": tenders
                }
                return _cached_data
            except Exception as e:
                print(f"Error reading {path}: {e}")
                
    return _cached_data

@app.route("/")
def index():
    data = load_live_tenders()
    tenders = data.get("tenders", [])
    
    districts = sorted(list(set(t.get('procuringDistrict', 'Dhaka') for t in tenders if t.get('procuringDistrict'))))
    orgs = sorted(list(set(t.get('organization', '') for t in tenders if t.get('organization'))))
    pes = sorted(list(set(t.get('procuringEntity', '') for t in tenders if t.get('procuringEntity'))))
    
    return render_template(
        "index.html", 
        initial_tenders_json="null",
        tenders=[], 
        active_count=data.get("active_count", 0),
        archived_count=data.get("archived_count", 0),
        last_updated=data.get("last_updated", ""),
        districts=districts,
        orgs=orgs,
        pes=pes
    )

@app.route("/api/tenders")
def get_tenders_api():
    """
    API Endpoint যা সরাসরি JSON ডেটা রিটার্ন করবে এবং সার্চ ও ফিল্টারিং সাপোর্ট করে।
    """
    data = load_live_tenders()
    tenders = data.get("tenders", [])
    
    q = request.args.get("q", "").lower().strip()
    tab = request.args.get("tab", "all").strip().lower()
    nature = request.args.get("nature", "All").strip()
    method = request.args.get("method", "All").strip()
    district = request.args.get("district", "All").strip()
    org = request.args.get("org", "All").strip()
    pe = request.args.get("pe", "All").strip()

    # If no filters applied, return full cached payload immediately
    if not any([q, nature != "All", method != "All", district != "All", org != "All", pe != "All", tab not in ("all", "")]):
        return jsonify(data)

    now = datetime.now()
    filtered = []
    
    for t in tenders:
        # Tab Filter
        sell_dt = parse_dt(t.get('documentLastSellingDate', ''))
        if tab == "active" and sell_dt < now:
            continue
        elif tab == "archived" and sell_dt >= now:
            continue

        # Search Query
        if q:
            matches = (
                q in str(t.get('id', '')).lower() or
                q in str(t.get('packageDescription', '')).lower() or
                q in str(t.get('briefDescription', '')).lower() or
                q in str(t.get('organization', '')).lower() or
                q in str(t.get('procuringEntity', '')).lower() or
                q in str(t.get('ministry', '')).lower() or
                q in str(t.get('procuringDistrict', '')).lower()
            )
            if not matches:
                continue

        # Dropdowns
        if nature != "All" and nature.upper() not in str(t.get('procurementNature', '')).upper():
            continue
        if method != "All" and method.upper() not in str(t.get('procurementMethod', '')).upper():
            continue
        if district != "All" and t.get('procuringDistrict') != district:
            continue
        if org != "All" and t.get('organization') != org:
            continue
        if pe != "All" and t.get('procuringEntity') != pe:
            continue

        filtered.append(t)

    return jsonify({
        "total": len(filtered),
        "active_count": data.get("active_count", 0),
        "archived_count": data.get("archived_count", 0),
        "last_updated": data.get("last_updated", ""),
        "tenders": filtered
    })

@app.route("/tenders_parsed_cache.json")
@app.route("/dist/tenders.json")
@app.route("/tenders.json")
def serve_static_cache():
    return jsonify(load_live_tenders())

@app.route("/sw.js")
def serve_sw():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")
    return send_from_directory(dist_dir, "sw.js", mimetype="application/javascript")

if __name__ == "__main__":
    load_live_tenders()
    app.run(debug=True, host="0.0.0.0", port=5000)
