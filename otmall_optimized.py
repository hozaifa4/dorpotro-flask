#!/usr/bin/env python3
"""
================================================================================
🚀 OTM ALL OPTIMIZED - Parallel Multi-Threaded e-GP Scraper & Auto-Publisher
================================================================================
Features:
- Multi-Worker Parallel Engine: 2 Parallel Headless Browsers (2x Scraping Speed)
- Ultra-Flexible Date Input: Single day (14), Ranges (10-14, 10 to 14), or Unordered (12, 10, 11)
- Date-Segregated Files: Generates a SEPARATE CSV and JSON for EACH individual date!
- Natural Descending Date Navigation in Phase 1 with 100% Zero-Prompt Auto-Stopping
- Page Load Strategy: 'eager' for maximum DOM responsiveness
- Phase 2 Auto-Retry on Timeout for 100% data extraction resilience
- Phase 3 Automatic Financial Year Selection (2026-2027) with Cross-Year Fallback (2025-2026)
- Thread-Safe Instant Multi-File CSV Flushing with Smart Auto-Resume
- Embedded Dorpotro Auto-Sync: Generates Date-Specific JSON Archives & Central Live Feed
  and publishes to GitHub/Vercel (No local .git required!)
================================================================================
"""

import time
import os
import re
import csv
import glob
import json
import zipfile
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service

# Try lxml parser for maximum speed, fallback to html.parser
try:
    import lxml
    PARSER = 'lxml'
except ImportError:
    PARSER = 'html.parser'

# ==========================================
# ⚙️ GitHub Settings for Dorpotro Auto-Sync
# ==========================================
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "hozaifa4/dorpotro-flask")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

# Load from local config.json if present
_cfg_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
if os.path.exists(_cfg_file):
    try:
        with open(_cfg_file, 'r', encoding='utf-8') as _cf:
            _cdata = json.load(_cf)
            if not GITHUB_TOKEN:
                GITHUB_TOKEN = _cdata.get("github_token", "")
            if not GITHUB_REPO or GITHUB_REPO == "hozaifa4/dorpotro-flask":
                GITHUB_REPO = _cdata.get("github_repo", GITHUB_REPO)
            if not GITHUB_BRANCH or GITHUB_BRANCH == "main":
                GITHUB_BRANCH = _cdata.get("github_branch", GITHUB_BRANCH)
    except Exception:
        pass

# Number of Parallel Worker Browsers (Default: 2)
NUM_WORKERS = 6

# Thread-safe synchronization locks
csv_write_lock = threading.Lock()
saved_ids_lock = threading.Lock()

# ==========================================
# 📊 CSV Columns Definition
# ==========================================
CSV_COLUMNS = [
    'Ministry', 'Division', 'Organization', 'Procuring Entity Name', 'Procuring Entity Code', 
    'Procuring Entity District', 'Procurement Nature', 'Procurement Type', 'Event Type', 
    'Invitation for ', 'Invitation Reference No.', 'App ID', 'Tender/Proposal ID', 
    'Procurement Method ', 'Budget Type', 'Source of Funds', 'Project Code', 'Project Name', 
    'Tender/Proposal Package No. and Description', 'Category', 
    'Scheduled Tender/Proposal Publication Date and Time', 
    'Tender/Proposal Document last selling / downloading Date and Time', 
    'Eligibility of Tenderer', 'Brief Description of Works', 'Evaluation Type', 
    'Document Available', 'Document Fees', 'Tender/Proposal Document Price (In BDT) ', 
    'Mode of Payment', 'Tender/Proposal Security Valid Up to', 'Tender/Proposal Valid Up to', 
    'Lot No.', 'Identification of Lot', 'Location', 'Tender/Proposal security(Amount in BDT)', 
    'Tentative Start Date', 'Tentative Completion Date', 
    'Name of Official Inviting Tender/Proposal', 'Designation of Official Inviting Tender/Proposal', 
    'Address of Official Inviting Tender/Proposal', 'Address', 'City', 'Thana', 'District', 
    'Phone No', 'Fax No', 'Estimated Cost', 'Tender Link'
]

# URLs
TENDER_SEARCH_URL = "https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t"
APP_SEARCH_URL = "https://www.eprocure.gov.bd/resources/common/AdvAPPSearch.jsp?from=search"

# ==========================================
# 📁 Helper Functions for Auto-Resume & CSV
# ==========================================
def parse_days_input(raw_input):
    """
    Parses flexible day inputs like '14', '10,11,12', '12, 10, 11', '10-14', '10 to 14', '14-10', '08, 10-12, 14'.
    Converts Bengali numerals to English and returns sorted unique list of zero-padded day strings.
    """
    # Bengali to English digit mapping
    bn_to_en = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
    cleaned = raw_input.translate(bn_to_en).lower()
    cleaned = re.sub(r'\s*to\s*', '-', cleaned)
    cleaned = re.sub(r'\s*-\s*', '-', cleaned)
    cleaned = cleaned.replace('এবং', ',').replace('and', ',')

    days = set()
    parts = [p.strip() for p in cleaned.replace(' ', ',').split(',') if p.strip()]
    for part in parts:
        if '-' in part and not part.startswith('-'):
            subparts = [sp.strip() for sp in part.split('-') if sp.strip()]
            if len(subparts) == 2 and subparts[0].isdigit() and subparts[1].isdigit():
                start_d = int(subparts[0])
                end_d = int(subparts[1])
                for d in range(min(start_d, end_d), max(start_d, end_d) + 1):
                    if 1 <= d <= 31:
                        days.add(str(d).zfill(2))
            else:
                if part.isdigit() and 1 <= int(part) <= 31:
                    days.add(str(int(part)).zfill(2))
        elif part.isdigit() and 1 <= int(part) <= 31:
            days.add(str(int(part)).zfill(2))
            
    if not days:
        curr_d = datetime.now().strftime("%d")
        days.add(curr_d)
        
    return sorted(list(days))

def get_csv_filename_for_date_str(date_str, default_month, default_year):
    """Returns the dedicated CSV filename for a specific date (e.g. 13-Aug-2026 -> Tender_Data_13_Aug_2026.csv)."""
    m = re.search(r'(\d{1,2})-([A-Za-z]{3})-(\d{4})', str(date_str))
    if m:
        d, mon, yr = m.groups()
        return f"Tender_Data_{d.zfill(2)}_{mon}_{yr}.csv"
    return f"Tender_Data_{datetime.now().strftime('%d')}_{default_month}_{default_year}.csv"

def get_csv_filename_for_item(item, default_month, default_year):
    """Determines which date-specific CSV file an item belongs to."""
    pub_date = str(item.get('Scheduled Tender/Proposal Publication Date and Time', '')).strip()
    return get_csv_filename_for_date_str(pub_date, default_month, default_year)

def append_row_to_csv(filename, row_dict, fieldnames=CSV_COLUMNS):
    """Appends a single dictionary row to its dedicated date CSV instantly with auto-flush."""
    file_exists = os.path.exists(filename) and os.path.getsize(filename) > 0
    clean_row = {col: str(row_dict.get(col, '')).strip() for col in fieldnames}
    with open(filename, mode='a', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL, extrasaction='ignore')
        if not file_exists:
            writer.writeheader()
        writer.writerow(clean_row)
        f.flush()

def thread_safe_append_row(filename, row_dict):
    """Thread-safe wrapper for instant date-specific CSV writing."""
    with csv_write_lock:
        append_row_to_csv(filename, row_dict)

def read_existing_csv_ids(filename):
    """Reads existing processed tender IDs from a CSV file for auto-resume."""
    if not os.path.exists(filename) or os.path.getsize(filename) == 0:
        return set()
    ids = set()
    try:
        with open(filename, mode='r', encoding='utf-8-sig', errors='replace') as f:
            reader = csv.DictReader(f)
            for row in reader:
                tid = row.get('Tender/Proposal ID', '').strip()
                if tid:
                    ids.add(tid)
    except Exception as e:
        print(f"⚠️ Warning reading existing CSV ({filename}): {e}")
    return ids

def get_value_by_label(soup, keywords):
    """Extracts value from a table cell based on its label keywords."""
    labels = soup.find_all('td')
    for label in labels:
        label_text = label.get_text(separator=" ", strip=True)
        if all(k.lower() in label_text.lower() for k in keywords):
            next_td = label.find_next_sibling('td')
            if next_td:
                return next_td.get_text(separator=" ", strip=True)
    return ""

def init_browser():
    """Initializes Headless Chrome Browser with eager loading strategy."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    options.page_load_strategy = 'eager'  # ⚡ 2x Faster DOM loading

    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2
    }
    options.add_experimental_option("prefs", prefs)

    driver_path = None
    cache_paths = glob.glob("/home/hozaifa/.cache/selenium/chromedriver/linux64/*/chromedriver")
    if cache_paths:
        driver_path = sorted(cache_paths)[-1]

    if driver_path and os.path.exists(driver_path):
        service = Service(executable_path=driver_path)
        driver = webdriver.Chrome(service=service, options=options)
    else:
        driver = webdriver.Chrome(options=options)

    driver.set_page_load_timeout(25)
    return driver

def safe_driver_get(driver, url, max_retries=3, delay=3):
    """Navigates to URL safely with retries on network drop."""
    for attempt in range(1, max_retries + 1):
        try:
            driver.get(url)
            return True
        except Exception as e:
            time.sleep(delay)
    return False

def select_financial_year(driver, target_year):
    """
    Robustly finds and selects the Financial Year dropdown on AdvAPPSearch.jsp.
    """
    candidate_selectors = [
        (By.ID, "cmbFinancialYear"),
        (By.ID, "financialYear"),
        (By.NAME, "cmbFinancialYear"),
        (By.NAME, "financialYear"),
        (By.ID, "ddlFinancialYear"),
        (By.XPATH, "//select[contains(@id, 'Fin') or contains(@name, 'Fin') or contains(@id, 'fin')]"),
        (By.XPATH, "//td[contains(text(), 'Financial Year')]/following-sibling::td//select"),
        (By.XPATH, "//td[contains(text(), 'Financial Year')]/following::select[1]")
    ]

    select_elem = None
    for by, query in candidate_selectors:
        try:
            elem = driver.find_element(by, query)
            if elem and elem.tag_name == "select":
                select_elem = elem
                break
        except Exception:
            continue

    if not select_elem:
        all_selects = driver.find_elements(By.TAG_NAME, "select")
        for sel in all_selects:
            try:
                opt_texts = [o.text.strip() for o in sel.find_elements(By.TAG_NAME, "option")]
                if any("2026" in opt or "2025" in opt or "2027" in opt for opt in opt_texts):
                    select_elem = sel
                    break
            except Exception:
                continue

    if select_elem:
        select_obj = Select(select_elem)
        options = [o.text.strip() for o in select_obj.options]
        matched_opt = next((o for o in options if target_year in o), None)
        if matched_opt:
            select_obj.select_by_visible_text(matched_opt)
            return True
        else:
            try:
                select_obj.select_by_value(target_year)
                return True
            except Exception:
                pass
    return False

# ==========================================
# 🔄 Embedded Dorpotro Dataset Sync Engine
# ==========================================
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
    ]) or (f"{file_date} 09:00" if file_date else f"{datetime.now().strftime('%d-%b-%Y')} 09:00")

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

def run_dorpotro_sync(target_files=None):
    """
    Parses scraped dataset, merges with all historical tenders,
    produces date-specific JSONs & master feed, and publishes to GitHub & Vercel.
    """
    root_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(root_dir, "raw_datasets") if os.path.exists(os.path.join(root_dir, "raw_datasets")) else root_dir

    token = GITHUB_TOKEN
    repo = GITHUB_REPO
    branch = GITHUB_BRANCH
    config_path = os.path.join(root_dir, "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as cf:
                c_data = json.load(cf)
                token = c_data.get("github_token", token)
                repo = c_data.get("github_repo", repo)
                branch = c_data.get("github_branch", branch)
        except Exception:
            pass

    print("\n" + "=" * 65)
    print("🚀 DORPOTRO 1-CLICK INSTANT PUBLISHER / AUTO-SYNC")
    print("=" * 65)

    tenders_by_id = {}
    date_segregated_tenders = {}

    # ---------------------------------------------------------
    # 1. ACCUMULATE: Load existing master cache locally
    # ---------------------------------------------------------
    local_cache_candidates = [
        os.path.join(raw_dir, "tenders_parsed_cache.json"),
        os.path.join(root_dir, "tenders_parsed_cache.json"),
        os.path.join(root_dir, "dist", "tenders.json")
    ]
    for c_path in local_cache_candidates:
        if os.path.exists(c_path):
            try:
                with open(c_path, 'r', encoding='utf-8') as cf:
                    c_json = json.load(cf)
                    c_items = c_json.get("tenders", c_json) if isinstance(c_json, dict) else c_json
                    if isinstance(c_items, list):
                        for item in c_items:
                            if isinstance(item, dict) and item.get("id"):
                                tenders_by_id[str(item["id"])] = item
                        if len(tenders_by_id) > 0:
                            print(f"📦 Loaded {len(tenders_by_id)} existing tenders from local cache ({os.path.basename(c_path)}).")
                            break
            except Exception as e:
                print(f"⚠️ Notice reading local cache: {e}")

    # ---------------------------------------------------------
    # 2. ACCUMULATE: Cloud Stream fallback from GitHub Raw (No 1MB Limit!)
    # ---------------------------------------------------------
    if len(tenders_by_id) < 500 and repo and branch:
        raw_urls = [
            f"https://raw.githubusercontent.com/{repo}/{branch}/raw_datasets/tenders_parsed_cache.json",
            f"https://raw.githubusercontent.com/{repo}/{branch}/tenders_parsed_cache.json"
        ]
        import urllib.request
        for r_url in raw_urls:
            try:
                req = urllib.request.Request(r_url, headers={"User-Agent": "Dorpotro-Sync-Engine"})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    raw_text = resp.read().decode('utf-8')
                    c_json = json.loads(raw_text)
                    c_items = c_json.get("tenders", c_json) if isinstance(c_json, dict) else c_json
                    if isinstance(c_items, list):
                        for item in c_items:
                            if isinstance(item, dict) and item.get("id"):
                                tenders_by_id[str(item["id"])] = item
                        print(f"☁️ Streamed {len(tenders_by_id)} existing master tenders from GitHub Raw ({r_url.split('/')[-1]}).")
                        break
            except Exception:
                pass

    # ---------------------------------------------------------
    # 3. ACCUMULATE: Load all raw files in raw_datasets directory
    # ---------------------------------------------------------
    all_raw_files = []
    if os.path.exists(raw_dir):
        all_raw_files += glob.glob(os.path.join(raw_dir, "*.xlsx")) + glob.glob(os.path.join(raw_dir, "*.csv"))
    if raw_dir != root_dir and os.path.exists(root_dir):
        all_raw_files += glob.glob(os.path.join(root_dir, "*.xlsx")) + glob.glob(os.path.join(root_dir, "*.csv"))

    # Also include any explicitly provided target_files
    if target_files:
        if isinstance(target_files, (list, tuple)):
            all_raw_files += [os.path.abspath(f) for f in target_files if os.path.exists(f)]
        elif isinstance(target_files, dict):
            all_raw_files += [os.path.abspath(f) for f in target_files.values() if os.path.exists(f)]
        elif isinstance(target_files, str) and os.path.exists(target_files):
            all_raw_files.append(os.path.abspath(target_files))

    valid_files = [f for f in list(set(all_raw_files)) if not os.path.basename(f).startswith("~") and not os.path.basename(f).startswith(".")]

    print(f"📁 Processing {len(valid_files)} dataset file(s)...")
    row_count = 0

    for fpath in sorted(valid_files):
        fname = os.path.basename(fpath)
        m = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{4})', fname) or re.search(r'(\d{1,2}_[A-Za-z]{3}_\d{4})', fname)
        file_date_key = m.group(1).replace('-', '_') if m else ""
        if file_date_key and file_date_key not in date_segregated_tenders:
            date_segregated_tenders[file_date_key] = []

        try:
            rows = read_xlsx_full_rows(fpath) if fname.lower().endswith(".xlsx") else read_csv_full_rows(fpath)
            if not rows or len(rows) < 2: continue

            headers = [clean_header(h) for h in rows[0]]
            file_tenders_count = 0
            for r in rows[1:]:
                row_count += 1
                t = parse_tender_row(headers, r, row_count, file_date=file_date_key.replace('_', '-'))
                if t and t["id"]:
                    tenders_by_id[str(t["id"])] = t
                    file_tenders_count += 1
                    if file_date_key:
                        date_segregated_tenders[file_date_key].append(t)
            print(f"  ✅ {fname} ({file_tenders_count} tenders)")
        except Exception as e:
            print(f"  ❌ Error reading {fname}: {e}")

    unique_tenders = list(tenders_by_id.values())
    unique_tenders.sort(key=lambda t: (parse_dt(t.get('publicationDate', '')), int(t['id']) if str(t.get('id','')).isdigit() else 0), reverse=True)

    now = datetime.now()
    active_tenders = [t for t in unique_tenders if parse_dt(t.get('documentLastSellingDate', '')) >= now]
    archived_tenders = [t for t in unique_tenders if parse_dt(t.get('documentLastSellingDate', '')) < now]

    print("-" * 65)
    print(f"✨ Total Consolidated Tenders: {len(unique_tenders)} | 🟢 Live Active: {len(active_tenders)} | ⚪ Closed: {len(archived_tenders)}")

    manifest = {os.path.basename(f): os.path.getsize(f) for f in valid_files}
    payload = {
        "manifest": manifest,
        "total": len(unique_tenders),
        "active_count": len(active_tenders),
        "archived_count": len(archived_tenders),
        "last_updated": now.strftime("%d-%b-%Y %H:%M:%S"),
        "tenders": unique_tenders
    }

    # 1. Save Central Master Cache Files locally
    cache_path = os.path.join(root_dir, "tenders_parsed_cache.json")
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    raw_cache_path = os.path.join(raw_dir, "tenders_parsed_cache.json")
    if raw_dir != root_dir:
        with open(raw_cache_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    dist_cache_path = os.path.join(root_dir, "dist", "tenders.json")
    if os.path.exists(os.path.join(root_dir, "dist")):
        with open(dist_cache_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    # 2. Save Date-Specific JSON Files
    date_json_paths = {}
    for d_key, d_items in date_segregated_tenders.items():
        if d_items:
            json_fname = f"Tender_Data_{d_key}.json"
            j_path = os.path.join(raw_dir, json_fname)
            d_active = [t for t in d_items if parse_dt(t.get('documentLastSellingDate', '')) >= now]
            d_archived = [t for t in d_items if parse_dt(t.get('documentLastSellingDate', '')) < now]
            d_payload = {
                "date": d_key,
                "total": len(d_items),
                "active_count": len(d_active),
                "archived_count": len(d_archived),
                "last_updated": now.strftime("%d-%b-%Y %H:%M:%S"),
                "tenders": d_items
            }
            with open(j_path, 'w', encoding='utf-8') as jf:
                json.dump(d_payload, jf, ensure_ascii=False, indent=2)
            date_json_paths[json_fname] = j_path
            print(f"  💾 Date-Specific JSON created: {json_fname} ({len(d_items)} items)")

    print("💾 Cache and date-specific manifests saved locally.")

    # ---------------------------------------------------------
    # 4. Auto-Publishing to GitHub & Vercel
    # ---------------------------------------------------------
    # Strategy A: Use local Git if available
    git_dir = os.path.join(root_dir, ".git")
    pushed_via_git = False
    if os.path.exists(git_dir):
        try:
            print("🔄 Local git detected. Staging dataset updates...")
            subprocess.run(["git", "add", "raw_datasets/", "tenders_parsed_cache.json"], cwd=root_dir, check=True)
            if os.path.exists(os.path.join(root_dir, "dist", "tenders.json")):
                subprocess.run(["git", "add", "dist/tenders.json"], cwd=root_dir, check=False)
            
            commit_msg = f"Auto-Sync: {now.strftime('%d-%b-%Y %H:%M')} ({len(unique_tenders)} tenders, {len(active_tenders)} live)"
            res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=root_dir, capture_output=True, text=True)
            
            # Rebase cleanly against remote
            subprocess.run(["git", "pull", "--rebase", "origin", branch], cwd=root_dir, check=False)
            push_res = subprocess.run(["git", "push", "origin", branch], cwd=root_dir, capture_output=True, text=True)
            
            if push_res.returncode == 0:
                print("🚀 Live updates pushed to GitHub & Vercel via Git!")
                pushed_via_git = True
            elif "nothing to commit" in res.stdout or "Everything up-to-date" in push_res.stdout or "Everything up-to-date" in push_res.stderr:
                print("ℹ️ Git: Everything already up to date on GitHub.")
                pushed_via_git = True
            else:
                print(f"⚠️ Git push returned: {push_res.stderr.strip()}, attempting GitHub REST API fallback...")
        except Exception as e:
            print(f"⚠️ Git push notice: {e}, attempting GitHub REST API fallback...")

    # Strategy B: Fallback to GitHub REST API (No local .git required)
    if not pushed_via_git and token:
        print(f"☁️ Publishing updates to GitHub ({repo}) via REST API...")
        msg = f"Auto-Sync: {now.strftime('%d-%b-%Y %H:%M')} ({len(unique_tenders)} tenders, {len(active_tenders)} live)"
        import base64
        import urllib.request

        def upload_to_github(repo_path, file_bytes, commit_msg):
            api_url = f"https://api.github.com/repos/{repo}/contents/{repo_path}"
            headers = {
                "Authorization": f"token {token}",
                "User-Agent": "Dorpotro-Sync-Engine",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
            sha = None
            try:
                req_get = urllib.request.Request(f"{api_url}?ref={branch}", headers=headers)
                with urllib.request.urlopen(req_get, timeout=10) as resp:
                    cur_data = json.loads(resp.read().decode('utf-8'))
                    sha = cur_data.get('sha')
            except Exception:
                pass

            payload_api = {
                "message": commit_msg,
                "content": base64.b64encode(file_bytes).decode('utf-8'),
                "branch": branch
            }
            if sha:
                payload_api["sha"] = sha

            req_put = urllib.request.Request(api_url, data=json.dumps(payload_api).encode('utf-8'), headers=headers, method="PUT")
            with urllib.request.urlopen(req_put, timeout=25) as resp:
                return True

        # Upload target files (new CSVs)
        if target_files:
            csv_list = target_files.values() if isinstance(target_files, dict) else (target_files if isinstance(target_files, list) else [target_files])
            for cf in csv_list:
                if os.path.exists(cf):
                    try:
                        with open(cf, 'rb') as f_obj:
                            upload_to_github(f"raw_datasets/{os.path.basename(cf)}", f_obj.read(), f"Upload dataset: {os.path.basename(cf)}")
                            print(f"🚀 Scraped raw file 'raw_datasets/{os.path.basename(cf)}' uploaded to GitHub!")
                    except Exception as e:
                        print(f"⚠️ Raw CSV upload notice: {e}")

        # Upload Master Feed JSON
        try:
            with open(cache_path, 'rb') as jf:
                cache_bytes = jf.read()
                upload_to_github("raw_datasets/tenders_parsed_cache.json", cache_bytes, msg)
                upload_to_github("tenders_parsed_cache.json", cache_bytes, msg)
            print("🚀 Master Feed (raw_datasets/tenders_parsed_cache.json) updated on GitHub & Vercel!")
        except Exception as e:
            print(f"⚠️ Master Feed Upload Notice: {e}")

        # Upload Date-Specific JSON Snapshots
        for json_fname, j_path in date_json_paths.items():
            try:
                with open(j_path, 'rb') as jf:
                    upload_to_github(f"raw_datasets/{json_fname}", jf.read(), f"Date archive: {json_fname}")
                print(f"🚀 Date Archive 'raw_datasets/{json_fname}' uploaded to GitHub!")
            except Exception:
                pass

    print("=" * 65)
    print(f"🎉 Complete! 🟢 {len(active_tenders)} Live Tenders ready.")
    print("=================================================================\n")

# ==========================================
# 🧵 Multi-Threaded Worker Function
# ==========================================
def process_tender_worker(worker_id, items_chunk, target_month, target_year, primary_fy, fallback_fy, saved_ids):
    """
    Dedicated parallel worker thread running its own isolated Headless Chrome browser.
    Executes Phase 2 (Details) and Phase 3 (Estimated Cost) for its assigned chunk.
    Dynamically routes each tender to its own date-specific CSV file.
    """
    if not items_chunk:
        return

    print(f"\n🚀 [Worker-{worker_id}] Launching browser for {len(items_chunk)} tenders...")
    driver = init_browser()
    current_fy = None

    try:
        # ----------------------------------------------------
        # 🕵️ Phase 2: Detail Extraction for Assigned Items
        # ----------------------------------------------------
        scraped_items = []
        for idx, item in enumerate(items_chunk):
            tender_id = item['Tender/Proposal ID']
            detail_url = item.pop('_detail_url', f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}")
            item['Tender Link'] = detail_url

            with saved_ids_lock:
                if tender_id in saved_ids:
                    print(f"⏩ [Worker-{worker_id}] [{idx+1}/{len(items_chunk)}] Skipping {tender_id} (Already saved)")
                    continue

            print(f"🔄 [Worker-{worker_id}] [{idx+1}/{len(items_chunk)}] Scraping ID: {tender_id}...")

            loaded_ok = False
            for attempt in range(1, 3):
                if not safe_driver_get(driver, detail_url, max_retries=1):
                    continue
                try:
                    WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.CLASS_NAME, "formStyle_1")))
                    loaded_ok = True
                    break
                except Exception:
                    time.sleep(1.5)

            if not loaded_ok:
                print(f"   ⚠️ [Worker-{worker_id}] Detail page timeout for {tender_id}. Saving basic info...")
                item['Estimated Cost'] = "Not Found"
                target_csv = get_csv_filename_for_item(item, target_month, target_year)
                thread_safe_append_row(target_csv, item)
                with saved_ids_lock:
                    saved_ids.add(tender_id)
                continue

            soup = BeautifulSoup(driver.page_source, PARSER)

            fields = {
                "Ministry": ["Ministry"], "Division": ["Division"], "Organization": ["Organization"],
                "Procuring Entity Name": ["Procuring", "Entity", "Name"],
                "Procuring Entity Code": ["Procuring", "Entity", "Code"],
                "Procuring Entity District": ["Procuring", "Entity", "District"],
                "Procurement Type": ["Procurement Type"], "Event Type": ["Event Type"],
                "Invitation for ": ["Invitation for"], "Invitation Reference No.": ["Invitation Reference No"],
                "App ID": ["App ID"], "Procurement Method ": ["Method "],
                "Budget Type": ["Budget Type"], "Source of Funds": ["Source of Funds"],
                "Project Code": ["Project Code"], "Project Name": ["Project", "Name"],
                "Category": ["Category"],
                "Scheduled Tender/Proposal Publication Date and Time": ["Scheduled", "Publication"],
                "Tender/Proposal Document last selling / downloading Date and Time": ["Document", "last", "selling"],
                "Eligibility of Tenderer": ["Eligibility"], "Brief Description of Works": ["Brief", "Description"],
                "Tender/Proposal Package No. and Description": ["Package", "No.", "and", "Description"],
                "Evaluation Type": ["Evaluation Type"], "Document Available": ["Document Available"],
                "Document Fees": ["Document Fees"], "Tender/Proposal Document Price (In BDT) ": ["Document Price"],
                "Mode of Payment": ["Mode of Payment"], "Tender/Proposal Security Valid Up to": ["Security", "Valid", "Up"],
                "Tender/Proposal Valid Up to": ["Proposal", "Valid", "Up"],
                "Name of Official Inviting Tender/Proposal": ["Name of Official"],
                "Designation of Official Inviting Tender/Proposal": ["Designation of Official"],
                "Address of Official Inviting Tender/Proposal": ["Address of Official"],
                "Contact details of Official Inviting Tender/Proposal": ["Contact details"]
            }

            for f_key, f_keywords in fields.items():
                val = get_value_by_label(soup, f_keywords)
                if val: item[f_key] = val
                elif f_key not in item: item[f_key] = val

            md_val = item.get("Ministry")
            if md_val and "," in md_val:
                parts = md_val.split(",", 1)
                item["Ministry"] = parts[0].strip()
                item["Division"] = parts[1].strip()

            pkg_desc = ""
            for td in soup.find_all('td'):
                txt = td.get_text(separator=" ", strip=True).lower()
                if "package no" in txt and "description" in txt:
                    val_td = td.find_next_sibling('td')
                    if val_td:
                        pkg_desc = val_td.get_text(separator='\n', strip=True)
                        break
            item['Tender/Proposal Package No. and Description'] = pkg_desc.replace('\n', ' ')

            tables = soup.find_all('table', class_='tableList_1')
            if tables:
                sec_table = tables[0]
                headers = [th.get_text(strip=True).lower() for th in sec_table.find_all('th')]
                rows = sec_table.find_all('tr')
                if len(rows) > 1:
                    d_cols = [td.get_text(strip=True) for td in rows[1].find_all('td')]
                    for i, h_text in enumerate(headers):
                        if i >= len(d_cols): continue
                        if "lot no" in h_text: item['Lot No.'] = d_cols[i]
                        elif "identification" in h_text: item['Identification of Lot'] = d_cols[i]
                        elif "location" in h_text: item['Location'] = d_cols[i]
                        elif "security" in h_text: item['Tender/Proposal security(Amount in BDT)'] = d_cols[i]
                        elif "start date" in h_text: item['Tentative Start Date'] = d_cols[i]
                        elif "completion date" in h_text: item['Tentative Completion Date'] = d_cols[i]

            addr_text = item.get('Address of Official Inviting Tender/Proposal', '')
            addr_match = re.search(r'Address\s*:\s*(.*?)(?=City\s*:|$)', addr_text)
            city_match = re.search(r'City\s*:\s*(.*?)(?=Thana\s*:|$)', addr_text)
            thana_match = re.search(r'Thana\s*:\s*(.*?)(?=District\s*:|$)', addr_text)
            dist_match = re.search(r'District\s*:\s*(.*?)(?=Country\s*:|$)', addr_text)

            item['Address'] = addr_match.group(1).strip() if addr_match else ""
            item['City'] = city_match.group(1).strip() if city_match else ""
            item['Thana'] = thana_match.group(1).strip() if thana_match else ""
            item['District'] = dist_match.group(1).strip() if dist_match else ""

            contact_text = item.get('Contact details of Official Inviting Tender/Proposal', '')
            phone_match = re.search(r'Phone No\s*:\s*(.*?)(?=Fax No\s*:|$)', contact_text)
            fax_match = re.search(r'Fax No\s*:\s*(.*)', contact_text)

            item['Phone No'] = phone_match.group(1).strip() if phone_match else ""
            item['Fax No'] = fax_match.group(1).strip() if fax_match else ""

            scraped_items.append(item)

        # ----------------------------------------------------
        # 💰 Phase 3: Batch Cost Estimation for Worker's Items
        # ----------------------------------------------------
        if scraped_items:
            print(f"\n🚀 [Worker-{worker_id}] Fetching Estimated Costs for {len(scraped_items)} items...")
            safe_driver_get(driver, APP_SEARCH_URL)
            time.sleep(2)

            select_financial_year(driver, primary_fy)
            current_fy = primary_fy

            def search_cost(pkg_code):
                try:
                    old_tbl = None
                    try: old_tbl = driver.find_element(By.ID, "resultTable")
                    except Exception: pass

                    input_box = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "txtPkgNo")))
                    input_box.clear()
                    input_box.send_keys(pkg_code)

                    search_btn = driver.find_element(By.ID, "btnSearch")
                    search_btn.click()

                    if old_tbl:
                        try: WebDriverWait(driver, 10).until(EC.staleness_of(old_tbl))
                        except Exception: pass

                    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "resultTable")))
                    soup = BeautifulSoup(driver.page_source, PARSER)
                    table = soup.find('table', {'id': 'resultTable'})
                    if table:
                        r_list = table.find_all('tr')
                        if len(r_list) > 1:
                            headers_t = [th.get_text(strip=True).lower() for th in table.find_all(['th', 'td'])]
                            cost_idx = -1
                            for h_i, h in enumerate(headers_t):
                                if "estimated cost" in h or "cost (in bdt)" in h or "budget" in h:
                                    cost_idx = h_i
                                    break
                            if cost_idx != -1:
                                cols = r_list[1].find_all('td')
                                if len(cols) > cost_idx:
                                    return cols[cost_idx].get_text(separator=' ', strip=True)
                except Exception:
                    pass
                return "Not Found"

            for idx, item in enumerate(scraped_items):
                pkg_desc = str(item.get('Tender/Proposal Package No. and Description', '')).strip()
                pkg_no = pkg_desc.split('\n')[0].split(' ')[0].strip() if pkg_desc else ""
                tender_id = item.get('Tender/Proposal ID', '')

                if not pkg_no or pkg_no == "Not Found":
                    item['Estimated Cost'] = "Not Found"
                else:
                    if current_fy != primary_fy:
                        select_financial_year(driver, primary_fy)
                        current_fy = primary_fy
                        time.sleep(0.5)

                    cost = search_cost(pkg_no)
                    if (not cost or cost == "Not Found") and fallback_fy:
                        select_financial_year(driver, fallback_fy)
                        current_fy = fallback_fy
                        time.sleep(0.5)
                        cost = search_cost(pkg_no)

                    item['Estimated Cost'] = cost if cost else "Not Found"

                # Dynamically write each tender to its own date-specific CSV file
                target_csv = get_csv_filename_for_item(item, target_month, target_year)
                thread_safe_append_row(target_csv, item)
                with saved_ids_lock:
                    saved_ids.add(tender_id)
                print(f"   💾 [Worker-{worker_id}] [{idx+1}/{len(scraped_items)}] Saved ID: {tender_id} -> {target_csv} | Cost: {item['Estimated Cost']}")

    finally:
        try:
            driver.quit()
            print(f"🏁 [Worker-{worker_id}] Finished and closed browser.")
        except Exception:
            pass

# ==========================================
# ⚙️ Configuration & Main Entry Point
# ==========================================
import sys
if len(sys.argv) > 1 and sys.argv[1] in ("--sync-only", "--sync"):
    target = sys.argv[2:] if len(sys.argv) > 2 else None
    run_dorpotro_sync(target_files=target)
    sys.exit(0)

TARGET_MONTH = datetime.now().strftime("%b")   # e.g., "Aug"
TARGET_YEAR = datetime.now().year              # e.g., 2026

print("\n" + "="*60)
print(f"📅 CURRENT MONTH: {TARGET_MONTH} | YEAR: {TARGET_YEAR}")
print(f"⚡ PARALLEL WORKERS: {NUM_WORKERS} Browsers")
print("="*60)
raw_days = input(f"Enter target day(s) [e.g. 14 or 10,11,12,13 or 10-14] (Default: {datetime.now().strftime('%d')}): ").strip()
target_days = parse_days_input(raw_days)

# Generate list of target date strings in natural descending order (largest first)
target_days_desc = sorted(target_days, key=lambda d: int(d), reverse=True)
TARGET_DATES = [f"{d}-{TARGET_MONTH}-{TARGET_YEAR}" for d in target_days_desc]
TARGET_DATES_SET = set(TARGET_DATES)

# Build date-specific CSV files mapping
DATE_CSV_FILES = [f"Tender_Data_{d}_{TARGET_MONTH}_{TARGET_YEAR}.csv" for d in target_days_desc]

# Primary & Fallback Financial Years
try:
    target_dt = datetime.strptime(f"{target_days[-1]}-{TARGET_MONTH}-{TARGET_YEAR}", "%d-%b-%Y")
    if target_dt.month >= 7:
        primary_fy = f"{target_dt.year}-{target_dt.year + 1}"       # e.g. 2026-2027
        fallback_fy = f"{target_dt.year - 1}-{target_dt.year}"      # e.g. 2025-2026
    else:
        primary_fy = f"{target_dt.year - 1}-{target_dt.year}"
        fallback_fy = f"{target_dt.year - 2}-{target_dt.year - 1}"
except Exception:
    primary_fy = f"{TARGET_YEAR}-{TARGET_YEAR + 1}"
    fallback_fy = f"{TARGET_YEAR - 1}-{TARGET_YEAR}"

# ==========================================
# 🔍 PHASE STATUS DIAGNOSTICS & RESUME CHECK
# ==========================================
saved_ids = set()
for csv_f in DATE_CSV_FILES:
    saved_ids.update(read_existing_csv_ids(csv_f))

print("\n" + "="*60)
print(f"📋 TARGET DATES (Descending): {', '.join(TARGET_DATES)}")
print(f"📁 DEDICATED FILES PER DATE :")
for csv_f in DATE_CSV_FILES:
    d_saved = len(read_existing_csv_ids(csv_f))
    print(f"   📄 {csv_f} ({d_saved} items completed)")
print(f"📅 PRIMARY FY: {primary_fy} (Fallback: {fallback_fy})")

if saved_ids:
    print(f"🔄 Total {len(saved_ids)} Tenders already saved across files. Auto-Resume will skip them.")
else:
    print("🆕 NEW SESSION: Starting fresh scan.")
print("="*60 + "\n")

# Master Browser for Phase 1
print("🚀 Launching Master Collector Browser (Eager DOM Mode)...")
driver = init_browser()
basic_data_list = []
total_start_time = time.time()

try:
    # ==========================================
    # 🚀 PHASE 1: Table Scan (Descending Date Smart Stop)
    # ==========================================
    print(f"\n🚀 PHASE 1 STARTED: Searching for dates: {', '.join(TARGET_DATES)}...")
    if not safe_driver_get(driver, TENDER_SEARCH_URL):
        print("❌ Failed to load search page. Exiting.")
        driver.quit()
        exit(1)

    try:
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "resultTable")))
    except Exception as e:
        print("❌ Table loading timed out in Phase 1.")
        driver.quit()
        exit(1)

    earliest_target_dt = min(datetime.strptime(d, "%d-%b-%Y") for d in TARGET_DATES)
    latest_target_dt = max(datetime.strptime(d, "%d-%b-%Y") for d in TARGET_DATES)

    page_number = 1
    stop_scraping = False
    target_date_seen = False
    older_date_count = 0

    while not stop_scraping:
        print(f"📄 Scanning Page {page_number}...")

        soup = BeautifulSoup(driver.page_source, PARSER)
        table = soup.find('table', {'id': 'resultTable'})

        if not table: break

        rows = table.find_all('tr')
        row_found_in_page = 0

        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) < 6: continue
            row_found_in_page += 1

            full_date_text = cols[5].get_text(separator='\n', strip=True).split('\n')[0].strip()
            current_date = full_date_text.split(' ')[0].replace(',', '').strip()
            row_dt = parse_dt(current_date)

            if current_date in TARGET_DATES_SET:
                target_date_seen = True
                older_date_count = 0

                raw_id = cols[1].get_text(separator='\n', strip=True).split('\n')[0]
                tender_id = raw_id.replace(',', '').strip()

                full_title = cols[2].get_text(separator=' ', strip=True)
                if ',' in full_title:
                    parts = full_title.split(',', 1)
                    nature = parts[0].strip()
                    title = parts[1].strip()
                else:
                    nature = "Unknown"
                    title = full_title

                detail_url = f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}"
                if not any(d.get('Tender/Proposal ID') == tender_id for d in basic_data_list):
                    basic_data_list.append({
                        'Tender/Proposal ID': tender_id,
                        '_detail_url': detail_url,
                        'Procurement Nature': nature, 
                        'Brief Description of Works': title,
                        '_table_pub_date': current_date
                    })
                    print(f"   ✅ Collected ID: {tender_id} (Date: {current_date})")
            
            elif row_dt > latest_target_dt:
                # Newer than target range: Keep navigating forward without stopping
                pass
            
            elif row_dt < earliest_target_dt:
                # Older than target range
                if target_date_seen:
                    # Target date was collected and we now hit older dates: All done!
                    older_date_count += 1
                    if older_date_count >= 2:
                        print(f"\n🎯 100% Target date tenders collected! Reached older date ({current_date}). Moving to Phase 2...")
                        stop_scraping = True
                        break
                else:
                    # Target date not found and already reached older dates
                    older_date_count += 1
                    if older_date_count >= 10:
                        print(f"\n⚠️ Reached older dates ({current_date}) without finding target range.")
                        stop_scraping = True
                        break

        if stop_scraping or row_found_in_page == 0: break

        # Next Page Navigation
        try:
            next_clicked = False
            old_table_elem = None
            try: old_table_elem = driver.find_element(By.ID, "resultTable")
            except Exception: pass

            try:
                btn = driver.find_element(By.ID, "btnNext")
                driver.execute_script("arguments[0].click();", btn)
                next_clicked = True
            except Exception: pass

            if not next_clicked:
                try:
                    link = driver.find_element(By.LINK_TEXT, str(page_number + 1))
                    driver.execute_script("arguments[0].click();", link)
                    next_clicked = True
                except Exception: pass

            if next_clicked:
                page_number += 1
                if old_table_elem:
                    try: WebDriverWait(driver, 10).until(EC.staleness_of(old_table_elem))
                    except Exception: pass
                WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "resultTable")))
                time.sleep(1.5)
            else:
                print("🏁 No more pages found.")
                break
        except Exception:
            break

    print(f"\n✅ Phase 1 Complete. Collected {len(basic_data_list)} total IDs matching target dates.")

finally:
    try:
        driver.quit()
        print("🏁 Master Collector Browser closed.")
    except Exception:
        pass

# ==========================================
# ⚡ MULTI-THREADED PHASE 2 & 3 EXECUTION
# ==========================================
unprocessed_items = [item for item in basic_data_list if item['Tender/Proposal ID'] not in saved_ids]

if not unprocessed_items:
    print(f"🎉 All {len(basic_data_list)} items already completely scraped! Proceeding to Phase 4.")
else:
    print(f"\n⚡ PARALLEL ENGINE ACTIVATED: Processing {len(unprocessed_items)} items across {NUM_WORKERS} Workers...")
    
    # Split items into chunks for each worker
    chunks = [[] for _ in range(NUM_WORKERS)]
    for i, item in enumerate(unprocessed_items):
        chunks[i % NUM_WORKERS].append(item)

    for w_i, ch in enumerate(chunks):
        print(f"   🔹 Worker-{w_i+1} assigned: {len(ch)} tenders")

    # Run workers in parallel
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = []
        for w_i, chunk in enumerate(chunks):
            f = executor.submit(process_tender_worker, w_i + 1, chunk, TARGET_MONTH, TARGET_YEAR, primary_fy, fallback_fy, saved_ids)
            futures.append(f)

        for f in futures:
            f.result()

print(f"\n🎉 ALL PARALLEL PHASES COMPLETE! Total time: {time.time() - total_start_time:.1f}s")
print(f"📁 Date-specific CSV files safely updated on disk.")

# ==========================================
# 🚀 PHASE 4: Dorpotro Auto-Sync
# ==========================================
run_dorpotro_sync(target_files=DATE_CSV_FILES)
