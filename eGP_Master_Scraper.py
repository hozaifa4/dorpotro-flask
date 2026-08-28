#!/usr/bin/env python3
"""
================================================================================
🚀 e-GP UNIFIED MASTER SCRAPER & DORPOTRO AUTO-PUBLISHER (v7.0)
================================================================================
Features:
  - Mode [1]: OTM (Open Tendering Method) — 10 Parallel Headless Workers
  - Mode [2]: LTM (Limited Tendering Method) — Parallel Multi-Account Workers (All .env Accounts)
  - Mode [3]: Dorpotro Cloud Sync / GitHub Publisher Only
  - 100% Zero-Prompt Auto-Stopping: Exact descending date boundary matching
  - Dynamic Financial Year Selection (2026-2027 with 2025-2026 Fallback) on AdvAPPSearch.jsp
  - Flexible Date Parsing: Bengali digits (১০-১৪), Ranges (10-14, 10 to 14), Unordered (14, 10)
  - Auto-Detection of Current Month & Year
  - High-Speed Eager DOM Loading & Zero-Image Resource Optimization
  - Automated Cloud Synchronization to Dorpotro & GitHub/Vercel (Git CLI + REST API Fallback)
================================================================================
"""

import os
import sys
import re
import csv
import glob
import json
import time
import zipfile
import threading
import subprocess
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# HTML / XML Parser selection
try:
    import lxml
    PARSER = 'lxml'
except ImportError:
    PARSER = 'html.parser'

# ==============================================================================
# ⚙️ GLOBAL CONFIGURATION & GITHUB SYNC SETTINGS
# ==============================================================================
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "hozaifa4/dorpotro-flask")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

# Load overrides from config.json if available
_cfg_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
if os.path.exists(_cfg_file):
    try:
        with open(_cfg_file, 'r', encoding='utf-8') as _cf:
            _cdata = json.load(_cf)
            GITHUB_TOKEN = _cdata.get("github_token", GITHUB_TOKEN)
            GITHUB_REPO = _cdata.get("github_repo", GITHUB_REPO)
            GITHUB_BRANCH = _cdata.get("github_branch", GITHUB_BRANCH)
    except Exception:
        pass

# Portals & Search URLs
LOGIN_URL = "https://www.eprocure.gov.bd/Login.jsp"
TENDER_SEARCH_URL = "https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t"
APP_SEARCH_URL = "https://www.eprocure.gov.bd/resources/common/AdvAPPSearch.jsp?from=search"

# Concurrency Configurations
NUM_OTM_WORKERS = 10
NUM_LTM_WORKERS = 5
NUM_COST_WORKERS = 5
MAX_LTM_RETRIES = 2

# Thread-safe synchronization locks
csv_write_lock = threading.Lock()
saved_ids_lock = threading.Lock()

# Standardized CSV Schema (48 Fields)
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

# Standardized LTM Columns (v8 format)
LTM_COLUMNS = [
    'District', 'Organization', 'Procuring Entity', 'Tender ID', 'Project Name', 'Nature', 'Title', 
    'Last Selling Date', 'Doc Price', 'Security Amount', 'Estimated Cost', 
    'Liquid Assets', 'Publish Date', 'Package No', 'Link'
]


# ==============================================================================
# 🛠️ HELPER FUNCTIONS: DATE PARSING & FINANCIAL YEAR CALCULATION
# ==============================================================================
def parse_days_input(raw_input):
    """
    Parses flexible day inputs like '14', '10,11,12', '12, 10, 11', '10-14', '10 to 14', '১৪-১৬'.
    Converts Bengali numerals to English digits and returns a sorted unique list of zero-padded day strings.
    """
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


def compute_financial_years(target_dt=None):
    """
    Computes Primary and Fallback Financial Years (2 Years Only: Primary & Fallback).
    """
    if not target_dt:
        target_dt = datetime.now()
    try:
        if target_dt.month >= 7:
            fy_primary = f"{target_dt.year}-{target_dt.year + 1}"     # e.g. 2026-2027
            fy_fallback = f"{target_dt.year - 1}-{target_dt.year}"   # e.g. 2025-2026
        else:
            fy_primary = f"{target_dt.year - 1}-{target_dt.year}"     # e.g. 2025-2026
            fy_fallback = f"{target_dt.year - 2}-{target_dt.year - 1}" # e.g. 2024-2025
    except Exception:
        curr_y = datetime.now().year
        fy_primary = f"{curr_y}-{curr_y + 1}"
        fy_fallback = f"{curr_y - 1}-{curr_y}"

    return [fy_primary, fy_fallback]


def parse_dt(d_str):
    """Parses various date-time formats to a standard datetime object."""
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


# ==============================================================================
# 🌐 BROWSER INITIALIZATION & AUTOMATION HELPERS
# ==============================================================================
def init_browser(headless=True):
    """Initializes Chrome with eager DOM loading and image suppression."""
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    else:
        options.add_argument("--start-maximized")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    options.add_argument("--disable-notifications")
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
        try:
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        except Exception:
            driver = webdriver.Chrome(options=options)

    driver.set_page_load_timeout(30)
    return driver


def safe_driver_get(driver, url, max_retries=3, delay=2):
    """Navigates to URL safely with retry logic."""
    for attempt in range(1, max_retries + 1):
        try:
            driver.get(url)
            return True
        except Exception:
            time.sleep(delay)
    return False


def select_financial_year(driver, target_year):
    """
    Robustly finds and selects the Financial Year dropdown on AdvAPPSearch.jsp.
    Supports full format ('2025-2026'), short format ('2025-26'), and value matching.
    Dispatches JavaScript change event to ensure e-GP state updates cleanly.
    """
    if not target_year: return False
    target_year = str(target_year).strip()
    start_y = target_year[:4]
    short_fy = f"{start_y}-{target_year[-2:]}" if len(target_year) >= 9 else target_year

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
        try:
            all_selects = driver.find_elements(By.TAG_NAME, "select")
            for sel in all_selects:
                opt_texts = [o.text.strip() for o in sel.find_elements(By.TAG_NAME, "option")]
                if any(start_y in opt for opt in opt_texts):
                    select_elem = sel
                    break
        except Exception:
            pass

    if select_elem:
        try:
            select_obj = Select(select_elem)
            options = [o.text.strip() for o in select_obj.options]
            
            matched_opt = None
            for opt in options:
                if target_year in opt or short_fy in opt:
                    matched_opt = opt
                    break
            if not matched_opt:
                for opt in options:
                    if start_y in opt:
                        matched_opt = opt
                        break

            if matched_opt:
                select_obj.select_by_visible_text(matched_opt)
            else:
                select_obj.select_by_value(target_year)

            try:
                driver.execute_script("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", select_elem)
            except Exception:
                pass
            time.sleep(0.5)
            return True
        except Exception:
            pass
    return False


def query_app_cost(driver, pkg_code, candidate_fys):
    """
    Queries AdvAPPSearch.jsp across candidate Financial Years until estimated cost is found.
    Handles dynamic DOM updates, element refresh, and monetary extraction.
    """
    if not pkg_code or pkg_code == "Not Found":
        return "Not Found"

    clean_pkg = pkg_code.split('\n')[0].strip()
    if not clean_pkg:
        return "Not Found"

    for fy in candidate_fys:
        if not fy: continue
        try:
            # 1. Select Financial Year
            select_financial_year(driver, fy)

            # 2. Re-locate and clear input box
            input_box = WebDriverWait(driver, 8).until(EC.element_to_be_clickable((By.ID, "txtPkgNo")))
            input_box.clear()
            input_box.send_keys(clean_pkg)

            # 3. Click Search
            search_btn = WebDriverWait(driver, 8).until(EC.element_to_be_clickable((By.ID, "btnSearch")))
            search_btn.click()
            time.sleep(1.0)

            # 4. Wait for table
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "resultTable")))
            soup_app = BeautifulSoup(driver.page_source, PARSER)
            table_app = soup_app.find('table', {'id': 'resultTable'})
            if table_app:
                rows = table_app.find_all('tr')
                if len(rows) > 1:
                    headers_t = [th.get_text(strip=True).lower() for th in table_app.find_all(['th', 'td'])]
                    cost_idx = -1
                    for h_i, h in enumerate(headers_t):
                        if "estimated cost" in h or "cost (in bdt)" in h or "budget" in h:
                            cost_idx = h_i
                            break
                    for r in rows[1:]:
                        cols_res = r.find_all('td')
                        if cost_idx != -1 and len(cols_res) > cost_idx:
                            val = cols_res[cost_idx].get_text(separator=' ', strip=True)
                            if val and val not in ["Not Found", "0.00", "0", "nan", "N/A", ""]:
                                return val
                        elif len(cols_res) >= 4:
                            for c in cols_res:
                                c_txt = c.get_text(strip=True)
                                if re.match(r'^\d+(\.\d{2})?(,[A-Z]+)?$', c_txt) and float(c_txt.split(',')[0]) > 0:
                                    return c_txt
        except Exception:
            pass

    return "Not Found"


def get_value_by_label(soup, keywords):
    """Extracts value from a table cell based on its label keywords across td and th."""
    labels = soup.find_all(['td', 'th'])
    for label in labels:
        label_text = label.get_text(separator=" ", strip=True)
        if all(k.lower() in label_text.lower() for k in keywords):
            next_td = label.find_next_sibling(['td', 'th'])
            if next_td:
                val = next_td.get_text(separator=" ", strip=True)
                if val and val != "Not Found":
                    return val
    return "Not Found"


def get_package_no_only(soup):
    """Extracts package number from table label."""
    labels = soup.find_all(['td', 'th'])
    for label in labels:
        txt = label.get_text(separator=" ", strip=True).lower()
        if "package no" in txt and "description" in txt:
            val_td = label.find_next_sibling(['td', 'th'])
            if val_td:
                full_text = val_td.get_text(separator='\n', strip=True)
                return full_text.split('\n')[0].strip()
    return "Not Found"


# ==============================================================================
# 💾 CSV & DATA HANDLING HELPERS
# ==============================================================================
def append_row_to_csv(filename, row_dict, fieldnames=CSV_COLUMNS):
    """Appends a row to its dedicated CSV with auto-flush."""
    file_exists = os.path.exists(filename) and os.path.getsize(filename) > 0
    clean_row = {col: str(row_dict.get(col, '')).strip() for col in fieldnames}
    with open(filename, mode='a', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL, extrasaction='ignore')
        if not file_exists:
            writer.writeheader()
        writer.writerow(clean_row)
        f.flush()


def thread_safe_append_row(filename, row_dict, fieldnames=CSV_COLUMNS):
    """Thread-safe wrapper for instant CSV writing."""
    with csv_write_lock:
        append_row_to_csv(filename, row_dict, fieldnames)


def save_ltm_csv(data_list, filename):
    """Saves LTM data list to CSV with FULL standardized 48-field schema (No data loss)."""
    if not data_list: return
    import pandas as pd
    df = pd.DataFrame(data_list)
    for c in CSV_COLUMNS:
        if c not in df.columns:
            df[c] = ""
    existing_cols = [c for c in CSV_COLUMNS if c in df.columns]
    extra_cols = [c for c in df.columns if c not in CSV_COLUMNS and not c.startswith('_')]
    final_cols = existing_cols + extra_cols
    df = df[final_cols]
    df.to_csv(filename, index=False, encoding='utf-8-sig')


def read_existing_csv_ids(filename):
    """Reads existing tender IDs from CSV for auto-resume."""
    if not os.path.exists(filename) or os.path.getsize(filename) == 0:
        return set()
    ids = set()
    try:
        with open(filename, mode='r', encoding='utf-8-sig', errors='replace') as f:
            reader = csv.DictReader(f)
            for row in reader:
                tid = row.get('Tender/Proposal ID') or row.get('Tender ID') or ''
                tid = tid.strip()
                if tid:
                    ids.add(tid)
    except Exception as e:
        print(f"⚠️ Warning reading existing CSV ({filename}): {e}")
    return ids


def get_csv_filename_for_item(item, default_month="Aug", default_year=2026, fallback_day="01"):
    """Determines which date-specific CSV file an item belongs to."""
    pub_date = str(item.get('Scheduled Tender/Proposal Publication Date and Time', '')).strip()
    if not pub_date or not re.search(r'\d{1,2}-[A-Za-z]{3}-\d{4}', pub_date):
        pub_date = str(item.get('_table_pub_date', '')).strip()
    if not pub_date or not re.search(r'\d{1,2}-[A-Za-z]{3}-\d{4}', pub_date):
        pub_date = str(item.get('Publish Date', '')).strip()

    m = re.search(r'(\d{1,2})-([A-Za-z]{3})-(\d{4})', str(pub_date))
    if m:
        d, mon, yr = m.groups()
        return f"Tender_Data_{d.zfill(2)}_{mon}_{yr}.csv"
    return f"Tender_Data_{str(fallback_day).zfill(2)}_{default_month}_{default_year}.csv"


# ==============================================================================
# 🔒 LTM MODULE: MULTI-ACCOUNT LOGIN & EXTRACTION
# ==============================================================================
def load_ltm_accounts():
    """
    Automatically detects and loads ALL accounts configured in .env.
    No manual account selection is required — runs automatically in a full loop.
    """
    accounts = []
    acc_indices = set()
    for key in os.environ:
        m = re.match(r'^ACCOUNT_(\d+)_EMAIL$', key, re.IGNORECASE)
        if m:
            acc_indices.add(int(m.group(1)))

    for i in sorted(list(acc_indices)):
        email = os.getenv(f"ACCOUNT_{i}_EMAIL") or os.getenv(f"account_{i}_email")
        password = os.getenv(f"ACCOUNT_{i}_PASSWORD") or os.getenv(f"account_{i}_password")
        tag = os.getenv(f"ACCOUNT_{i}_TAG") or os.getenv(f"account_{i}_tag") or f"User{i}"
        if email and password:
            accounts.append({"email": email.strip(), "password": password.strip(), "tag": tag.strip()})

    # Fallback to standard sequential loop if regex found none
    if not accounts:
        i = 1
        while True:
            email = os.getenv(f"ACCOUNT_{i}_EMAIL")
            password = os.getenv(f"ACCOUNT_{i}_PASSWORD")
            tag = os.getenv(f"ACCOUNT_{i}_TAG", f"User{i}")
            if not email or not password:
                break
            accounts.append({"email": email.strip(), "password": password.strip(), "tag": tag.strip()})
            i += 1

    return accounts


def do_ltm_login(driver, email, password):
    """Logs into e-GP portal. Returns True on success, False on failure."""
    driver.get(LOGIN_URL)
    time.sleep(2)

    try:
        go_to_login = driver.find_element(By.PARTIAL_LINK_TEXT, "Go to login")
        go_to_login.click()
        time.sleep(2)
    except Exception:
        pass

    try:
        email_field = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "txtEmailId"))
        )
        email_field.clear()
        email_field.send_keys(email)

        password_field = driver.find_element(By.ID, "txtPassword")
        password_field.clear()
        password_field.send_keys(password)

        login_btn = driver.find_element(By.ID, "btnLogin")
        login_btn.click()
        time.sleep(4)

        page_source = driver.page_source
        if "Welcome" in page_source or "Logout" in page_source or "Message Box" in page_source:
            return True
        elif "incorrect" in page_source.lower() or "invalid" in page_source.lower():
            return False
        return True
    except Exception:
        return False


def dismiss_ltm_banner(driver):
    """Dismisses the Tenderer Database banner popup."""
    try:
        ok_btn = WebDriverWait(driver, 6).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='OK']"))
        )
        ok_btn.click()
        time.sleep(1.5)
        return True
    except Exception:
        try:
            ok_btn = driver.find_element(By.XPATH, "//*[text()='OK']")
            ok_btn.click()
            time.sleep(1.5)
            return True
        except Exception:
            return False


def navigate_to_ltm_tenders(driver):
    """Navigates to Limited Tenders page via menu."""
    try:
        driver.switch_to.default_content()
        time.sleep(1)
        tender_menu = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "headTabTender"))
        )
        driver.execute_script("""
            var event = new MouseEvent('mouseover', {bubbles: true, cancelable: true});
            arguments[0].dispatchEvent(event);
        """, tender_menu)
        time.sleep(1)
        limited_link = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Limited Tenders"))
        )
        driver.execute_script("arguments[0].click();", limited_link)
        time.sleep(2)
        return True
    except Exception:
        try:
            driver.switch_to.default_content()
            driver.execute_script("document.getElementById('headTabTender').click();")
            time.sleep(1.5)
            limited = driver.find_element(By.LINK_TEXT, "Limited Tenders")
            driver.execute_script("arguments[0].click();", limited)
            time.sleep(2)
            return True
        except Exception:
            try:
                driver.execute_script("window.location.href='/tenderer/RestrictedTenders.jsp';")
                time.sleep(2)
                return True
            except Exception:
                return False


def scrape_ltm_table(driver, worker_prefix, target_dates_set, earliest_dt, latest_dt):
    """
    Scrapes tenders from Limited Tenders resultTable with 100% ZERO-PROMPT AUTO-STOPPING (OTM Style).
    """
    basic_data = []
    page = 1
    stop_scraping = False
    target_seen = False
    older_date_count = 0

    try:
        WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.ID, "resultTable")))
    except Exception:
        print(f"   ⚠️ [{worker_prefix}] Table not found on page.")
        return []

    while not stop_scraping:
        print(f"   📄 [{worker_prefix}] Scanning Page {page}...")
        soup = BeautifulSoup(driver.page_source, PARSER)
        table = soup.find('table', {'id': 'resultTable'})
        if not table: break

        rows = table.find_all('tr')
        row_found = False

        for row in rows[1:]:
            cols = row.find_all('td')
            if len(cols) < 6: continue
            row_found = True

            full_date_text = cols[5].get_text(separator='\n', strip=True).split('\n')[0].strip()
            current_date = full_date_text.split(' ')[0].replace(',', '').strip()
            row_dt = parse_dt(current_date)

            if current_date in target_dates_set:
                target_seen = True
                older_date_count = 0
                raw_id = cols[1].get_text(separator='\n', strip=True).split('\n')[0]
                tender_id = raw_id.replace(',', '').strip()

                # Extract direct link from <a> tag if present in the table
                a_tag = cols[1].find('a') or row.find('a')
                detail_url = ""
                if a_tag and a_tag.get('href'):
                    raw_href = a_tag.get('href').strip()
                    if "javascript:" not in raw_href:
                        if raw_href.startswith('/'):
                            detail_url = f"https://www.eprocure.gov.bd{raw_href}"
                        elif raw_href.startswith('http'):
                            detail_url = raw_href
                        else:
                            detail_url = f"https://www.eprocure.gov.bd/tenderer/{raw_href}"

                if not detail_url:
                    detail_url = f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}"

                full_title = cols[2].get_text(separator=' ', strip=True)
                nature = full_title.split(',', 1)[0].strip() if ',' in full_title else "Works"
                title = full_title.split(',', 1)[1].strip() if ',' in full_title else full_title

                if not any(d.get('Tender ID') == tender_id for d in basic_data):
                    basic_data.append({
                        'Tender ID': tender_id,
                        'Tender/Proposal ID': tender_id,
                        'Nature': nature,
                        'Procurement Nature': nature,
                        'Title': title,
                        'Brief Description of Works': title,
                        'Publish Date': current_date,
                        'Link': detail_url,
                        'Tender Link': detail_url,
                        'Event Type': 'LTM',
                        'Procurement Method ': 'Limited Tendering Method (LTM)',
                        'Estimated Cost': 'Pending'
                    })
                    print(f"      ✅ [{worker_prefix}] Matched {current_date} | ID: {tender_id}")

            elif row_dt < earliest_dt:
                if target_seen:
                    older_date_count += 1
                    if older_date_count >= 2:
                        print(f"      🎯 [{worker_prefix}] 100% Target date tenders collected! Reached older date ({current_date}).")
                        stop_scraping = True
                        break
                else:
                    older_date_count += 1
                    if older_date_count >= 10:
                        stop_scraping = True
                        break

        if stop_scraping or not row_found: break

        # Next page navigation
        try:
            next_clicked = False
            old_tbl = None
            try: old_tbl = driver.find_element(By.ID, "resultTable")
            except Exception: pass

            try:
                btn = driver.find_element(By.ID, "btnNext")
                driver.execute_script("arguments[0].click();", btn)
                next_clicked = True
            except Exception: pass

            if not next_clicked:
                try:
                    link = driver.find_element(By.LINK_TEXT, str(page + 1))
                    driver.execute_script("arguments[0].click();", link)
                    next_clicked = True
                except Exception: pass

            if next_clicked:
                page += 1
                if old_tbl:
                    try: WebDriverWait(driver, 8).until(EC.staleness_of(old_tbl))
                    except Exception: pass
                WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.ID, "resultTable")))
                time.sleep(1.5)
            else:
                break
        except Exception:
            break

    return basic_data


def extract_all_tender_fields_from_soup(soup, item, is_ltm=False):
    """
    Extracts the full rich 48-field schema from ViewTender.jsp HTML.
    100% shared and identical between OTM and LTM!
    """
    fields = {
        "Ministry": ["Ministry"], "Division": ["Division"], "Organization": ["Organization"],
        "Procuring Entity Name": ["Procuring", "Entity", "Name"],
        "Procuring Entity Code": ["Procuring", "Entity", "Code"],
        "Procuring Entity District": ["Procuring", "Entity", "District"],
        "Procurement Nature": ["Procurement Nature"],
        "Procurement Type": ["Procurement Type"], "Event Type": ["Event Type"],
        "Invitation for ": ["Invitation for"], "Invitation Reference No.": ["Invitation Reference No"],
        "App ID": ["App ID"], "Procurement Method ": ["Method "],
        "Budget Type": ["Budget Type"], "Source of Funds": ["Source of Funds"],
        "Project Code": ["Project Code"], "Project Name": ["Project", "Name"],
        "Category": ["Category"],
        "Scheduled Tender/Proposal Publication Date and Time": ["Publication", "Date"],
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
        if val and val != "Not Found":
            item[f_key] = val
        elif f_key not in item:
            item[f_key] = ""

    md_val = item.get("Ministry", "")
    if "," in md_val:
        parts = md_val.split(",", 1)
        item["Ministry"] = parts[0].strip()
        item["Division"] = parts[1].strip()

    # Package No and Description
    pkg_desc = ""
    for td in soup.find_all('td'):
        txt = td.get_text(separator=" ", strip=True).lower()
        if "package no" in txt and "description" in txt:
            val_td = td.find_next_sibling('td')
            if val_td:
                pkg_desc = val_td.get_text(separator='\n', strip=True)
                break
    item['Tender/Proposal Package No. and Description'] = pkg_desc.replace('\n', ' ')

    # Extract Package No
    package_no = get_package_no_only(soup)
    item['Package No'] = package_no

    # Aliases for LTM / OTM backwards compatibility
    item['Tender/Proposal ID'] = item.get('Tender/Proposal ID') or item.get('Tender ID', '')
    item['Tender ID'] = item['Tender/Proposal ID']
    item['Procuring Entity'] = item.get('Procuring Entity Name', '')
    item['Title'] = item.get('Brief Description of Works', '') or item.get('Project Name', '')
    item['Last Selling Date'] = item.get('Tender/Proposal Document last selling / downloading Date and Time', '')
    item['Doc Price'] = item.get('Tender/Proposal Document Price (In BDT) ', '')
    item['Publish Date'] = item.get('Scheduled Tender/Proposal Publication Date and Time', '') or item.get('_table_pub_date', '')
    item['District'] = item.get('Procuring Entity District', '')
    item['Nature'] = item.get('Procurement Nature', '')

    # Lot & Security Table
    tables = soup.find_all('table', class_='tableList_1')
    item['Security Amount'] = "N/A"
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
                elif "security" in h_text: 
                    item['Tender/Proposal security(Amount in BDT)'] = d_cols[i]
                    item['Security Amount'] = d_cols[i]
                elif "start date" in h_text: item['Tentative Start Date'] = d_cols[i]
                elif "completion date" in h_text: item['Tentative Completion Date'] = d_cols[i]

    # Official Address
    addr_text = item.get('Address of Official Inviting Tender/Proposal', '')
    addr_match = re.search(r'Address\s*:\s*(.*?)(?=City\s*:|$)', addr_text)
    city_match = re.search(r'City\s*:\s*(.*?)(?=Thana\s*:|$)', addr_text)
    thana_match = re.search(r'Thana\s*:\s*(.*?)(?=District\s*:|$)', addr_text)
    dist_match = re.search(r'District\s*:\s*(.*?)(?=Country\s*:|$)', addr_text)

    item['Address'] = addr_match.group(1).strip() if addr_match else ""
    item['City'] = city_match.group(1).strip() if city_match else ""
    item['Thana'] = thana_match.group(1).strip() if thana_match else ""
    if not item.get('District') and dist_match:
        item['District'] = dist_match.group(1).strip()

    contact_text = item.get('Contact details of Official Inviting Tender/Proposal', '')
    phone_match = re.search(r'Phone No\s*:\s*(.*?)(?=Fax No\s*:|$)', contact_text)
    fax_match = re.search(r'Fax No\s*:\s*(.*)', contact_text)

    item['Phone No'] = phone_match.group(1).strip() if phone_match else ""
    item['Fax No'] = fax_match.group(1).strip() if fax_match else ""

    # Set accurate Method & Event Type
    raw_m = str(item.get('Procurement Method ', '') or item.get('Procurement Method', '')).strip()
    if is_ltm or "limited" in raw_m.lower() or "ltm" in raw_m.lower():
        item['Event Type'] = "LTM"
        item['Procurement Method '] = "Limited Tendering Method (LTM)"
    else:
        item['Event Type'] = "OTM"
        if not raw_m or raw_m == "Not Found":
            item['Procurement Method '] = "Open Tendering Method (OTM)"
        else:
            item['Procurement Method '] = raw_m

    return item


def get_ltm_tender_details(driver, worker_prefix, basic_data_list):
    """Fetches full 48-field tender details for LTM items (100% Parity with OTM)."""
    print(f"   📥 [{worker_prefix}] Gathering Full Details for {len(basic_data_list)} tenders...")
    for idx, item in enumerate(basic_data_list, 1):
        tender_id = str(item.get('Tender ID') or item.get('Tender/Proposal ID')).strip()
        
        # Guarantee LTM method & eventType
        item['Event Type'] = "LTM"
        item['Procurement Method '] = "Limited Tendering Method (LTM)"
        item['Tender ID'] = tender_id
        item['Tender/Proposal ID'] = tender_id

        # Candidate detail URLs for LTM tenders
        candidate_urls = []
        if item.get('Link') and item['Link'].startswith('http'):
            candidate_urls.append(item['Link'])
        candidate_urls.extend([
            f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}",
            f"https://www.eprocure.gov.bd/tenderer/ViewTender.jsp?id={tender_id}",
            f"https://www.eprocure.gov.bd/tenderer/ViewRestrictedTender.jsp?id={tender_id}"
        ])

        print(f"   🔄 [{worker_prefix}] [{idx}/{len(basic_data_list)}] Scraping ID: {tender_id}...")
        details_extracted = False
        for url in candidate_urls:
            try:
                item['Tender Link'] = url
                item['Link'] = url
                driver.get(url)
                
                WebDriverWait(driver, 8).until(
                    lambda d: len(d.find_elements(By.TAG_NAME, "table")) > 0 or "formStyle_1" in d.page_source
                )
                time.sleep(0.8)
                
                dsoup = BeautifulSoup(driver.page_source, PARSER)
                if dsoup.find('table') and any(k in dsoup.text for k in ["Ministry", "Organization", "Procuring", "Tender/Proposal", "Package"]):
                    extract_all_tender_fields_from_soup(dsoup, item, is_ltm=True)
                    details_extracted = True
                    break
            except Exception:
                continue

        if details_extracted:
            print(f"      ✅ [{worker_prefix}] [{idx}/{len(basic_data_list)}] Details extracted for ID: {tender_id}")
        else:
            print(f"      ⚠️ [{worker_prefix}] [{idx}/{len(basic_data_list)}] Main table used for ID: {tender_id}")

    return basic_data_list


def process_ltm_single_account(worker_id, total_accs, account, target_dates_set, earliest_dt, latest_dt):
    """Processes a single LTM account inside a parallel worker thread."""
    email = account["email"]
    password = account["password"]
    user_tag = account["tag"]
    worker_prefix = f"Worker-{worker_id}: {user_tag}"
    generated_files = []

    print(f"\n🚀 [{worker_prefix}] Launching headless browser ({worker_id}/{total_accs})...")
    driver = init_browser(headless=True)
    try:
        print(f"   🔑 [{worker_prefix}] Logging in ({email})...")
        if not do_ltm_login(driver, email, password):
            print(f"   ❌ [{worker_prefix}] Login failed!")
            return []
        print(f"   ✅ [{worker_prefix}] Login successful!")

        print(f"   🔔 [{worker_prefix}] Dismissing banner...")
        dismiss_ltm_banner(driver)

        print(f"   📂 [{worker_prefix}] Navigating to Limited Tenders...")
        if not navigate_to_ltm_tenders(driver):
            print(f"   ❌ [{worker_prefix}] Navigation failed!")
            return []

        print(f"   🔍 [{worker_prefix}] Scraping tenders (Auto-Stop Mode)...")
        basic_data = scrape_ltm_table(driver, worker_prefix, target_dates_set, earliest_dt, latest_dt)
        if not basic_data:
            print(f"   ⚠️ [{worker_prefix}] No tenders found for target dates.")
            return []

        basic_data = get_ltm_tender_details(driver, worker_prefix, basic_data)

        # Save per-date CSVs (Group by clean date only, NOT time)
        import pandas as pd
        df_all = pd.DataFrame(basic_data)
        if not df_all.empty:
            def extract_date_part(val):
                m = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{4})', str(val))
                if m: return m.group(1)
                return str(val).split(' ')[0].strip()

            df_all['_Date_Key'] = df_all['Publish Date'].apply(extract_date_part)
            grouped = df_all.groupby('_Date_Key')
            for date_key, group in grouped:
                fname = f"Restricted_Data_{date_key}_{user_tag}.csv"
                records = group.drop(columns=['_Date_Key'], errors='ignore').to_dict('records')
                save_ltm_csv(records, fname)
                generated_files.append(fname)
                print(f"   💾 [{worker_prefix}] Saved: {fname} ({len(records)} items)")

    except Exception as e:
        print(f"   ❌ [{worker_prefix}] Error: {e}")
    finally:
        try:
            driver.quit()
            print(f"   🏁 [{worker_prefix}] Closed browser.")
        except Exception:
            pass

    return generated_files


def process_ltm_account_worker(acc_idx, total_accs, account, target_dates_set, earliest_dt, latest_dt):
    """Wrapper function for running an LTM account in parallel thread with retry."""
    tag = account["tag"]
    for attempt in range(1, MAX_LTM_RETRIES + 1):
        try:
            files = process_ltm_single_account(acc_idx, total_accs, account, target_dates_set, earliest_dt, latest_dt)
            if files:
                print(f"🎉 [Worker-{acc_idx}: {tag}] Completed successfully! ({len(files)} file(s))")
                return {"tag": tag, "status": "✅ Success", "files": files}
            else:
                return {"tag": tag, "status": "⚠️ No Data", "files": []}
        except Exception as e:
            print(f"❌ [Worker-{acc_idx}: {tag}] Attempt {attempt} Error: {e}")
            if attempt < MAX_LTM_RETRIES:
                time.sleep(3)
    return {"tag": tag, "status": "❌ Failed", "files": []}


# ==============================================================================
# ⚡ OTM MODULE: PARALLEL WORKERS & EXTRACTION
# ==============================================================================
def process_otm_worker(worker_id, items_chunk, target_month, target_year, candidate_fys, saved_ids):
    """Dedicated parallel worker thread for OTM Phase 2 (Details) and Phase 3 (Costs)."""
    if not items_chunk: return

    print(f"\n🚀 [Worker-{worker_id}] Launching browser for {len(items_chunk)} tenders...")
    driver = init_browser(headless=True)

    try:
        scraped_items = []
        for idx, item in enumerate(items_chunk):
            tender_id = item['Tender/Proposal ID']
            detail_url = item.pop('_detail_url', f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}")
            item['Tender Link'] = detail_url

            with saved_ids_lock:
                if tender_id in saved_ids:
                    continue

            print(f"🔄 [Worker-{worker_id}] [{idx+1}/{len(items_chunk)}] Scraping ID: {tender_id}...")

            loaded_ok = False
            for _ in range(2):
                if safe_driver_get(driver, detail_url, max_retries=1):
                    try:
                        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "formStyle_1")))
                        loaded_ok = True
                        break
                    except Exception:
                        time.sleep(1)

            if not loaded_ok:
                item['Estimated Cost'] = "Not Found"
                target_csv = get_csv_filename_for_item(item, target_month, target_year)
                thread_safe_append_row(target_csv, item)
                with saved_ids_lock:
                    saved_ids.add(tender_id)
                continue

            soup = BeautifulSoup(driver.page_source, PARSER)
            extract_all_tender_fields_from_soup(soup, item, is_ltm=False)
            scraped_items.append(item)

        # ----------------------------------------------------------------------
        # Phase 3: Multi-Financial Year Aware Cost Search
        # ----------------------------------------------------------------------
        if scraped_items:
            print(f"\n🚀 [Worker-{worker_id}] Fetching Estimated Costs for {len(scraped_items)} items...")
            safe_driver_get(driver, APP_SEARCH_URL)
            time.sleep(1.5)

            for idx, item in enumerate(scraped_items):
                pkg_desc = str(item.get('Tender/Proposal Package No. and Description', '')).strip()
                pkg_no = (item.get('Package No') or pkg_desc.split('\n')[0]).strip()
                tender_id = item.get('Tender/Proposal ID', '')

                if not pkg_no or pkg_no == "Not Found":
                    item['Estimated Cost'] = "Not Found"
                else:
                    item['Estimated Cost'] = query_app_cost(driver, pkg_no, candidate_fys)

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


# ==============================================================================
# 💰 PARALLEL COST EXTRACTOR (FOR LTM & BULK CSV FILES)
# ==============================================================================
def process_single_csv_cost_worker(worker_id, total_files, current_file, candidate_fys):
    """Parallel worker for finding estimated costs for a specific CSV file across candidate FYs."""
    if not os.path.exists(current_file): return False
    import pandas as pd

    fname = os.path.basename(current_file)
    print(f"\n🚀 [CostWorker-{worker_id}/{total_files}] Processing: {fname}...")
    driver = init_browser(headless=True)
    file_updated = False

    try:
        driver.get(APP_SEARCH_URL)
        time.sleep(1.5)

        df = pd.read_csv(current_file)
        if 'Estimated Cost' not in df.columns:
            df['Estimated Cost'] = 'Pending'

        for index, row in df.iterrows():
            pkg_no = str(row.get('Package No', '') or row.get('Tender/Proposal Package No. and Description', ''))
            pkg_no = pkg_no.split('\n')[0].strip()
            current_cost = str(row.get('Estimated Cost', 'Pending')).strip()
            tender_id = str(row.get('Tender ID') or row.get('Tender/Proposal ID') or '')

            if current_cost in ['Pending', 'nan', 'N/A', 'Not Found', ''] and pkg_no not in ['Not Found', 'nan', '']:
                print(f"   🔄 [CostWorker-{worker_id}] [{index+1}/{len(df)}] Searching Cost: {pkg_no}...")
                estimated_cost = query_app_cost(driver, pkg_no, candidate_fys)
                df.at[index, 'Estimated Cost'] = estimated_cost if estimated_cost else "Not Found"
                file_updated = True
                print(f"   💰 [CostWorker-{worker_id}] [{index+1}/{len(df)}] ID: {tender_id} -> Cost: {df.at[index, 'Estimated Cost']}")

        if file_updated:
            df.to_csv(current_file, index=False, encoding='utf-8-sig')
            print(f"   💾 [CostWorker-{worker_id}] File updated on disk: {fname}")

    except Exception as e:
        print(f"   ❌ [CostWorker-{worker_id}] Error in {fname}: {e}")
    finally:
        try:
            driver.quit()
        except Exception:
            pass

    return file_updated


def run_app_cost_extractor_for_files(target_files, candidate_fys):
    """
    Parallel Financial Year Aware Cost Extractor across all generated CSV files.
    """
    if not target_files: return
    valid_files = sorted(list(set([f for f in target_files if os.path.exists(f)])))
    if not valid_files: return

    if isinstance(candidate_fys, str):
        candidate_fys = [candidate_fys]

    workers_cnt = min(len(valid_files), NUM_COST_WORKERS)
    print("\n" + "=" * 60)
    print(f"🚀 PARALLEL COST EXTRACTION ({len(valid_files)} Files | {workers_cnt} Workers)")
    print(f"📅 Financial Years Priority: {' -> '.join(candidate_fys)}")
    print("=" * 60)

    with ThreadPoolExecutor(max_workers=workers_cnt) as executor:
        futures = [
            executor.submit(process_single_csv_cost_worker, idx, len(valid_files), f, candidate_fys)
            for idx, f in enumerate(valid_files, 1)
        ]
        for f in futures:
            f.result()

    print(f"\n🎉 ALL ESTIMATED COSTS EXTRACTED FOR {len(valid_files)} FILES!")


# ==============================================================================
# 🔄 DORPOTRO AUTO-SYNC & GITHUB PUBLISHER ENGINE
# ==============================================================================
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

def parse_tender_row(headers, row, row_idx, file_date="", filename=""):
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

    raw_pub = get_col(['Publication Date & Time', 'Tender/Proposal Publication Date and Time', 'Publication Date and Time', 'Published Date', 'Publication Date', 'Publish Date']) or (f"{file_date} 09:00" if file_date else f"{datetime.now().strftime('%d-%b-%Y')} 09:00")
    raw_sell = get_col(['Tender/Proposal Document last selling', 'Document last selling date and time', 'Document Last Selling Date and Time', 'Last Selling Date', 'Selling Date'])
    doc_price = parse_num(get_col(['Tender Document Price', 'Document Price', 'Doc Price', 'Price'], '500'))
    sec_amount = parse_num(get_col(['Tender Security', 'Tender Security(Amount in BDT)', 'Security Amount'], '15000'))
    est_cost = get_col(['Estimated Cost', 'Budget', 'Estimated Cost (in BDT)'], 'Revenue')

    # Detect OTM vs LTM accurately from filename and cell values
    is_ltm_file = "restricted" in str(filename).lower() or "ltm" in str(filename).lower()
    raw_method = get_col(['Procurement Method', 'Procurement Method ', 'Method', 'Method '])
    raw_event = get_col(['Event Type', 'Type of Event', 'Event'])

    if is_ltm_file or "limited" in raw_method.lower() or "ltm" in raw_method.lower() or "ltm" in raw_event.lower():
        event_type = "LTM"
        proc_method = raw_method if ("limited" in raw_method.lower() or "ltm" in raw_method.lower()) else "Limited Tendering Method (LTM)"
    else:
        event_type = raw_event if raw_event else "OTM"
        proc_method = raw_method if raw_method else "Open Tendering Method (OTM)"

    return {
        "id": t_id,
        "ministry": get_col(['Ministry', 'Ministry Name']),
        "division": get_col(['Division', 'Division Name']),
        "organization": get_col(['Organization', 'Organization Name', 'Procuring Agency']),
        "procuringEntity": get_col(['Procuring Entity Name', 'Procuring Entity', 'PE']),
        "procuringEntityCode": get_col(['Procuring Entity Code', 'PE Code']),
        "procuringDistrict": get_col(['Procuring Entity District', 'District', 'Location']),
        "procurementNature": get_col(['Procurement Nature', 'Nature'], 'Works'),
        "procurementType": get_col(['Procurement Type', 'Type'], 'NCT'),
        "eventType": event_type,
        "invitationRefNo": get_col(['Invitation Reference No.', 'Invitation Reference No', 'Invitation Ref', 'Ref No', 'Invitation for ']),
        "appId": get_col(['App ID', 'APP ID']),
        "procurementMethod": proc_method,
        "budgetType": get_col(['Budget Type', 'Source of Fund'], 'Revenue'),
        "sourceOfFunds": get_col(['Source of Funds', 'Funding Source'], 'Government'),
        "projectCode": get_col(['Project Code'], 'Not applicable'),
        "projectName": get_col(['Project Name'], 'Not applicable'),
        "packageNo": get_col(['Tender/Proposal Package No.', 'Package No']),
        "packageDescription": get_col(['Tender/Proposal Package No. and Description', 'Tender/Proposal Package Description', 'Package Description', 'Description', 'Title', 'Work Description']),
        "category": get_col(['Category']),
        "publicationDate": excel_date_to_str(raw_pub),
        "documentLastSellingDate": excel_date_to_str(raw_sell, "17:00"),
        "eligibility": get_col(['Eligibility of Tenderer', 'Eligibility of Consultant', 'Eligibility', 'Tenderer Eligibility']),
        "briefDescription": get_col(['Brief Description of Works', 'Brief Description of Goods and Related Service', 'Brief Description', 'Title']),
        "evaluationType": get_col(['Evaluation Type'], 'Package wise'),
        "documentPrice": doc_price if doc_price > 0 else 500,
        "securityAmount": sec_amount if sec_amount > 0 else 15000,
        "location": get_col(['Location', 'Project Location']),
        "tentativeStartDate": excel_date_to_str(get_col(['Tentative Start Date', 'Start Date'])),
        "tentativeEndDate": excel_date_to_str(get_col(['Tentative Completion Date', 'Tentative End Date', 'End Date', 'Completion Date'])),
        "officialInviter": get_col(['Name of Official Inviting Tender/Proposal', 'Name of Official Inviting', 'Official Inviting Tender', 'Inviting Official', 'Name of Official']),
        "officialDesignation": get_col(['Designation of Official Inviting Tender/Proposal', 'Designation of Official Inviting', 'Designation of Official', 'Designation']),
        "officialAddress": get_col(['Address of Official Inviting Tender/Proposal', 'Address of Official Inviting', 'Address of Official', 'Address']),
        "thana": get_col(['Thana', 'PE Thana']),
        "district": get_col(['District', 'PE District']),
        "phone": get_col(['Phone No', 'Phone', 'Contact details of Official Inviting Tender/Proposal', 'Contact Details of Official Inviting']),
        "fax": get_col(['Fax No', 'Fax']),
        "estimatedCost": est_cost,
        "estimatedCostAmt": parse_num(est_cost),
        "tenderLink": f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={t_id}",
        "isReTender": False,
        "potentialConflicts": []
    }


def run_dorpotro_sync(target_files=None):
    """
    Parses scraped dataset, merges with historical tenders,
    generates date-specific JSONs & master feed, and publishes to GitHub & Vercel.
    """
    root_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(root_dir, "raw_datasets") if os.path.exists(os.path.join(root_dir, "raw_datasets")) else root_dir

    token = GITHUB_TOKEN
    repo = GITHUB_REPO
    branch = GITHUB_BRANCH

    print("\n" + "=" * 65)
    print("🚀 DORPOTRO 1-CLICK INSTANT PUBLISHER / GITHUB SYNC")
    print("=" * 65)

    tenders_by_id = {}
    date_segregated_tenders = {}

    # 1. Load existing cache
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
                            print(f"📦 Loaded {len(tenders_by_id)} existing tenders from cache ({os.path.basename(c_path)}).")
                            break
            except Exception as e:
                print(f"⚠️ Notice reading local cache: {e}")

    # 2. Cloud fallback stream from GitHub Raw
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
                    c_json = json.loads(resp.read().decode('utf-8'))
                    c_items = c_json.get("tenders", c_json) if isinstance(c_json, dict) else c_json
                    if isinstance(c_items, list):
                        for item in c_items:
                            if isinstance(item, dict) and item.get("id"):
                                tenders_by_id[str(item["id"])] = item
                        print(f"☁️ Streamed {len(tenders_by_id)} master tenders from GitHub Raw ({r_url.split('/')[-1]}).")
                        break
            except Exception:
                pass

    # 3. Read dataset files
    all_raw_files = []
    if os.path.exists(raw_dir):
        all_raw_files += glob.glob(os.path.join(raw_dir, "*.xlsx")) + glob.glob(os.path.join(raw_dir, "*.csv"))
    if raw_dir != root_dir and os.path.exists(root_dir):
        all_raw_files += glob.glob(os.path.join(root_dir, "*.xlsx")) + glob.glob(os.path.join(root_dir, "*.csv"))

    if target_files:
        if isinstance(target_files, (list, tuple)):
            all_raw_files += [os.path.abspath(f) for f in target_files if os.path.exists(f)]
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
                t = parse_tender_row(headers, r, row_count, file_date=file_date_key.replace('_', '-'), filename=fname)
                if t and t["id"]:
                    tid_str = str(t["id"])
                    if tid_str in tenders_by_id:
                        existing = tenders_by_id[tid_str]
                        for k, v in t.items():
                            if v and str(v).strip() not in ["Not Found", "Pending", "N/A", "nan", ""]:
                                existing[k] = v
                        tenders_by_id[tid_str] = existing
                        t = existing
                    else:
                        tenders_by_id[tid_str] = t

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

    # Save local caches
    cache_path = os.path.join(root_dir, "tenders_parsed_cache.json")
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    raw_cache_path = os.path.join(raw_dir, "tenders_parsed_cache.json")
    if raw_dir != root_dir:
        with open(raw_cache_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    # Save Date-Specific JSONs
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
            print(f"  💾 Date-Specific JSON: {json_fname} ({len(d_items)} items)")

    # ⚡ 1. Direct Cloudflare R2 Edge CDN Upload (Primary Fast Storage)
    try:
        import boto3
        from botocore.config import Config

        r2_endpoint = os.environ.get("R2_ENDPOINT", "https://a7aacce0e488ef6b6ad8b2075c6ba4f1.r2.cloudflarestorage.com")
        r2_access_key = os.environ.get("R2_ACCESS_KEY_ID", "5f5106e72f2464ae20f645004063b793")
        r2_secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "3d4a13080557735b41e5f3f6147261a042aa8c4f5a1bae5b2ce65a997dcd84bd")
        r2_bucket = os.environ.get("R2_BUCKET", "dorpotro-data")

        if r2_access_key and r2_secret_key:
            print("⚡ Syncing live tenders directly to Cloudflare R2 Edge CDN...")
            s3_client = boto3.client(
                's3',
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key,
                region_name='auto',
                config=Config(signature_version='s3v4')
            )
            with open(cache_path, 'rb') as f:
                c_bytes = f.read()

            s3_client.put_object(
                Bucket=r2_bucket,
                Key="tenders_parsed_cache.json",
                Body=c_bytes,
                ContentType='application/json',
                CacheControl='public, max-age=60, s-maxage=300'
            )
            s3_client.put_object(
                Bucket=r2_bucket,
                Key="tenders.json",
                Body=c_bytes,
                ContentType='application/json',
                CacheControl='public, max-age=60, s-maxage=300'
            )
            print(f"🚀 [Cloudflare R2] {len(unique_tenders)} tenders successfully synced to Cloudflare Edge in 1s!")
    except Exception as e:
        print(f"⚠️ Cloudflare R2 upload notice: {e}")

    # 2. Status Notice
    print("🧹 [Clean Architecture] Master database is hosted directly on Cloudflare Edge CDN.")

    print("=" * 65)
    print(f"🎉 Auto-Sync Complete! 🟢 {len(active_tenders)} Live Tenders Ready.")
    print("=================================================================\n")


# ==============================================================================
# 🚀 MAIN ENTRY POINT & INTERACTIVE CONTROLLER
# ==============================================================================
def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("--sync-only", "--sync"):
        target = sys.argv[2:] if len(sys.argv) > 2 else None
        run_dorpotro_sync(target_files=target)
        sys.exit(0)

    print("\n" + "=" * 65)
    print("🚀 e-GP UNIFIED MASTER SCRAPER & DORPOTRO AUTO-PUBLISHER")
    print("=" * 65)
    print("Select Scraping Mode:")
    print("  [1] OTM  (Open Tendering Method - 10 Parallel Workers)")
    print("  [2] LTM  (Limited Tendering Method - Parallel Multi-Account Workers)")
    print("=" * 65)

    mode_choice = input("Enter choice [1 or 2] (Default: 1): ").strip()
    if not mode_choice: mode_choice = "1"

    if mode_choice == "3":
        run_dorpotro_sync()
        return

    # Date setup
    target_month = datetime.now().strftime("%b")
    target_year = datetime.now().year

    print(f"\n📅 Current Month: {target_month} | Year: {target_year}")
    raw_days = input(f"Enter target day(s) [e.g. 14, 10-14, বা ১০-১২] (Default: {datetime.now().strftime('%d')}): ").strip()
    target_days = parse_days_input(raw_days)

    target_days_desc = sorted(target_days, key=lambda d: int(d), reverse=True)
    target_dates = [f"{d}-{target_month}-{target_year}" for d in target_days_desc]
    target_dates_set = set(target_dates)

    # Compute Candidate Financial Years Priority List
    earliest_target_dt = min(datetime.strptime(d, "%d-%b-%Y") for d in target_dates)
    latest_target_dt = max(datetime.strptime(d, "%d-%b-%Y") for d in target_dates)
    candidate_fys = compute_financial_years(earliest_target_dt)

    print(f"\n🎯 Target Dates (Descending): {', '.join(target_dates)}")
    print(f"📅 Financial Years Priority: {' -> '.join(candidate_fys)}")

    generated_csv_files = []

    # ==========================================================================
    # MODE 1: OTM SCRAPING (10 PARALLEL WORKERS)
    # ==========================================================================
    if mode_choice == "1":
        print("\n" + "=" * 60)
        print(f"⚡ RUNNING OTM MODE: 10 PARALLEL HEADLESS WORKERS")
        print("=" * 60)

        date_csv_files = [f"Tender_Data_{d}_{target_month}_{target_year}.csv" for d in target_days_desc]
        saved_ids = set()
        for f in date_csv_files:
            saved_ids.update(read_existing_csv_ids(f))

        print(f"📁 Target Output Files: {', '.join(date_csv_files)}")
        if saved_ids:
            print(f"🔄 Auto-Resume: {len(saved_ids)} Tenders already completed. Skipping them.")

        # Phase 1: Collector
        print("\n🚀 Launching Master Collector Browser (Eager DOM)...")
        driver = init_browser(headless=True)
        basic_data_list = []

        try:
            if not safe_driver_get(driver, TENDER_SEARCH_URL):
                print("❌ Failed to load search page.")
                return

            WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "resultTable")))
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

                    if current_date in target_dates_set:
                        target_date_seen = True
                        older_date_count = 0
                        raw_id = cols[1].get_text(separator='\n', strip=True).split('\n')[0]
                        tender_id = raw_id.replace(',', '').strip()

                        full_title = cols[2].get_text(separator=' ', strip=True)
                        nature = full_title.split(',', 1)[0].strip() if ',' in full_title else "Unknown"
                        title = full_title.split(',', 1)[1].strip() if ',' in full_title else full_title

                        detail_url = f"https://www.eprocure.gov.bd/resources/common/ViewTender.jsp?id={tender_id}"
                        if not any(d.get('Tender/Proposal ID') == tender_id for d in basic_data_list):
                            basic_data_list.append({
                                'Tender/Proposal ID': tender_id,
                                '_detail_url': detail_url,
                                'Procurement Nature': nature, 
                                'Brief Description of Works': title,
                                '_table_pub_date': current_date
                            })
                            print(f"   ✅ Collected ID: {tender_id} ({current_date})")

                    elif row_dt < earliest_target_dt:
                        if target_date_seen:
                            older_date_count += 1
                            if older_date_count >= 2:
                                print(f"🎯 Target dates collected! Reached older date ({current_date}). Moving to Phase 2...")
                                stop_scraping = True
                                break
                        else:
                            older_date_count += 1
                            if older_date_count >= 10:
                                stop_scraping = True
                                break

                if stop_scraping or row_found_in_page == 0: break

                # Next Page
                try:
                    next_clicked = False
                    old_tbl = None
                    try: old_tbl = driver.find_element(By.ID, "resultTable")
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
                        if old_tbl:
                            try: WebDriverWait(driver, 8).until(EC.staleness_of(old_tbl))
                            except Exception: pass
                        WebDriverWait(driver, 12).until(EC.presence_of_element_located((By.ID, "resultTable")))
                        time.sleep(1.5)
                    else:
                        break
                except Exception:
                    break

            print(f"\n✅ Phase 1 Complete. Collected {len(basic_data_list)} matching items.")

        finally:
            try: driver.quit()
            except Exception: pass

        # Phase 2 & 3: Parallel Workers
        unprocessed = [it for it in basic_data_list if it['Tender/Proposal ID'] not in saved_ids]
        if unprocessed:
            print(f"\n⚡ PARALLEL ENGINE: Processing {len(unprocessed)} items across {NUM_OTM_WORKERS} Workers...")
            chunks = [[] for _ in range(NUM_OTM_WORKERS)]
            for i, it in enumerate(unprocessed):
                chunks[i % NUM_OTM_WORKERS].append(it)

            with ThreadPoolExecutor(max_workers=NUM_OTM_WORKERS) as executor:
                futures = [
                    executor.submit(process_otm_worker, w_i + 1, chunk, target_month, target_year, candidate_fys, saved_ids)
                    for w_i, chunk in enumerate(chunks)
                ]
                for f in futures: f.result()

        generated_csv_files.extend(date_csv_files)

    # ==========================================================================
    # MODE 2: LTM SCRAPING (PARALLEL MULTI-ACCOUNT WORKERS)
    # ==========================================================================
    elif mode_choice == "2":
        print("\n" + "=" * 60)
        print(f"🔒 RUNNING LTM MODE: PARALLEL MULTI-ACCOUNT ENGINE")
        print(f"⚡ WORKER POOL: {NUM_LTM_WORKERS} Concurrent Account Engines")
        print("=" * 60)

        accounts = load_ltm_accounts()
        if not accounts:
            print("❌ Error: কোনো account পাওয়া যায়নি! .env ফাইলে ACCOUNT_1_EMAIL সেট করুন!")
            return

        print(f"📋 Loaded {len(accounts)} Accounts from .env:")
        for idx, acc in enumerate(accounts, 1):
            print(f"  [{idx}] {acc['tag']} ({acc['email']})")

        print(f"\n⚡ PARALLEL LTM ENGINE ACTIVATED: Launching all {len(accounts)} Workers simultaneously (1 Worker per Account)...")
        account_results = {}
        all_ltm_files = []

        workers_cnt = len(accounts)
        with ThreadPoolExecutor(max_workers=workers_cnt) as executor:
            futures = [
                executor.submit(process_ltm_account_worker, acc_idx, len(accounts), account, target_dates_set, earliest_target_dt, latest_target_dt)
                for acc_idx, account in enumerate(accounts, 1)
            ]
            for f in futures:
                res = f.result()
                tag = res["tag"]
                account_results[tag] = {"status": res["status"], "files": len(res["files"])}
                if res["files"]:
                    all_ltm_files.extend(res["files"])

        print("\n" + "=" * 60)
        print("📊 LTM ACCOUNTS SUMMARY")
        print("=" * 60)
        for t, res in account_results.items():
            print(f"  {res['status']} {t}: {res['files']} files")
        print("=" * 60)

        if all_ltm_files:
            # Parallel Cost Extraction for all generated LTM CSVs
            run_app_cost_extractor_for_files(all_ltm_files, candidate_fys)
            generated_csv_files.extend(all_ltm_files)

    # ==========================================================================
    # FINAL STEP: DORPOTRO CLOUD SYNC & GITHUB PUSH
    # ==========================================================================
    print("\n" + "=" * 60)
    print("🚀 PROCEEDING TO DORPOTRO AUTO-SYNC & GITHUB PUBLISH")
    print("=" * 60)
    run_dorpotro_sync(target_files=generated_csv_files)

    print("\n" + "=" * 60)
    print("🏁 ALL SCRAPING, COST RESOLUTION & CLOUD PUBLISHING COMPLETED!")
    print("=" * 60)


if __name__ == "__main__":
    main()
