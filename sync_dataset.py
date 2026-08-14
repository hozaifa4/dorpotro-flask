#!/usr/bin/env python3
"""
================================================================================
🚀 DORPOTRO 1-CLICK TENDER PUBLISHER (Single Standalone Script)
================================================================================
Everything is embedded in this single file. No config.json or extra files needed!
Place your .xlsx, .csv, or .json files in the same folder (or raw_datasets/) and run:
    python sync_dataset.py
================================================================================
"""

import os, glob, json, re, zipfile, subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

# Dynamic GitHub Configuration
def get_github_token():
    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"].strip()
    cfg_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
    if os.path.exists(cfg_file):
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                return json.load(f).get("github_token", "").strip()
        except Exception:
            pass
    return ""

GITHUB_REPO = "hozaifa4/dorpotro-flask"
GITHUB_BRANCH = "main"

def clean_header(h):
    return str(h or "").strip().replace('\ufeff', '').replace('ï»¿', '').replace('"', '').strip()

def excel_date_to_str(val, default_time="09:00"):
    if not val: return ""
    val_str = str(val).strip()
    try:
        f = float(val_str)
        if 35000 < f < 60000:
            return (datetime(1899, 12, 30) + timedelta(days=f)).strftime('%d-%b-%Y %H:%M')
    except ValueError:
        pass
    m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?", val_str)
    if m_iso:
        y, m, d, t = m_iso.groups()
        try:
            dt = datetime(int(y), int(m), int(d))
            return f"{dt.strftime('%d-%b-%Y')} {t}" if t else dt.strftime('%d-%b-%Y')
        except Exception:
            pass
    return val_str

def parse_dt(d_str):
    if not d_str: return datetime.min
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

def parse_num(val_str):
    if not val_str: return 0
    cleaned = re.sub(r'[^\d.]', '', str(val_str))
    try:
        return float(cleaned) if '.' in cleaned else int(cleaned)
    except Exception:
        return 0

def read_xlsx_full_rows(filename):
    rows = []
    try:
        with zipfile.ZipFile(filename, 'r') as z:
            shared = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for node in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    shared.append(''.join([t.text or '' for t in node.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]))
            sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            for r in sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                col_map = {}
                for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    r_ref = c.get('r')
                    col_letters = re.sub(r'\d+', '', r_ref) if r_ref else ''
                    t = c.get('t')
                    v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v.text if v is not None and v.text is not None else ''
                    if t == 's' and val.isdigit():
                        val = shared[int(val)] if int(val) < len(shared) else val
                    elif t == 'inlineStr':
                        is_node = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is')
                        if is_node is not None:
                            val = ''.join([t_n.text or '' for t_n in is_node.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')])
                    if col_letters:
                        col_idx = 0
                        for char in col_letters:
                            col_idx = col_idx * 26 + (ord(char.upper()) - ord('A') + 1)
                        col_map[col_idx - 1] = val
                if col_map:
                    max_c = max(col_map.keys())
                    rows.append([col_map.get(i, "") for i in range(max_c + 1)])
    except Exception as e:
        print(f"  ❌ Error reading xlsx {filename}: {e}")
    return rows

def read_csv_full_rows(filename):
    import csv
    rows = []
    try:
        with open(filename, mode='r', encoding='utf-8-sig', errors='replace') as f:
            for r in csv.reader(f):
                rows.append(r)
    except Exception as e:
        print(f"  ❌ Error reading csv {filename}: {e}")
    return rows

def parse_tender_row(headers, row, row_idx, file_date=""):
    d = {headers[i].strip(): str(row[i]).strip() for i in range(min(len(headers), len(row)))}
    
    def get_col(keys, default=""):
        for k in keys:
            for actual_col, val in d.items():
                clean_c = actual_col.lower().replace("_", " ").replace("-", " ").strip()
                clean_k = k.lower().replace("_", " ").replace("-", " ").strip()
                if clean_c == clean_k or (clean_k in clean_c and len(clean_k) > 4):
                    if val and val.lower() != 'nan':
                        return val
        return default

    t_id = get_col(['Tender ID', 'Tender/Proposal ID', 'ID', 'TenderId'])
    if not t_id or not re.search(r'\d', t_id):
        t_id = str(row_idx)
    t_id = re.sub(r'\.0$', '', t_id).strip()

    raw_pub = get_col([
        'Publication Date & Time',
        'Tender/Proposal Publication Date and Time',
        'Publication Date and Time',
        'Published Date',
        'Publication Date'
    ]) or (f"{file_date} 09:00" if file_date else "02-Aug-2026 09:00")

    raw_sell = get_col([
        'Tender/Proposal Document last selling',
        'Document last selling date and time',
        'Document Last Selling Date and Time',
        'Document Last Selling Date & Time',
        'Last Selling Date',
        'Selling Date'
    ])
    
    doc_price = parse_num(get_col(['Tender Document Price', 'Document Price', 'Price'], '500'))
    sec_amount = parse_num(get_col(['Tender Security', 'Tender Security(Amount in BDT)', 'Security Amount'], '15000'))
    est_cost = get_col(['Estimated Cost', 'Budget', 'Estimated Cost (in BDT)'], 'Revenue')

    return {
        "id": t_id,
        "ministry": get_col(['Ministry', 'Ministry Name']),
        "division": get_col(['Division', 'Division Name']),
        "organization": get_col(['Organization', 'Organization Name', 'Procuring Agency']),
        "procuringEntity": get_col(['Procuring Entity', 'Procuring Entity Name', 'PE']),
        "procuringDistrict": get_col(['Procuring Entity District', 'District', 'Location']),
        "procurementNature": get_col(['Procurement Nature', 'Nature'], 'Works'),
        "procurementType": get_col(['Procurement Type', 'Type'], 'NCT'),
        "eventType": get_col(['Event Type', 'Type of Event'], 'OTM'),
        "invitationRefNo": get_col(['Invitation Reference No.', 'Invitation Ref', 'Ref No']),
        "appId": get_col(['App ID', 'APP ID']),
        "procurementMethod": get_col(['Procurement Method', 'Method'], 'Open Tendering Method (OTM)'),
        "budgetType": get_col(['Budget Type', 'Source of Fund'], 'Revenue'),
        "sourceOfFunds": get_col(['Source of Funds', 'Funding Source'], 'Government'),
        "projectCode": get_col(['Project Code'], 'Not applicable'),
        "projectName": get_col(['Project Name'], 'Not applicable'),
        "packageNo": get_col(['Tender/Proposal Package No.', 'Package No']),
        "packageDescription": get_col(['Tender/Proposal Package Description', 'Package Description', 'Description', 'Work Description']),
        "category": get_col(['Category']),
        "publicationDate": excel_date_to_str(raw_pub),
        "documentLastSellingDate": excel_date_to_str(raw_sell, "17:00"),
        "eligibility": get_col(['Eligibility of Consultant', 'Eligibility of Tenderer', 'Eligibility']),
        "briefDescription": get_col(['Brief Description of Goods and Related Service', 'Brief Description of Works', 'Brief Description']),
        "evaluationType": get_col(['Evaluation Type'], 'Package wise'),
        "documentPrice": doc_price if doc_price > 0 else 500,
        "securityAmount": sec_amount if sec_amount > 0 else 15000,
        "location": get_col(['Location', 'Project Location']),
        "tentativeStartDate": excel_date_to_str(get_col(['Tentative Start Date', 'Start Date'])),
        "tentativeEndDate": excel_date_to_str(get_col(['Tentative Completion Date', 'Tentative End Date', 'End Date'])),
        "officialInviter": get_col(['Name of Official Inviting', 'Official Inviting Tender', 'Inviting Official']),
        "officialDesignation": get_col(['Designation of Official Inviting', 'Designation']),
        "officialAddress": get_col(['Address of Official Inviting', 'Address']),
        "thana": get_col(['Thana', 'PE Thana']),
        "district": get_col(['District', 'PE District']),
        "phone": get_col(['Contact Details of Official Inviting', 'Phone', 'Phone No']),
        "estimatedCost": est_cost,
        "estimatedCostAmt": parse_num(est_cost),
        "tenderLink": f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={t_id}",
        "isReTender": False,
        "potentialConflicts": []
    }

def sync_all():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(root_dir, "raw_datasets") if os.path.exists(os.path.join(root_dir, "raw_datasets")) else root_dir

    print("=" * 65)
    print("🚀 DORPOTRO 1-CLICK INSTANT PUBLISHER")
    print("=" * 65)

    files = glob.glob(os.path.join(raw_dir, "*.xlsx")) + glob.glob(os.path.join(raw_dir, "*.csv")) + glob.glob(os.path.join(raw_dir, "*.json"))
    valid_files = [f for f in files if not os.path.basename(f).startswith("~") and not os.path.basename(f).startswith(".") and os.path.basename(f) not in ("tenders_parsed_cache.json", "package.json", "tsconfig.json", "metadata.json")]

    if not valid_files:
        print("⚠️ No Excel/CSV/JSON files found! Place your tender files here and run again.")
        return

    print(f"📁 Processing {len(valid_files)} dataset file(s)...")
    tenders_by_id = {}
    row_count = 0

    for fpath in valid_files:
        fname = os.path.basename(fpath)
        m = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{4})', fname)
        file_date = m.group(1) if m else ""

        try:
            if fname.lower().endswith(".json"):
                with open(fpath, 'r', encoding='utf-8') as jf:
                    data = json.load(jf)
                    items = data.get("tenders", data) if isinstance(data, dict) else data
                    for item in (items if isinstance(items, list) else [items]):
                        if isinstance(item, dict) and item.get("id"):
                            tenders_by_id[str(item["id"])] = item
                print(f"  ✅ {fname} (JSON)")
                continue

            rows = read_xlsx_full_rows(fpath) if fname.lower().endswith(".xlsx") else read_csv_full_rows(fpath)
            if not rows or len(rows) < 2: continue

            headers = [clean_header(h) for h in rows[0]]
            for r in rows[1:]:
                row_count += 1
                t = parse_tender_row(headers, r, row_count, file_date=file_date)
                if t and t["id"]:
                    tenders_by_id[t["id"]] = t
            print(f"  ✅ {fname}")
        except Exception as e:
            print(f"  ❌ Error reading {fname}: {e}")

    unique_tenders = list(tenders_by_id.values())
    unique_tenders.sort(key=lambda t: (parse_dt(t.get('publicationDate', '')), int(t['id']) if str(t.get('id','')).isdigit() else 0), reverse=True)

    now = datetime.now()
    active_tenders = [t for t in unique_tenders if parse_dt(t.get('documentLastSellingDate', '')) >= now]
    archived_tenders = [t for t in unique_tenders if parse_dt(t.get('documentLastSellingDate', '')) < now]

    print("-" * 65)
    print(f"✨ Total Tenders: {len(unique_tenders)} | 🟢 Live: {len(active_tenders)} | ⚪ Archived: {len(archived_tenders)}")

    manifest = {os.path.basename(f): os.path.getmtime(f) for f in valid_files}
    payload = {
        "manifest": manifest,
        "total": len(unique_tenders),
        "active_count": len(active_tenders),
        "archived_count": len(archived_tenders),
        "last_updated": now.strftime("%d-%b-%Y %H:%M:%S"),
        "tenders": unique_tenders
    }

    # Save outputs
    cache_dir = os.path.join(root_dir, "raw_datasets") if os.path.exists(os.path.join(root_dir, "raw_datasets")) else root_dir
    with open(os.path.join(cache_dir, "tenders_parsed_cache.json"), 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    dist_dir = os.path.join(root_dir, "dist")
    if os.path.exists(dist_dir):
        with open(os.path.join(dist_dir, "tenders.json"), 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False)
        with open(os.path.join(dist_dir, "tenders_active.json"), 'w', encoding='utf-8') as f:
            json.dump({"total": len(active_tenders), "tenders": active_tenders}, f, ensure_ascii=False)

    print("💾 Manifests saved successfully.")

    # Git push via token
    token = get_github_token()
    if token and os.path.exists(os.path.join(root_dir, ".git")):
        print(f"☁️ Publishing updates to GitHub & Vercel...")
        msg = f"Auto-Sync: {now.strftime('%d-%b-%Y %H:%M')} ({len(unique_tenders)} tenders, {len(active_tenders)} live)"
        auth_url = f"https://oauth2:{token}@github.com/{GITHUB_REPO}.git"
        try:
            subprocess.run(["git", "add", "."], cwd=root_dir, check=False)
            subprocess.run(["git", "commit", "-m", msg], cwd=root_dir, check=False)
            res = subprocess.run(["git", "push", auth_url, f"HEAD:{GITHUB_BRANCH}"], cwd=root_dir, capture_output=True, text=True)
            if res.returncode == 0:
                print("🚀 Live Website Updated on Vercel!")
            else:
                print(f"⚠️ Push notice: {res.stderr.strip()[:80]}")
        except Exception as e:
            print(f"⚠️ Push notice: {e}")

    print("=" * 65)
    print(f"🎉 Complete! 🟢 {len(active_tenders)} Live Tenders ready.")
    print("=================================================================")

if __name__ == "__main__":
    sync_all()
