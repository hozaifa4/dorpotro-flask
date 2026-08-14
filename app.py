#!/usr/bin/env python3
import os
import glob
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_folder="dist/assets", static_url_path="/assets", template_folder="dist")

# In-memory tender dataset cache
dataset_cache = []

def clean_header(h):
    if not h:
        return ""
    h = str(h).strip()
    h = h.replace('﻿', '').replace('"', '').strip()
    return h

def excel_date_to_str(val, default_time="09:00"):
    if not val:
        return ""
    val_str = str(val).strip()
    
    # 1. Excel serial float (e.g. 46163.998611111114)
    try:
        f = float(val_str)
        if 35000 < f < 60000:
            dt = datetime(1899, 12, 30) + timedelta(days=f)
            return dt.strftime('%d-%b-%Y %H:%M')
    except ValueError:
        pass
    
    # 2. If YYYY-MM-DD or YYYY-MM-DD HH:MM -> convert to DD-Mon-YYYY (e.g. 30-Nov-2026)
    m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?", val_str)
    if m_iso:
        y, m, d, t = m_iso.groups()
        try:
            dt = datetime(int(y), int(m), int(d))
            if t:
                return f"{dt.strftime('%d-%b-%Y')} {t}"
            return dt.strftime('%d-%b-%Y')
        except Exception:
            pass

    # 3. If DD-Mon-YYYY (e.g. 02-Aug-2026 or 02-Aug-2026 23:50)
    m_bd = re.match(r"^(\d{1,2}-[A-Za-z]{3}-\d{4})(?:\s+(\d{1,2}:\d{2}))?", val_str)
    if m_bd:
        return val_str

    return val_str

def parse_dt(d_str):
    if not d_str:
        return datetime.min
    d_str = str(d_str).strip()
    try:
        # 1. DD-Mon-YYYY HH:MM or DD-Mon-YYYY
        m = re.match(r'^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}:\d{2}))?', d_str)
        if m:
            day, mon, year, t = m.groups()
            t = t or "00:00"
            return datetime.strptime(f"{day.zfill(2)}-{mon}-{year} {t}", "%d-%b-%Y %H:%M")
        
        # 2. YYYY-MM-DD HH:MM or YYYY-MM-DD
        m2 = re.match(r'^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?', d_str)
        if m2:
            y, m, d, t = m2.groups()
            t = t or "00:00"
            return datetime.strptime(f"{y}-{m}-{d} {t}", "%Y-%m-%d %H:%M")
    except Exception:
        pass
    return datetime.min

def parse_num(val_str):
    if not val_str:
        return 0
    cleaned = re.sub(r'[^\d.]', '', str(val_str))
    try:
        return float(cleaned) if '.' in cleaned else int(cleaned)
    except Exception:
        return 0

def read_xlsx_full_rows(filename):
    rows = []
    with zipfile.ZipFile(filename) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for node in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text = ''.join([t.text or '' for t in node.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')])
                shared.append(text)
        
        sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        for r in sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            col_map = {}
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                r_ref = c.get('r')
                col_letters = re.sub(r'\d+', '', r_ref) if r_ref else ''
                t = c.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit():
                    idx = int(val)
                    val = shared[idx] if idx < len(shared) else val
                
                c_idx = 0
                for char in col_letters:
                    c_idx = c_idx * 26 + (ord(char.upper()) - ord('A') + 1)
                c_idx -= 1
                
                if c_idx >= 0:
                    col_map[c_idx] = val.strip()

            if col_map:
                max_col = max(col_map.keys())
                row_list = [col_map.get(i, "") for i in range(max_col + 1)]
                rows.append(row_list)
    return rows

def parse_tender_row(headers, row, row_num, file_date=""):
    h_map = {}
    for idx, h in enumerate(headers):
        clean_h = clean_header(h)
        if clean_h:
            h_map[clean_h] = idx

    def get_col(*aliases):
        for alias in aliases:
            clean_alias = clean_header(alias).lower()
            if not clean_alias:
                continue
            for h, idx in h_map.items():
                if clean_alias == h.lower() or clean_alias in h.lower() or h.lower() in clean_alias:
                    if idx < len(row):
                        val = str(row[idx]).strip()
                        if val:
                            return val
        return ""

    tender_id = get_col('Tender/Proposal ID', 'Tender ID', 'TenderID', 'Ref ID', 'ID')
    if not tender_id.replace('.0','').isdigit():
        for cell in row:
            m = re.search(r'id=(\d+)', str(cell))
            if m:
                tender_id = m.group(1)
                break
    if not tender_id.replace('.0','').isdigit():
        for cell in row:
            c_clean = str(cell).replace('.0','').strip()
            if c_clean.isdigit() and 5 <= len(c_clean) <= 8:
                tender_id = c_clean
                break

    if not tender_id:
        return None

    tender_id = tender_id.replace('.0', '').strip()
    tender_link = get_col('Tender Link', 'Link', 'URL') or f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}"
    pub_date_raw = get_col('Scheduled Tender/Proposal Publication Date and Time', 'Publication Date', 'Publish Date')
    sell_date_raw = get_col('Tender/Proposal Document last selling / downloading Date and Time', 'Closing Date', 'Selling Date', 'Last Selling Date')

    tentative_start_raw = get_col('Tentative Start Date', 'Tentative Date of Commencement')
    tentative_end_raw = get_col('Tentative End Date', 'Tentative Date of Completion')

    pub_date = excel_date_to_str(pub_date_raw, "09:00") or file_date or "02-Aug-2026 09:00"
    sell_date = excel_date_to_str(sell_date_raw, "17:00") or "01-Sep-2026 17:00"
    tentative_start = excel_date_to_str(tentative_start_raw, "09:00")
    tentative_end = excel_date_to_str(tentative_end_raw, "17:00")

    doc_price_raw = get_col('Tender/Proposal Document Price (In BDT) ', 'Tender/Proposal Document Price (In BDT)', 'Document Price', 'Doc Price', 'Doc Fee', 'Price')
    doc_price = int(parse_num(doc_price_raw)) if doc_price_raw else 500
    if doc_price == 0: doc_price = 500

    security_amt_raw = get_col('Tender/Proposal security(Amount in BDT)', 'Security Amount', 'Tender Security', 'Security')
    security_amt = int(parse_num(security_amt_raw)) if security_amt_raw else 15000

    est_cost_raw = get_col('Estimated Cost', 'Estimated Value', 'Cost', 'Budget', 'Value')
    est_cost_amt = parse_num(est_cost_raw)

    ministry = get_col('Ministry', 'Ministry Name') or "Ministry of Housing and Public Works"
    division = get_col('Division', 'Division Name') or ""
    organization = get_col('Organization', 'Organization Name') or "Public Works Department (PWD)"
    procuring_entity = get_col('Procuring Entity Name', 'Procuring Entity', 'PE Name') or organization
    district = get_col('District', 'Procuring Entity District', 'City', 'Location') or "Dhaka"

    nature = get_col('Procurement Nature', 'Nature') or "Works"
    if not nature:
        nature = "Works"

    method_raw = get_col('Procurement Method ', 'Procurement Method', 'Method') or "Open Tendering Method (OTM)"
    method = method_raw.strip() if method_raw.strip() else "Open Tendering Method (OTM)"

    pkg_raw = get_col('Tender/Proposal Package No. and Description', 'Brief Description of Works', 'Project Name', 'Package Description', 'Description', 'Title')
    package_no = f"PKG-{tender_id}"
    package_desc = pkg_raw or "Construction, Repair and Maintenance Works"

    if " Description:" in pkg_raw:
        parts = pkg_raw.split(" Description:", 1)
        package_no = parts[0].replace("Package No.:", "").strip()
        package_desc = parts[1].strip()

    eligibility = get_col('Eligibility of Tenderer', 'Eligibility') or "Up to date Trade license, VAT Registration certificate & Tax clearance Certificate."
    brief_desc = get_col('Brief Description of Works', 'Description', 'Project Name') or package_desc

    official_name = get_col('Name of Official Inviting Tender/Proposal') or "Executive Engineer"
    official_desig = get_col('Designation of Official Inviting Tender/Proposal') or "Executive Engineer"
    official_addr = get_col('Address of Official Inviting Tender/Proposal') or get_col('Address') or district
    phone = get_col('Contact details of Official Inviting Tender/Proposal', 'Phone No', 'Phone', 'Contact') or ""

    formatted_est_cost = ""
    if est_cost_amt > 0:
        if est_cost_amt >= 10000000:
            crore_val = est_cost_amt / 10000000.0
            formatted_est_cost = f"{est_cost_amt:,.0f} BDT ({crore_val:.2f} Crore)"
        elif est_cost_amt >= 100000:
            lac_val = est_cost_amt / 100000.0
            formatted_est_cost = f"{est_cost_amt:,.0f} BDT ({lac_val:.2f} Lac)"
        else:
            formatted_est_cost = f"{est_cost_amt:,.0f} BDT"
    else:
        formatted_est_cost = str(est_cost_raw) if est_cost_raw else "Rate Contract"

    return {
        "id": str(tender_id),
        "ministry": ministry,
        "division": division,
        "organization": organization,
        "procuringEntity": procuring_entity,
        "procuringDistrict": district,
        "procurementNature": nature,
        "procurementType": get_col('Procurement Type') or "NCT",
        "eventType": get_col('Event Type') or "TENDER",
        "invitationRefNo": get_col('Invitation Reference No.') or f"REF-{tender_id}",
        "appId": get_col('App ID') or f"APP-{tender_id}",
        "procurementMethod": method,
        "budgetType": get_col('Budget Type') or "Revenue",
        "sourceOfFunds": get_col('Source of Funds') or "Government",
        "projectCode": get_col('Project Code') or "",
        "projectName": get_col('Project Name') or "",
        "packageNo": package_no,
        "packageDescription": package_desc,
        "category": get_col('Category') or "Construction work; Engineering & Repair works; Public Utilities",
        "publicationDate": pub_date,
        "documentLastSellingDate": sell_date,
        "tentativeStartDate": tentative_start,
        "tentativeEndDate": tentative_end,
        "eligibility": eligibility,
        "briefDescription": brief_desc,
        "officialInviter": official_name,
        "officialDesignation": official_desig,
        "officialAddress": official_addr,
        "phone": phone,
        "documentPrice": doc_price,
        "securityAmount": security_amt,
        "estimatedCost": formatted_est_cost,
        "tenderLink": tender_link
    }

def load_all_tenders():
    global dataset_cache
    root_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(root_dir, "raw_datasets")
    json_cache_path = os.path.join(raw_dir, "tenders_parsed_cache.json")

    files = (
        glob.glob(os.path.join(raw_dir, "*.xlsx")) + 
        glob.glob(os.path.join(raw_dir, "*.csv"))
    )
    # Ignore the cache file itself if returned by glob
    files = sorted([f for f in list(set(files)) if not f.endswith("tenders_parsed_cache.json")])

    # Build manifest of current dataset files (filename -> filesize)
    current_manifest = {os.path.basename(f): os.path.getsize(f) for f in files}

    # Fast path: Load from JSON cache if manifest matches exactly
    if os.path.exists(json_cache_path):
        try:
            with open(json_cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            # Support both old list format and new dict format with manifest
            if isinstance(cache_data, dict) and cache_data.get("manifest") == current_manifest:
                dataset_cache = cache_data.get("tenders", [])
                print(f"⚡ [Fast-Path JSON Cache] Loaded {len(dataset_cache)} tenders from manifest cache.")
                return
            elif isinstance(cache_data, list):
                print("🔄 Updating legacy cache to manifest-based cache...")
        except Exception as e:
            print(f"JSON cache read error: {e}, re-parsing Excel datasets...")

    print("🔍 Parsing raw Excel/CSV datasets...")
    tenders_by_id = {}
    for filepath in sorted(files):
        fname = os.path.basename(filepath)
        # Extract default date from filename (e.g. 02-Aug-2026 -> 2026-08-02 09:00)
        m = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{4})', fname)
        file_date_raw = m.group(1) if m else ""
        file_date = excel_date_to_str(file_date_raw, "09:00")

        try:
            if fname.endswith('.xlsx'):
                rows = read_xlsx_full_rows(filepath)
            else:
                import csv
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    reader = csv.reader(f)
                    rows = [r for r in reader]

            if not rows or len(rows) < 2:
                continue

            headers = [clean_header(h) for h in rows[0]]
            for row_idx, r in enumerate(rows[1:], 1):
                tender = parse_tender_row(headers, r, row_idx, file_date=file_date)
                if tender and tender["id"]:
                    tenders_by_id[tender["id"]] = tender
        except Exception as e:
            print(f"Error loading {fname}: {e}")

    unique_tenders = list(tenders_by_id.values())
    unique_tenders.sort(key=lambda t: (parse_dt(t.get('publicationDate', '')), int(t['id']) if str(t.get('id','')).isdigit() else 0), reverse=True)
    dataset_cache = unique_tenders

    # Save to JSON cache with current manifest for fast subsequent loads
    try:
        payload = {
            "manifest": current_manifest,
            "tenders": dataset_cache
        }
        with open(json_cache_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False)
        print(f"💾 Saved {len(dataset_cache)} tenders to fast manifest JSON cache ({json_cache_path}).")
    except Exception as e:
        print(f"Warning: Failed to write JSON cache: {e}")

    print(f"Flask Data Engine loaded {len(dataset_cache)} tenders into memory.")

# Load tenders immediately on module import
load_all_tenders()

@app.route("/")
@app.route("/<path:path>")
def index(path=""):
    now = datetime.now()
    districts = sorted(list(set(t.get('procuringDistrict', 'Dhaka') for t in dataset_cache if t.get('procuringDistrict'))))
    orgs = sorted(list(set(t.get('organization', '') for t in dataset_cache if t.get('organization'))))
    pes = sorted(list(set(t.get('procuringEntity', '') for t in dataset_cache if t.get('procuringEntity'))))
    
    active_count = 0
    archived_count = 0
    for t in dataset_cache:
        try:
            sell_dt = parse_dt(t.get('documentLastSellingDate', ''))
            if sell_dt >= now:
                active_count += 1
            else:
                archived_count += 1
        except Exception:
            active_count += 1

    return render_template("index.html", 
                           initial_tenders_json=json.dumps(dataset_cache),
                           total_count=len(dataset_cache),
                           active_count=active_count,
                           archived_count=archived_count,
                           districts=districts, 
                           orgs=orgs, 
                           pes=pes)

@app.route("/api/tenders")
def api_tenders():
    q = request.args.get("q", "").lower().strip()
    nature = request.args.get("nature", "All").strip()
    method = request.args.get("method", "All").strip()
    district = request.args.get("district", "All").strip()
    org = request.args.get("org", "All").strip()
    pe = request.args.get("pe", "All").strip()
    tab = request.args.get("tab", "all").strip()

    filtered = []
    now = datetime.now()

    for t in dataset_cache:
        # Tab filter
        sell_dt = parse_dt(t.get('documentLastSellingDate', ''))
        if tab == "active":
            if sell_dt < now:
                continue
        elif tab == "archived":
            if sell_dt >= now:
                continue

        # Search Query
        if q:
            matches = (
                q in t['id'].lower() or
                q in t['packageDescription'].lower() or
                q in t['briefDescription'].lower() or
                q in t['organization'].lower() or
                q in t['procuringEntity'].lower() or
                q in t['ministry'].lower() or
                q in t['procuringDistrict'].lower()
            )
            if not matches:
                continue

        # Nature
        if nature != "All" and nature.upper() not in t['procurementNature'].upper():
            continue

        # Method
        if method != "All" and method.upper() not in t['procurementMethod'].upper():
            continue

        # District
        if district != "All" and t['procuringDistrict'] != district:
            continue

        # Organization
        if org != "All" and t['organization'] != org:
            continue

        # PE
        if pe != "All" and t['procuringEntity'] != pe:
            continue

        filtered.append(t)

    return jsonify({
        "total": len(filtered),
        "tenders": filtered
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
