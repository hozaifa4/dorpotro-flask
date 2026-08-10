import { Tender } from '../types';

/**
 * Converts Excel float serial numbers (e.g. 46191.5875 or "46491.0") or date strings
 * into standard YYYY-MM-DD HH:mm formatted strings.
 */
export function formatTenderDate(val: any, defaultTime: string = "09:00"): string {
  if (!val) return "";
  const valStr = String(val).trim();

  if (!valStr || valStr === 'N/A' || valStr === 'null' || valStr === 'undefined') {
    return "";
  }

  // Check if it's an Excel float serial number (e.g. 46191.5875 or "46491.0")
  const num = Number(valStr);
  if (!isNaN(num) && num > 35000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
    const dateMs = excelEpoch.getTime() + num * 86400000;
    const dt = new Date(dateMs);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // If it's a valid date string starting with YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(valStr)) {
    if (!valStr.includes(' ')) {
      return `${valStr} ${defaultTime}`;
    }
    return valStr;
  }

  // If text is too long (e.g. paragraph text shifted into a date field) or is a person's name
  if (valStr.length > 30 || !/\d/.test(valStr)) {
    return "";
  }

  return valStr;
}

/**
 * Sanitizes a raw Tender object to fix any Excel serial dates, column shifts,
 * or corrupted fields from old cache / raw CSV imports.
 */
export function sanitizeTenderRecord(raw: any): Tender {
  if (!raw || typeof raw !== 'object') return raw;

  const id = String(raw.id || '').replace('.0', '').trim();
  
  // 1. Sanitize dates
  let publicationDate = formatTenderDate(raw.publicationDate, "09:00");
  let documentLastSellingDate = formatTenderDate(raw.documentLastSellingDate, "17:00");
  let tentativeStartDate = formatTenderDate(raw.tentativeStartDate, "09:00");
  let tentativeEndDate = formatTenderDate(raw.tentativeEndDate, "17:00");

  // Fallbacks if dates were lost due to column shift
  if (!publicationDate) publicationDate = "2026-05-21 09:00";
  if (!documentLastSellingDate) documentLastSellingDate = "2026-06-21 17:00";
  if (!tentativeStartDate) tentativeStartDate = "2026-07-01 09:00";
  if (!tentativeEndDate) tentativeEndDate = "2027-06-30 17:00";

  // 2. Sanitize procurement method
  let procurementMethod = String(raw.procurementMethod || '').trim();
  const validMethods = [
    'Open Tendering Method (OTM)',
    'Limited Tendering Method (LTM)',
    'Request for Quotation (RFQ)',
    'Direct Procurement Method (DPM)'
  ];
  if (!validMethods.includes(procurementMethod)) {
    if (procurementMethod.includes('LTM') || procurementMethod.includes('Limited')) {
      procurementMethod = 'Limited Tendering Method (LTM)';
    } else if (procurementMethod.includes('RFQ') || procurementMethod.includes('Quotation')) {
      procurementMethod = 'Request for Quotation (RFQ)';
    } else if (procurementMethod.includes('DPM') || procurementMethod.includes('Direct')) {
      procurementMethod = 'Direct Procurement Method (DPM)';
    } else {
      procurementMethod = 'Open Tendering Method (OTM)';
    }
  }

  // 3. Sanitize invitation reference number
  let invitationRefNo = String(raw.invitationRefNo || '').trim();
  if (!invitationRefNo || invitationRefNo.endsWith('.0')) {
    invitationRefNo = invitationRefNo.replace('.0', '');
  }

  // 4. Sanitize official inviter name and designation
  let officialInviter = String(raw.officialInviter || '').trim();
  if (!officialInviter || /^\d{4}-\d{2}-\d{2}/.test(officialInviter)) {
    officialInviter = "Executive Engineer";
  }

  let officialDesignation = String(raw.officialDesignation || '').trim();
  if (!officialDesignation || /^\d{4}-\d{2}-\d{2}/.test(officialDesignation)) {
    officialDesignation = "Executive Engineer";
  }

  // 5. Sanitize budget and fund source
  let budgetType = String(raw.budgetType || 'Revenue').trim();
  let sourceOfFunds = String(raw.sourceOfFunds || 'Government').trim();

  // 6. Sanitize price & security
  let documentPrice = typeof raw.documentPrice === 'number' ? raw.documentPrice : parseFloat(String(raw.documentPrice || 500).replace(/[^0-9.]/g, '')) || 500;
  let securityAmount = typeof raw.securityAmount === 'number' ? raw.securityAmount : parseFloat(String(raw.securityAmount || 15000).replace(/[^0-9.]/g, '')) || 15000;

  return {
    ...raw,
    id,
    publicationDate,
    documentLastSellingDate,
    tentativeStartDate,
    tentativeEndDate,
    procurementMethod,
    invitationRefNo,
    officialInviter,
    officialDesignation,
    budgetType,
    sourceOfFunds,
    documentPrice,
    securityAmount
  };
}
