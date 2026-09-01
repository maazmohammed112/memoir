// Store SECRET_TOKEN in Apps Script > Project Settings > Script Properties.
// Never commit the production token to GitHub.
const SECRET_TOKEN = "";
const TIMEZONE = "Asia/Kolkata";

// Smart Finance Intelligence Engine.
// Existing transaction columns are preserved; new analytics columns are appended.
const PARSER_VERSION = "6.1";

// Keep the original 16 columns in exactly the same order.
// Columns 17-24 are additive and are used by the app for cleaner analytics.
const HEADERS = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Category",
  "Payment Method",
  "Merchant",
  "Account",
  "Source",
  "Raw Message",
  "Transaction ID",
  "Bank",
  "Last 4",
  "Reference ID",
  "Nature",
  "Confidence",
  "Currency",
  "Status",
  "Review Flag",
  "Review Reason",
  "Linked Bill ID",
  "Parser Version",
  "Payment App",
  "Card Network"
];

const BILL_HEADERS = [
  "Bill ID",
  "Detected Date",
  "Detected Time",
  "Bill Type",
  "Issuer / Biller",
  "Bank",
  "Account",
  "Last 4",
  "Statement Date",
  "Statement Period",
  "Due Date",
  "Bill Amount",
  "Minimum Due",
  "Paid Amount",
  "Balance Due",
  "Status",
  "Autopay",
  "Last Event",
  "Reference ID",
  "Confidence",
  "Source",
  "Raw Message",
  "Updated At",
  "Paid At"
];

const ALERT_HEADERS = [
  "Alert ID",
  "Date",
  "Time",
  "Alert Class",
  "Severity",
  "Bank",
  "Account",
  "Last 4",
  "Amount",
  "Merchant / Counterparty",
  "Reason",
  "Suggested Action",
  "Status",
  "Sender",
  "Source",
  "Raw Message",
  "Confidence",
  "Related Transaction ID"
];

const RULE_HEADERS = [
  "Rule ID",
  "Rule Type",
  "Match",
  "Value",
  "Active",
  "Notes",
  "Updated At"
];

// Premium, low-noise Google Sheets visual system.
// These colors are intentionally soft so the sheet remains readable.
const FINANCE_THEME = {
  headerBg: "#111827",
  headerText: "#FFFFFF",
  normalBg: "#F3FAF5",
  normalText: "#174A2B",
  normalBorder: "#9FD5AE",
  neutralBg: "#F6F7F9",
  neutralText: "#4B5563",
  neutralBorder: "#D1D5DB",
  warningBg: "#FFF7E8",
  warningText: "#8A4B08",
  warningBorder: "#F2B84B",
  dangerBg: "#FFF0F0",
  dangerText: "#991B1B",
  dangerBorder: "#E98A8A",
  infoBg: "#F1F6FF",
  infoText: "#1E4D8F",
  infoBorder: "#9BBCE8"
};

function parseFinanceRequest_(e) {
  let input = e && e.parameter ? Object.assign({}, e.parameter) : {};
  const body = e && e.postData ? String(e.postData.contents || "").trim() : "";
  if (body && body.charAt(0) === "{") {
    try { input = Object.assign(input, JSON.parse(body)); } catch (error) {}
  }
  return input;
}

function isMemoirWritebackAction_(action) {
  return ["updateReviewStatus", "updateRecord", "markBillPaid", "createRule"].indexOf(String(action || "")) !== -1;
}

function findHeaderColumn_(sheet, header) {
  if (!sheet || sheet.getLastColumn() < 1) return -1;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const wanted = String(header || "").trim().toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || "").trim().toLowerCase() === wanted) return i + 1;
  }
  return -1;
}

function findRowByIdentity_(sheet, candidates) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate || !String(candidate.value || "").trim()) continue;
    const col = findHeaderColumn_(sheet, candidate.header);
    if (col < 1) continue;
    const values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getDisplayValues();
    const wanted = String(candidate.value).trim();
    for (let row = 0; row < values.length; row++) {
      if (String(values[row][0] || "").trim() === wanted) return row + 2;
    }
  }
  return -1;
}

function setFieldsByHeader_(sheet, row, updates, allowedHeaders) {
  let updated = 0;
  Object.keys(updates || {}).forEach(function(header) {
    if (allowedHeaders.indexOf(header) === -1) return;
    const col = findHeaderColumn_(sheet, header);
    if (col < 1) return;
    sheet.getRange(row, col).setValue(updates[header]);
    updated++;
  });
  return updated;
}

function handleMemoirWriteback_(input) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (input.spreadsheetId && String(input.spreadsheetId) !== spreadsheet.getId()) {
    return sendResponse({ success: false, error: "Spreadsheet is outside the KREDO allowlist" });
  }

  const action = String(input.action || "");
  const allowed = {
    Transactions: ["Date", "Time", "Type", "Amount", "Category", "Payment Method", "Merchant", "Account", "Bank", "Last 4", "Reference ID", "Nature", "Currency", "Status", "Review Flag", "Review Reason", "Linked Bill ID", "Payment App", "Card Network"],
    Bills: ["Bill Type", "Issuer / Biller", "Bank", "Account", "Last 4", "Statement Date", "Statement Period", "Due Date", "Bill Amount", "Minimum Due", "Paid Amount", "Balance Due", "Status", "Autopay", "Last Event", "Reference ID"],
    Alerts: ["Alert Class", "Severity", "Reason", "Suggested Action", "Status"],
    Rules: ["Rule Type", "Match", "Value", "Active", "Notes"]
  };
  const sheetName = action === "updateReviewStatus" ? "Transactions" : String(input.sheetName || "");
  if (!allowed[sheetName]) return sendResponse({ success: false, error: "Sheet tab is not writable" });

  const sheet = sheetName === "Transactions"
    ? (spreadsheet.getSheetByName("Transactions") || spreadsheet.getSheets()[0])
    : getOrCreateSheet(spreadsheet, sheetName, sheetName === "Bills" ? BILL_HEADERS : sheetName === "Alerts" ? ALERT_HEADERS : RULE_HEADERS);
  if (sheetName === "Bills") ensureNamedSheetHeaders(sheet, BILL_HEADERS);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (action === "createRule") {
      const fields = input.fields || {};
      const now = Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a");
      const ruleId = hashToId("RULE|" + now + "|" + String(fields.Match || "") + "|" + String(fields.Value || ""));
      sheet.appendRow([ruleId, fields["Rule Type"] || "Merchant", fields.Match || "", fields.Value || "", fields.Active === false ? false : true, fields.Notes || "", now]);
      return sendResponse({ success: true, updated: true, updatedRows: 1, action: action, recordId: ruleId });
    }

    const idHeader = sheetName === "Bills" ? "Bill ID" : sheetName === "Alerts" ? "Alert ID" : sheetName === "Rules" ? "Rule ID" : "Transaction ID";
    const row = findRowByIdentity_(sheet, [
      { header: idHeader, value: input.recordId || input.transactionId },
      { header: "Reference ID", value: input.referenceId }
    ]);
    if (row < 2) return sendResponse({ success: false, error: "Record was not found in " + sheetName });

    if (action === "updateReviewStatus") {
      setFieldsByHeader_(sheet, row, {
        "Review Flag": input.approved === false ? "Yes" : "Approved",
        "Review Reason": input.reviewReason || (input.approved === false ? "Approval removed in Memoir KREDO" : "Approved in Memoir KREDO")
      }, allowed.Transactions);
      formatTransactionRow(sheet, row);
    } else if (action === "markBillPaid") {
      const total = Number(parseAmount(sheet.getRange(row, findHeaderColumn_(sheet, "Bill Amount")).getValue()) || 0);
      const priorPaid = Number(parseAmount(sheet.getRange(row, findHeaderColumn_(sheet, "Paid Amount")).getValue()) || 0);
      const payment = Math.max(0, Number(input.paidAmount || 0));
      const paid = Math.min(total || priorPaid + payment, priorPaid + payment);
      const balance = total > 0 ? Math.max(0, total - paid) : 0;
      const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a");
      setFieldsByHeader_(sheet, row, {
        "Paid Amount": paid,
        "Balance Due": balance,
        "Status": balance <= 0 ? "Paid" : "Partially Paid",
        "Last Event": "Payment recorded in Memoir KREDO" + (input.paidVia ? " via " + input.paidVia : ""),
        "Updated At": timestamp,
        "Paid At": timestamp
      }, allowed.Bills.concat(["Updated At", "Paid At"]));
      formatBillRow(sheet, row);
    } else {
      const updated = setFieldsByHeader_(sheet, row, input.updates || {}, allowed[sheetName]);
      const updatedAtCol = findHeaderColumn_(sheet, "Updated At");
      if (updatedAtCol > 0) sheet.getRange(row, updatedAtCol).setValue(Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a"));
      if (sheetName === "Bills") formatBillRow(sheet, row);
      if (sheetName === "Alerts") formatAlertRow(sheet, row);
      if (!updated) return sendResponse({ success: false, error: "No writable fields were supplied" });
    }
    SpreadsheetApp.flush();
    return sendResponse({ success: true, updated: true, updatedRows: 1, action: action, recordId: input.recordId || input.transactionId || input.referenceId });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  try {
    const input = parseFinanceRequest_(e);
    const configuredToken = PropertiesService.getScriptProperties().getProperty("SECRET_TOKEN") || SECRET_TOKEN;

    if (!configuredToken) {
      return sendResponse({ success: false, error: "SECRET_TOKEN is not configured in Script Properties" });
    }
    if (String(input.token || "") !== configuredToken) {
      return sendResponse({ success: false, error: "Unauthorized" });
    }

    if (isMemoirWritebackAction_(input.action)) {
      return handleMemoirWriteback_(input);
    }

    const rawMessage = String(input.message || "").trim();
    const sender = String(input.sender || "").trim(); // optional today, useful later
    const requestId = String(input.requestId || input.request_id || "").trim();

    if (!rawMessage) {
      return sendResponse({ success: false, error: "Message is empty" });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const transactionSheet = spreadsheet.getSheets()[0];
    const billsSheet = getOrCreateSheet(spreadsheet, "Bills", BILL_HEADERS);
    const alertsSheet = getOrCreateSheet(spreadsheet, "Alerts", ALERT_HEADERS);
    const rulesSheet = getOrCreateSheet(spreadsheet, "Rules", RULE_HEADERS);

    // Automatically remove fields you explicitly do not want stored.
    // Deletion only happens when the header matches exactly, so unrelated
    // user columns are never touched.
    migrateDeprecatedFinanceColumns(transactionSheet, billsSheet);

    ensureHeaders(transactionSheet);
    ensureNamedSheetHeaders(billsSheet, BILL_HEADERS);
    ensureNamedSheetHeaders(alertsSheet, ALERT_HEADERS);
    ensureNamedSheetHeaders(rulesSheet, RULE_HEADERS);

    // Self-maintaining setup: styling is immediate and a once-daily trigger
    // keeps bill colors/statuses accurate as dates move forward.
    ensureDailyFinanceMaintenanceTrigger();
    ensureInitialVisualMigration(transactionSheet, billsSheet, alertsSheet);

    const mode = detectInputMode(rawMessage);

    // --------------------------------------------------------
    // QUICK / FULL MODE
    // --------------------------------------------------------
    if (mode === "quick" || mode === "manual") {
      let transaction = mode === "quick"
        ? parseQuickTransaction(rawMessage)
        : parseManualTransaction(rawMessage);

      transaction = verifyAndNormalizeTransaction(
        transaction,
        rawMessage,
        sender,
        mode
      );

      transaction = applyLocalLearning(transaction, transactionSheet, mode);
      transaction = applyRules(transaction, rulesSheet);

      const validation = validateTransaction(transaction, mode);
      if (!validation.valid) {
        return sendResponse({
          success: false,
          error: validation.error,
          mode: mode
        });
      }

      const lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        const saved = saveTransactionRecord({
          sheet: transactionSheet,
          billsSheet: billsSheet,
          transaction: transaction,
          rawMessage: rawMessage,
          sender: sender,
          mode: mode,
          requestId: requestId
        });

        return sendResponse({
          success: true,
          duplicate: saved.duplicate,
          message: saved.duplicate
            ? "Transaction already saved"
            : "Transaction saved successfully",
          mode: mode,
          eventTypes: ["Transaction"],
          transactionId: saved.transactionId,
          transaction: saved.transaction
        });
      } finally {
        lock.releaseLock();
      }
    }

    // --------------------------------------------------------
    // AUTOMATIC BANK / FINANCE SMS
    // One message may create a transaction AND a security alert.
    // --------------------------------------------------------
    const analysis = analyzeFinancialMessage(rawMessage);

    // Never store OTP/PIN/CVV/verification codes.
    if (analysis.ignoreSensitive) {
      return sendResponse({
        success: true,
        ignored: true,
        sensitive: true,
        message: analysis.reason,
        mode: "sms",
        eventTypes: []
      });
    }

    // Nothing financial enough to store.
    if (!analysis.saveTransaction && !analysis.saveBill && !analysis.saveAlert) {
      return sendResponse({
        success: true,
        ignored: true,
        message: analysis.reason || "No supported financial event detected",
        mode: "sms",
        eventTypes: []
      });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const eventTypes = [];
      let billResult = null;
      let transactionResult = null;
      let alertResult = null;

      // Bill/statement/reminder messages are stored separately so they do not
      // corrupt spend/income graphs in the Transactions sheet.
      if (analysis.saveBill) {
        const bill = parseBillMessage(rawMessage, sender);
        billResult = upsertBillRecord(billsSheet, bill, rawMessage, sender);
        eventTypes.push("Bill");
      }

      if (analysis.saveTransaction) {
        let transaction = parseSmsTransaction(rawMessage, sender);

        transaction = verifyAndNormalizeTransaction(
          transaction,
          rawMessage,
          sender,
          "sms"
        );

        transaction = applyLocalLearning(transaction, transactionSheet, "sms");
        transaction = applyRules(transaction, rulesSheet);

        const validation = validateTransaction(transaction, "sms");

        if (validation.valid) {
          transactionResult = saveTransactionRecord({
            sheet: transactionSheet,
            billsSheet: billsSheet,
            transaction: transaction,
            rawMessage: rawMessage,
            sender: sender,
            mode: "sms",
            requestId: requestId
          });
          eventTypes.push("Transaction");
        } else {
          // Do not silently lose a financial-looking message that we could
          // not parse. Put it in the review queue instead.
          analysis.saveAlert = true;
          analysis.forcedAlertClass = "Parser Review";
          analysis.forcedAlertSeverity = "Medium";
          analysis.forcedAlertReason = validation.error;
        }
      }

      if (analysis.saveAlert) {
        const alert = parseAlertMessage(rawMessage, sender, analysis);
        alertResult = saveAlertRecord(
          alertsSheet,
          alert,
          rawMessage,
          sender,
          transactionResult ? transactionResult.transactionId : ""
        );
        eventTypes.push("Alert");
      }

      return sendResponse({
        success: true,
        duplicate:
          Boolean(transactionResult && transactionResult.duplicate) ||
          Boolean(billResult && billResult.duplicate) ||
          Boolean(alertResult && alertResult.duplicate),
        message: "Financial message processed successfully",
        mode: "sms",
        eventTypes: uniqueValues(eventTypes),
        transactionId: transactionResult ? transactionResult.transactionId : "",
        billId: billResult ? billResult.billId : "",
        alertId: alertResult ? alertResult.alertId : "",
        transaction: transactionResult ? transactionResult.transaction : null,
        bill: billResult ? billResult.bill : null,
        alert: alertResult ? alertResult.alert : null
      });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return sendResponse({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

// ============================================================
// MODE DETECTION
// ============================================================

function detectInputMode(message) {
  const text = String(message || "").trim();

  if (/^MANUAL_TX::/i.test(text)) return "manual";
  if (/^(?:QUICK_TX|QUICK)::/i.test(text)) return "quick";
  if (isAmountOnly(text)) return "quick";

  return "sms";
}

function isAmountOnly(value) {
  return /^(?:₹|INR|Rs\.?)?\s*[\d,]+(?:\.\d{1,2})?$/i.test(
    String(value || "").trim()
  );
}

// ============================================================
// QUICK MODE
// ============================================================

function parseQuickTransaction(message) {
  let value = String(message || "").trim();
  value = value.replace(/^(?:QUICK_TX|QUICK)::/i, "");

  return {
    created: "",
    type: "Debit",
    amount: parseAmount(value.split("::")[0]),
    category: "Other",
    paymentMethod: "",
    merchant: "",
    account: "",
    bank: "",
    last4: "",
    referenceId: "",
    nature: "Expense",
    confidence: 70,
    currency: "",
    status: "Posted",
    reviewFlag: false,
    reviewReason: "",
    linkedBillId: "",
    parserVersion: PARSER_VERSION,
    paymentApp: "",
    cardNetwork: "",
    source: "Quick Add"
  };
}

// ============================================================
// FULL / MANUAL MODE
// Backward compatible:
// MANUAL_TX::created::type::amount::category::paymentMethod::merchant
//
// Optional account without breaking old Shortcut:
// MANUAL_TX::created::type::amount::category::paymentMethod::ACCOUNT=ICICI Credit Card 5009::merchant
// ============================================================

function parseManualTransaction(message) {
  const parts = String(message || "").split("::");

  const created = String(parts[1] || "").trim();
  const enteredType = String(parts[2] || "").trim();
  const amount = parseAmount(parts[3]);
  const enteredCategory = String(parts[4] || "").trim();
  const enteredPaymentMethod = String(parts[5] || "").trim();

  let enteredAccount = "";
  let enteredMerchant = "";

  if (/^(?:ACCOUNT|ACC)=/i.test(String(parts[6] || "").trim())) {
    enteredAccount = String(parts[6] || "")
      .replace(/^(?:ACCOUNT|ACC)=/i, "")
      .trim();
    enteredMerchant = parts.slice(7).join("::").trim();
  } else {
    enteredMerchant = parts.slice(6).join("::").trim();
  }

  const type = getDefaultType(enteredType);
  const paymentMethod = getDefaultPaymentMethod(enteredPaymentMethod);
  const merchant = getDefaultMerchant(enteredMerchant);
  const bank = detectBankName(enteredAccount, "");
  const last4 = detectGenericLast4(enteredAccount);
  let category = getDefaultCategory(enteredCategory);

  if (category === "Other" && merchant) {
    category = detectCategory(merchant, merchant, type, paymentMethod);
  }

  const nature = detectNature(
    merchant + " " + enteredAccount,
    type,
    paymentMethod,
    category
  );

  return {
    created: created,
    type: type,
    amount: amount,
    category: category,
    paymentMethod: paymentMethod,
    merchant: merchant,
    account: enteredAccount,
    bank: bank,
    last4: last4,
    referenceId: "",
    nature: nature,
    confidence: calculateManualConfidence({
      type: type,
      amount: amount,
      category: category,
      paymentMethod: paymentMethod,
      merchant: merchant,
      account: enteredAccount,
      bank: bank
    }),
    currency: "",
    status: "Posted",
    reviewFlag: false,
    reviewReason: "",
    linkedBillId: "",
    parserVersion: PARSER_VERSION,
    paymentApp: "",
    cardNetwork: "",
    source: "Manual Entry"
  };
}

function getDefaultType(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "credit") return "Credit";
  if (clean === "debit") return "Debit";
  return "";
}

function getDefaultCategory(value) {
  const clean = String(value || "").trim();

  if (!clean || /^use default/i.test(clean) || /^default/i.test(clean) || /^skip/i.test(clean)) {
    return "Other";
  }

  return normalizeCategory(clean);
}

function getDefaultPaymentMethod(value) {
  const clean = String(value || "").trim();

  if (!clean || /^use default/i.test(clean) || /^default/i.test(clean) || /^skip/i.test(clean)) {
    return "";
  }

  return normalizePaymentMethod(clean);
}

function getDefaultMerchant(value) {
  const clean = String(value || "").trim();

  if (!clean || /^use default/i.test(clean) || /^default/i.test(clean) || /^skip/i.test(clean)) {
    return "";
  }

  return clean;
}

// ============================================================
// SMS GATE
// Stops OTPs, failed transactions, bill reminders, etc.
// ============================================================

function analyzeFinancialMessage(message) {
  const text = String(message || "").toLowerCase();

  const sensitive =
    /\botp\b|one[ -]?time password|verification code|transaction password|\bpin\b|\bcvv\b/i.test(text);

  if (sensitive) {
    return {
      ignoreSensitive: true,
      saveTransaction: false,
      saveBill: false,
      saveAlert: false,
      reason: "Sensitive authentication message ignored and not stored"
    };
  }

  const failed = isFailedOrDeclinedMessage(text);
  const postedTransaction = isConfirmedPostedTransaction(text) && !failed;
  const bill = isBillOrStatementMessage(text);
  const security = isSecurityAlertMessage(text);
  const paymentRequest = isPaymentRequestMessage(text);
  const promotion = isPromotionMessage(text);

  // Bill payment confirmation can be both a posted transaction and a useful
  // signal to close/update an existing bill. A pure bill reminder is bill only.
  // Generic provider statements such as "LazyPay statement of Rs... is due on..."
  // are also preserved even when they do not use the words "statement generated".
  const explicitBillUpdate =
    /minimum (?:amount )?due|amount due|total amount due|total due|statement (?:generated|ready|available)|\bstatement\b|bill generated|bill amount|due date|due on|due by|pay by|payment due|payment reminder|emi due|premium due|outstanding amount/i.test(text);

  const saveBill = bill && (
    !postedTransaction ||
    explicitBillUpdate
  );

  const saveAlert = security || failed || paymentRequest || promotion;

  return {
    ignoreSensitive: false,
    saveTransaction: postedTransaction,
    saveBill: saveBill,
    saveAlert: saveAlert,
    security: security,
    failed: failed,
    paymentRequest: paymentRequest,
    promotion: promotion,
    reason:
      postedTransaction || saveBill || saveAlert
        ? "Supported financial event detected"
        : "No confirmed financial event detected"
  };
}

function isConfirmedPostedTransaction(text) {
  const t = String(text || "").toLowerCase();

  const futureReturn =
    /(?:will|shall|would)\s+be\s+(?:credited|refunded|reversed)|to\s+be\s+(?:credited|refunded|reversed)/i.test(t);

  if (futureReturn && /failed|declined|unsuccessful/i.test(t)) return false;

  // Strong bank posting words.
  if (/\bdebited\b|\bcredited\b|\bspent\b|\bwithdrawn\b|\bdeposited\b|auto[- ]?debited|autopay.*debited|nach.*debit|ecs.*debit/i.test(t)) {
    return /(?:₹|inr|rs\.?|amount|a\/c|account|card|upi|imps|neft|rtgs|atm)/i.test(t);
  }

  if (/\brefund(?:ed)?\b|\breversal\b|\breversed\b/i.test(t)) {
    return /(?:₹|inr|rs\.?|amount|credited|received|account|card)/i.test(t);
  }

  if (/cashback.*(?:credited|received)|(?:credited|received).*cashback/i.test(t)) {
    return /(?:₹|inr|rs\.?|amount)/i.test(t);
  }

  if (/\bpaid\b|\bpurchase\b|\btransferred\b|\bsent\b/i.test(t)) {
    return /(?:₹|inr|rs\.?|amount|upi|imps|neft|rtgs|card|a\/c|account)/i.test(t);
  }

  // "received" is too broad, so require financial context.
  if (/\breceived\b/i.test(t)) {
    return /(?:₹|inr|rs\.?|amount|money|funds|upi|imps|neft|rtgs|account)/i.test(t);
  }

  return false;
}

function isBillOrStatementMessage(text) {
  const t = String(text || "").toLowerCase();

  const strongBillSignal =
    /bill generated|statement (?:generated|ready|available)|credit card statement|amount due|total amount due|total due|minimum (?:amount )?due|payment due|due date|due on|due by|pay by|payment reminder|emi due|premium due|bill amount|outstanding amount/i.test(t);

  // Supports provider wording such as:
  // "LazyPay statement of Rs. 1251.37 for spends and EMIs ... is due on ..."
  // while still requiring financial context so a random use of the word
  // "statement" is not stored as a bill.
  const genericStatement =
    /\bstatement\b/i.test(t) &&
    /(?:₹|inr|rs\.?|amount|due|spends?|emi|card|bank|bill|billing|pay later|postpaid|lazypay|simpl)/i.test(t);

  const financialContext =
    /(?:₹|inr|rs\.?|credit card|loan|emi|electricity|mobile|broadband|insurance|premium|utility|bank|account|amount|due|spends?|pay later|postpaid|lazypay|simpl)/i.test(t);

  return (strongBillSignal || genericStatement) && financialContext;
}

function isFailedOrDeclinedMessage(text) {
  return /\bdeclined\b|\bfailed\b|unsuccessful|could not be processed|not successful|insufficient (?:funds|balance)|payment failed|transaction failed|cash withdrawal failed/i.test(String(text || ""));
}

function isSecurityAlertMessage(text) {
  return /unauthori[sz]ed|suspicious|fraud(?:ulent)?|not you|did not make|unrecognized|unrecognised|card.*blocked|blocked.*card|card.*frozen|account.*blocked|account.*frozen|security alert|unusual activity/i.test(String(text || ""));
}

function isPaymentRequestMessage(text) {
  return /upi collect|collect request|payment request|approve.*upi|request to pay|requested.*₹|requested.*inr/i.test(String(text || ""));
}

function isPromotionMessage(text) {
  const t = String(text || "").toLowerCase();

  // Do not label a real posted cashback as promotion.
  if (/cashback.*(?:credited|received)|(?:credited|received).*cashback/i.test(t)) return false;

  return /pre[- ]?approved|exclusive offer|special offer|limited time offer|apply now|loan offer|credit card offer|upgrade your card|instant loan|personal loan offer|discount|voucher|coupon|reward points.*expir|redeem.*points|earn cashback|cashback offer/i.test(t);
}

// ============================================================
// SMS PARSER
// ============================================================

function parseSmsTransaction(message, sender) {
  const type = detectTransactionType(message);
  const amount = detectAmount(message);
  const paymentMethod = detectPaymentMethod(message);
  const bank = detectBankName(message, sender);
  const accountInfo = detectAccountInfo(message, paymentMethod, bank);
  const merchant = detectMerchant(message, type);
  const referenceId = detectReferenceId(message);
  const category = detectCategory(message, merchant, type, paymentMethod);
  const nature = detectNature(message + " " + merchant, type, paymentMethod, category);

  const transaction = {
    created: "",
    type: type,
    amount: amount,
    category: category,
    paymentMethod: paymentMethod,
    merchant: merchant,
    account: accountInfo.account,
    bank: bank,
    last4: accountInfo.last4,
    referenceId: referenceId,
    nature: nature,
    confidence: 0,
    currency: detectCurrency(message),
    status: detectTransactionStatus(message),
    reviewFlag: false,
    reviewReason: "",
    linkedBillId: "",
    parserVersion: PARSER_VERSION,
    paymentApp: detectPaymentApp(message),
    cardNetwork: detectCardNetwork(message),
    source: "iPhone SMS"
  };

  transaction.confidence = calculateConfidence(transaction);
  return transaction;
}

// ============================================================
// DEBIT / CREDIT
// Handles the 10 main trigger words plus common bank variants.
// ============================================================

function detectTransactionType(message) {
  const text = String(message || "").toLowerCase();

  // Money coming back / in. Check before debit because reversal SMS
  // may mention the original debit transaction too.
  if (
    /\bcredited\b|\bdeposited\b|\brefund(?:ed)?\b|\breversal\b|\breversed\b|cashback.*(?:credited|received)|money received|amount received|funds received|payment received/i.test(text)
  ) {
    return "Credit";
  }

  // Generic "received" is treated as credit only when it looks like money received.
  if (/\breceived\b/i.test(text) && /(?:₹|inr|rs\.?|amount|money|funds|upi|imps|neft|rtgs)/i.test(text)) {
    return "Credit";
  }

  if (
    /\bdebited\b|\bspent\b|\bpaid\b|\bwithdrawn\b|\bpurchase\b|\btransferred\b|\bsent\b|auto[- ]?debited|autopay.*debited|nach.*debit|ecs.*debit/i.test(text)
  ) {
    return "Debit";
  }

  return "";
}

// ============================================================
// AMOUNT
// ============================================================

function detectAmount(message) {
  const text = String(message || "");

  const patterns = [
    /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount\s*(?:of)?\s*)(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited|credited|spent|paid|received|withdrawn|deposited|refunded|transferred|sent)\s*(?:by|with|for|of)?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      const value = parseAmount(match[1]);
      if (value !== "") return value;
    }
  }

  return "";
}

// ============================================================
// PAYMENT METHOD / CHANNEL
// ============================================================

function detectPaymentMethod(message) {
  const text = String(message || "").toLowerCase();

  const hasUpi = /\bupi\b|\bvpa\b|upi id|phonepe|\bgpay\b|google pay|paytm upi|\bbhim\b|supermoney|cred upi/i.test(text);
  const hasCreditCard = /credit\s*card|\bcr\s*card\b|rupay\s+credit|credit\s+limit|available\s+credit|\bcc\s*(?:xx|x{2,}|\*+)\d{3,4}/i.test(text);
  const hasDebitCard = /debit\s*card|\bdb\s*card\b|visa\s+debit|mastercard\s+debit|rupay\s+debit/i.test(text);
  const creditCardBill = /credit\s*card\s*bill|\bcc\s*bill|credit\s*card\s*payment|payment\s+(?:towards|for)\s+(?:your\s+)?credit\s*card/i.test(text);

  // Paying a credit-card bill through UPI is a normal UPI transfer,
  // not a purchase made using a RuPay credit card over UPI.
  if (hasUpi && creditCardBill) return "UPI";

  if (hasUpi && hasCreditCard) return "Credit Card UPI";
  if (hasUpi) return "UPI";
  if (hasCreditCard) return "Credit Card";
  if (hasDebitCard) return "Debit Card";

  if (/\batm\b|cash\s+withdrawal|cash\s+withdrawn/i.test(text)) {
    return "Cash Withdrawal";
  }

  if (/\bneft\b/i.test(text)) return "NEFT";
  if (/\bimps\b/i.test(text)) return "IMPS";
  if (/\brtgs\b/i.test(text)) return "RTGS";

  if (/\bnach\b|e-?nach|nach debit/i.test(text)) return "NACH";
  if (/\becs\b|ecs debit/i.test(text)) return "ECS";
  if (/auto[- ]?debit|autopay|standing instruction|\bsi\b/i.test(text)) return "Auto Debit";
  if (/\bpos\b|point of sale/i.test(text)) return "Card / POS";
  if (/cheque|\bchq\b/i.test(text)) return "Cheque";
  if (/bank\s+transfer|fund\s+transfer/i.test(text)) return "Bank Transfer";

  return "";
}

function normalizePaymentMethod(value) {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return "";
  if (/credit card upi|upi credit card|upi.*credit card|credit card.*upi|rupay credit.*upi/i.test(text)) return "Credit Card UPI";
  if (/^upi$|upi payment|gpay|google pay|phonepe|paytm|bhim|supermoney/i.test(text)) return "UPI";
  if (/credit card|^cc$/i.test(text)) return "Credit Card";
  if (/debit card/i.test(text)) return "Debit Card";
  if (/cash withdrawal|\batm\b/i.test(text)) return "Cash Withdrawal";
  if (/\bneft\b/i.test(text)) return "NEFT";
  if (/\bimps\b/i.test(text)) return "IMPS";
  if (/\brtgs\b/i.test(text)) return "RTGS";
  if (/\bnach\b/i.test(text)) return "NACH";
  if (/\becs\b/i.test(text)) return "ECS";
  if (/auto debit|autopay|standing instruction/i.test(text)) return "Auto Debit";
  if (/cheque|\bchq\b/i.test(text)) return "Cheque";
  if (/bank transfer/i.test(text)) return "Bank Transfer";
  if (/bank account|savings|current account/i.test(text)) return "Bank Account";
  if (/cash/i.test(text)) return "Cash";

  return String(value || "").trim();
}

// ============================================================
// BANK DETECTION
// Uses body + optional SMS sender ID.
// ============================================================

function detectBankName(message, sender) {
  const text = (String(message || "") + " " + String(sender || "")).toLowerCase();

  const banks = [
    { regex: /standard\s*chartered|\bscb\b|\bscbank\b|stanchart/i, name: "Standard Chartered Bank" },
    { regex: /\bicici\b|icicib|icicibk/i, name: "ICICI Bank" },
    { regex: /\bhdfc\b|hdfcbk|hdfcbank/i, name: "HDFC Bank" },
    { regex: /state\s*bank\s*of\s*india|\bsbi\b|sbiinb|sbibnk/i, name: "SBI" },
    { regex: /axis\s*bank|\baxis\b|axisbk|axisbank/i, name: "Axis Bank" },
    { regex: /\bkotak\b|kotakbk|kotakbank/i, name: "Kotak Mahindra Bank" },
    { regex: /\bidfc\b|idfcfb|idfcfirst/i, name: "IDFC FIRST Bank" },
    { regex: /\bindusind\b|indusbk/i, name: "IndusInd Bank" },
    { regex: /yes\s*bank|yesbnk/i, name: "YES Bank" },
    { regex: /\bcanara\b|canbnk/i, name: "Canara Bank" },
    { regex: /union\s*bank|unionbk|\buboi\b/i, name: "Union Bank of India" },
    { regex: /bank\s*of\s*baroda|\bbob\b|barodabk/i, name: "Bank of Baroda" },
    { regex: /federal\s*bank|federalbk/i, name: "Federal Bank" },
    { regex: /punjab\s*national\s*bank|\bpnb\b|pnbank/i, name: "Punjab National Bank" },
    { regex: /bank\s*of\s*india|\bboi\b/i, name: "Bank of India" },
    { regex: /\bidbi\b|idbibk/i, name: "IDBI Bank" },
    { regex: /au\s*small\s*finance|\bau\s*bank\b|aubank/i, name: "AU Small Finance Bank" },
    { regex: /indian\s*bank|indianbk/i, name: "Indian Bank" },
    { regex: /indian\s*overseas\s*bank|\biob\b/i, name: "Indian Overseas Bank" },
    { regex: /karur\s*vysya|\bkvb\b/i, name: "Karur Vysya Bank" },
    { regex: /karnataka\s*bank|ktkbank/i, name: "Karnataka Bank" },
    { regex: /south\s*indian\s*bank|\bsib\b/i, name: "South Indian Bank" },
    { regex: /rbl\s*bank|\brbl\b/i, name: "RBL Bank" },
    { regex: /bandhan\s*bank|\bbandhan\b/i, name: "Bandhan Bank" },
    { regex: /uco\s*bank|\buco\b/i, name: "UCO Bank" },
    { regex: /central\s*bank\s*of\s*india|\bcbi\b/i, name: "Central Bank of India" },
    { regex: /bank\s*of\s*maharashtra|\bbom\b/i, name: "Bank of Maharashtra" },
    { regex: /punjab\s*&?\s*sind\s*bank|punjab\s+and\s+sind/i, name: "Punjab & Sind Bank" },
    { regex: /dbs\s*bank|\bdbs\b/i, name: "DBS Bank" },
    { regex: /hsbc/i, name: "HSBC" },
    { regex: /citibank|\bciti\b/i, name: "Citibank" },
    { regex: /dcb\s*bank|\bdcb\b/i, name: "DCB Bank" },
    { regex: /city\s*union\s*bank|\bcub\b/i, name: "City Union Bank" },
    { regex: /tamilnad\s*mercantile|tmb\s*bank|\btmb\b/i, name: "Tamilnad Mercantile Bank" },
    { regex: /equitas/i, name: "Equitas Small Finance Bank" },
    { regex: /ujjivan/i, name: "Ujjivan Small Finance Bank" },
    { regex: /jana\s*small\s*finance|jana\s*bank/i, name: "Jana Small Finance Bank" },
    { regex: /suryoday/i, name: "Suryoday Small Finance Bank" },
    { regex: /utkarsh\s*small\s*finance|utkarsh\s*bank/i, name: "Utkarsh Small Finance Bank" },
    { regex: /esaf/i, name: "ESAF Small Finance Bank" },
    { regex: /csb\s*bank|catholic\s*syrian/i, name: "CSB Bank" },
    { regex: /airtel\s*payments\s*bank/i, name: "Airtel Payments Bank" },
    { regex: /india\s*post\s*payments\s*bank|\bippb\b/i, name: "India Post Payments Bank" },
    { regex: /fino\s*payments\s*bank/i, name: "Fino Payments Bank" },
    { regex: /jio\s*payments\s*bank/i, name: "Jio Payments Bank" }
  ];

  for (let i = 0; i < banks.length; i++) {
    if (banks[i].regex.test(text)) return banks[i].name;
  }

  return "";
}

// ============================================================
// ACCOUNT / CARD + LAST 4
// ============================================================

function detectAccountInfo(message, paymentMethod, bank) {
  const text = String(message || "");
  let last4 = "";
  let label = "";

  if (paymentMethod === "Credit Card" || paymentMethod === "Credit Card UPI") {
    last4 = detectCreditCardLast4(text);
    label = "Credit Card";
  } else if (paymentMethod === "Debit Card" || paymentMethod === "Card / POS") {
    last4 = detectDebitCardLast4(text);
    label = "Debit Card";
  } else {
    last4 = detectBankAccountLast4(text);
  }

  let account = bank || "";

  if (label) {
    account = account ? account + " " + label : label;
  }

  if (last4) {
    account += (account ? " " : "") + "XX" + last4;
  }

  return {
    account: account.trim(),
    last4: last4
  };
}

function detectCreditCardLast4(message) {
  const patterns = [
    /credit\s*card[^\d\n]{0,40}?(?:xx|x{2,}|\*+|-)?\s*(\d{4})/i,
    /\bcc\b[^\d\n]{0,30}?(?:xx|x{2,}|\*+|-)?\s*(\d{4})/i,
    /card\s+ending\s+(?:in\s+)?(\d{4})/i,
    /card\s+(?:xx|x{2,}|\*+)(\d{4})/i
  ];

  return findLast4(message, patterns);
}

function detectDebitCardLast4(message) {
  const patterns = [
    /debit\s*card[^\d\n]{0,40}?(?:xx|x{2,}|\*+|-)?\s*(\d{4})/i,
    /card\s+ending\s+(?:in\s+)?(\d{4})/i,
    /card\s+(?:xx|x{2,}|\*+)(\d{4})/i
  ];

  return findLast4(message, patterns);
}

function detectBankAccountLast4(message) {
  const patterns = [
    /(?:a\/c|acct|account|ac)\s*(?:no\.?|number)?\s*(?:ending\s*(?:in)?\s*)?(?:xx|x{2,}|\*+|-)*\s*(\d{3,4})/i,
    /(?:from|to)\s+(?:a\/c|acct|account)[^\d\n]{0,30}?(?:xx|x{2,}|\*+|-)*\s*(\d{3,4})/i
  ];

  return findLast4(message, patterns);
}

function detectGenericLast4(value) {
  const text = String(value || "");
  const masked = text.match(/(?:xx|x{2,}|\*{2,})\s*(\d{4})/i);
  if (masked) return masked[1];

  const ending = text.match(/ending\s+(?:in\s+)?(\d{4})/i);
  if (ending) return ending[1];

  const trailing = text.match(/(?:^|\D)(\d{4})\s*$/);
  return trailing ? trailing[1] : "";
}

function findLast4(text, patterns) {
  const value = String(text || "");

  for (let i = 0; i < patterns.length; i++) {
    const match = value.match(patterns[i]);
    if (match && match[1] && /^\d{3,4}$/.test(match[1])) {
      return match[1].slice(-4);
    }
  }

  return "";
}

// ============================================================
// BANK REFERENCE / UTR / UPI REF
// ============================================================

function detectReferenceId(message) {
  const text = String(message || "");

  const patterns = [
    /(?:UPI\s*(?:Ref(?:erence)?|Txn|Transaction)\s*(?:No|Number|ID)?\.?\s*[:\/-]\s*)([A-Za-z0-9-]{6,30})/i,
    /(?:UPI\s*\/\s*)([A-Za-z0-9-]{6,30})/i,
    /(?:UTR\s*(?:No|Number)?\.?\s*[:\/-]?\s*)([A-Za-z0-9-]{6,30})/i,
    /(?:Ref(?:erence)?\s*(?:No|Number|ID)?\.?\s*[:\/-]?\s*)([A-Za-z0-9-]{6,30})/i,
    /(?:Txn|Transaction)\s*(?:No|Number|ID)?\.?\s*[:\/-]?\s*([A-Za-z0-9-]{6,30})/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) return match[1];
  }

  return "";
}

// ============================================================
// MERCHANT / COUNTERPARTY
// ============================================================

function detectMerchant(message, type) {
  const text = String(message || "").replace(/\s+/g, " ").trim();

  const debitPatterns = [
    /(?:paid\s+to)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+via|\s+using|\s+on|\s+ref|\s+upi|[,.]|$)/i,
    /(?:transferred\s+to|sent\s+to)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+via|\s+using|\s+on|\s+ref|[,.]|$)/i,
    /(?:merchant)\s*[:\-]?\s*([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+on|\s+via|\s+using|\s+ref|[,.]|$)/i,
    /(?:towards)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+on|\s+via|\s+using|\s+ref|[,.]|$)/i,
    /(?:\bat\b)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+on|\s+via|\s+using|\s+ref|[,.]|$)/i,
    /(?:\bto\b)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+via|\s+using|\s+on|\s+ref|[,.]|$)/i
  ];

  const creditPatterns = [
    /(?:received\s+from|credited\s+from|from)\s+([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+via|\s+using|\s+on|\s+ref|[,.]|$)/i,
    /(?:sender|remitter)\s*[:\-]?\s*([A-Za-z0-9 .&@'_-]{2,70}?)(?:\s+ref|[,.]|$)/i
  ];

  const patterns = type === "Credit"
    ? creditPatterns.concat(debitPatterns)
    : debitPatterns.concat(creditPatterns);

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);

    if (match) {
      const merchant = cleanMerchantName(match[1]);
      if (merchant && !isBadMerchantCandidate(merchant)) return merchant;
    }
  }

  const vpaMatch = text.match(/(?:VPA|UPI ID)\s*[:\-]?\s*([A-Za-z0-9._-]+@[A-Za-z0-9._-]+)/i);
  if (vpaMatch) return vpaMatch[1];

  return "";
}

function cleanMerchantName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\b(?:UPI|VPA|Ref|Reference|Txn|Transaction|UTR)\b.*$/i, "")
    .replace(/\s+(?:failed|declined|unsuccessful)(?:\s+due\s+to.*)?$/i, "")
    .replace(/\s+due\s+to\s+(?:insufficient|technical|security).*$/i, "")
    .trim();
}

function isBadMerchantCandidate(value) {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return true;
  if (/^(?:a\/c|account|acct|ac|card|credit card|debit card|bank)/i.test(text)) return true;
  if (/^(?:xx|x{2,}|\*+)\d+/i.test(text)) return true;
  if (/^\d+$/.test(text)) return true;
  if (/^(?:upi|imps|neft|rtgs|nach|ecs)$/i.test(text)) return true;

  return false;
}

// ============================================================
// CATEGORY ENGINE
// Stable categories are important for graphs and insights.
// ============================================================

function detectCategory(message, merchant, type, paymentMethod) {
  const text = (String(message || "") + " " + String(merchant || "")).toLowerCase();

  if (/credit\s*card\s*bill|\bcc\s*bill|credit\s*card\s*payment|payment\s+(?:towards|for)\s+(?:your\s+)?credit\s*card/i.test(text)) {
    return "Credit Card Bill";
  }

  if (type === "Credit") {
    if (/salary|payroll|wages|salary credit/i.test(text)) return "Salary";
    if (/refund|reversal|reversed|cashback/i.test(text)) return "Refund";
    if (/interest\s+credited|interest\s+payment/i.test(text)) return "Interest";
    return "Income";
  }

  if (/bank charge|service charge|annual fee|late fee|processing fee|convenience fee|penalty|gst on fee/i.test(text)) {
    return "Bank Fees & Charges";
  }

  if (/zepto|blinkit|bigbasket|instamart|grocery|groceries|supermarket|dmart|reliance fresh|more supermarket/i.test(text)) {
    return "Groceries";
  }

  if (/swiggy|zomato|restaurant|cafe|coffee|tea|bakery|food|pizza|burger|kfc|mcdonald|domino|starbucks|chai|canteen/i.test(text)) {
    return "Food & Dining";
  }

  if (/petrol|diesel|fuel|hpcl|bpcl|iocl|indian oil|bharat petroleum|hindustan petroleum|service station/i.test(text)) {
    return "Fuel";
  }

  if (/uber|ola|rapido|metro|irctc|railway|bus|travel|toll|fastag|parking|airline|flight|indigo|air india|makemytrip|redbus/i.test(text)) {
    return "Travel & Transport";
  }

  if (/amazon|flipkart|myntra|ajio|shopping|retail|meesho|nykaa|croma|reliance digital/i.test(text)) {
    return "Shopping";
  }

  if (/\bemi\b|loan installment|loan payment|instalment|installment|personal loan|home loan|vehicle loan/i.test(text)) {
    return "EMI & Loans";
  }

  if (/electricity|bescom|water bill|gas bill|mobile bill|recharge|broadband|internet|airtel|jio|utility bill/i.test(text)) {
    return "Bills & Utilities";
  }

  if (/netflix|spotify|prime video|amazon prime|hotstar|jiohotstar|cinema|movie|bookmyshow|youtube premium/i.test(text)) {
    return "Entertainment";
  }

  if (/hospital|clinic|pharmacy|medical|medicine|apollo pharmacy|medplus|1mg|pharmeasy|doctor|diagnostic/i.test(text)) {
    return "Health";
  }

  if (/school|college|university|course|education|tuition|exam fee|college fee|school fee|udemy|coursera/i.test(text)) {
    return "Education";
  }

  if (/subscription|monthly plan|annual plan|membership/i.test(text)) {
    return "Subscriptions";
  }

  if (/insurance|policy premium|lic premium/i.test(text)) {
    return "Insurance";
  }

  if (/house rent|rent payment|monthly rent/i.test(text)) {
    return "Rent";
  }

  if (/mutual fund|sip|zerodha|groww|upstox|investment|demat|brokerage/i.test(text)) {
    return "Investments";
  }

  if (/donation|charity|ngo/i.test(text)) {
    return "Donations";
  }

  if (paymentMethod === "Cash Withdrawal") {
    return "Cash Withdrawal";
  }

  if (/self transfer|own account|transfer between.*account/i.test(text)) {
    return "Transfer";
  }

  return "Other";
}

function normalizeCategory(value) {
  const text = String(value || "").trim().toLowerCase();

  const aliases = {
    "food": "Food & Dining",
    "food & dining": "Food & Dining",
    "groceries": "Groceries",
    "grocery": "Groceries",
    "travel": "Travel & Transport",
    "transport": "Travel & Transport",
    "travel & transport": "Travel & Transport",
    "fuel": "Fuel",
    "shopping": "Shopping",
    "bills": "Bills & Utilities",
    "bills & utilities": "Bills & Utilities",
    "emi": "EMI & Loans",
    "emi & loans": "EMI & Loans",
    "entertainment": "Entertainment",
    "health": "Health",
    "education": "Education",
    "subscription": "Subscriptions",
    "subscriptions": "Subscriptions",
    "rent": "Rent",
    "insurance": "Insurance",
    "investment": "Investments",
    "investments": "Investments",
    "salary": "Salary",
    "refund": "Refund",
    "income": "Income",
    "transfer": "Transfer",
    "other": "Other"
  };

  return aliases[text] || String(value || "").trim();
}

// ============================================================
// NATURE / ANALYTICS CLASS
// This prevents bad graphs, especially double-counting card bills.
// ============================================================

function detectNature(message, type, paymentMethod, category) {
  const text = String(message || "").toLowerCase();

  if (type !== "Debit" && type !== "Credit") return "";

  if (type === "Credit") {
    if (/refund|reversal|reversed|cashback/i.test(text) || category === "Refund") {
      return "Refund";
    }
    return "Income";
  }

  if (/credit\s*card\s*bill|\bcc\s*bill|credit\s*card\s*payment|payment\s+(?:towards|for)\s+(?:your\s+)?credit\s*card/i.test(text) || category === "Credit Card Bill") {
    return "Credit Card Payment";
  }

  if (/self transfer|own account|transfer between.*account/i.test(text) || category === "Transfer") {
    return "Transfer";
  }

  if (paymentMethod === "Cash Withdrawal" || category === "Cash Withdrawal") {
    return "Cash Withdrawal";
  }

  if (category === "Investments") {
    return "Investment";
  }

  if (category === "EMI & Loans") {
    return "Debt Payment";
  }

  return "Expense";
}

// ============================================================
// CONFIDENCE SCORE
// Deterministic quality score, not an AI probability.
// ============================================================

function calculateConfidence(transaction) {
  let score = 0;

  if (transaction.amount !== "" && transaction.amount > 0) score += 30;
  if (transaction.type === "Debit" || transaction.type === "Credit") score += 20;
  if (transaction.paymentMethod) score += 10;
  if (transaction.bank) score += 10;
  if (transaction.last4) score += 8;
  if (transaction.merchant) score += 10;
  if (transaction.referenceId) score += 7;
  if (transaction.category && transaction.category !== "Other") score += 5;

  return Math.min(100, score);
}

function calculateManualConfidence(transaction) {
  let score = 0;
  if (transaction.amount !== "" && Number(transaction.amount) > 0) score += 40;
  if (transaction.type === "Debit" || transaction.type === "Credit") score += 20;
  if (transaction.category && transaction.category !== "Other") score += 10;
  if (transaction.paymentMethod) score += 10;
  if (transaction.merchant) score += 10;
  if (transaction.account || transaction.bank) score += 10;
  return Math.min(100, score);
}

// ============================================================
// VERIFY / NORMALIZE
// ============================================================

function verifyAndNormalizeTransaction(transaction, rawMessage, sender, mode) {
  transaction = transaction || {};

  transaction.type = normalizeType(transaction.type);
  transaction.amount = parseAmount(transaction.amount);
  transaction.category = normalizeCategory(transaction.category || "Other") || "Other";
  transaction.paymentMethod = normalizePaymentMethod(transaction.paymentMethod || "");
  transaction.merchant = String(transaction.merchant || "").trim();
  transaction.account = String(transaction.account || "").trim();
  transaction.bank = String(transaction.bank || "").trim();
  transaction.last4 = String(transaction.last4 || "").trim();
  transaction.referenceId = String(transaction.referenceId || "").trim();
  transaction.nature = String(transaction.nature || "").trim();
  transaction.source = String(transaction.source || "").trim();

  if (mode === "sms") {
    transaction.type = detectTransactionType(rawMessage);

    if (transaction.amount === "") {
      transaction.amount = detectAmount(rawMessage);
    }

    transaction.paymentMethod = detectPaymentMethod(rawMessage);
    transaction.bank = detectBankName(rawMessage, sender);

    const accountInfo = detectAccountInfo(
      rawMessage,
      transaction.paymentMethod,
      transaction.bank
    );

    transaction.account = accountInfo.account;
    transaction.last4 = accountInfo.last4;
    transaction.referenceId = detectReferenceId(rawMessage);

    if (!transaction.merchant) {
      transaction.merchant = detectMerchant(rawMessage, transaction.type);
    }

    transaction.category = detectCategory(
      rawMessage,
      transaction.merchant,
      transaction.type,
      transaction.paymentMethod
    );

    transaction.nature = detectNature(
      rawMessage + " " + transaction.merchant,
      transaction.type,
      transaction.paymentMethod,
      transaction.category
    );

    transaction.source = "iPhone SMS";
    transaction.confidence = calculateConfidence(transaction);
  }

  if (mode === "quick") {
    transaction.type = "Debit";
    transaction.category = "Other";
    transaction.paymentMethod = "";
    transaction.merchant = "";
    transaction.account = "";
    transaction.bank = "";
    transaction.last4 = "";
    transaction.referenceId = "";
    transaction.nature = "Expense";
    transaction.confidence = 70;
    transaction.source = "Quick Add";
  }

  if (mode === "manual") {
    transaction.source = "Manual Entry";
    transaction.confidence = calculateManualConfidence(transaction);

    if (!transaction.nature) {
      transaction.nature = detectNature(
        transaction.merchant + " " + transaction.account,
        transaction.type,
        transaction.paymentMethod,
        transaction.category
      );
    }
  }

  return transaction;
}

function normalizeType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "credit") return "Credit";
  if (text === "debit") return "Debit";
  return "";
}

function validateTransaction(transaction, mode) {
  if (
    transaction.amount === "" ||
    typeof transaction.amount !== "number" ||
    !isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    return { valid: false, error: "Could not detect a valid transaction amount" };
  }

  if (mode === "sms" && !transaction.type) {
    return { valid: false, error: "Could not determine whether this SMS is a debit or credit transaction" };
  }

  return { valid: true, error: "" };
}

// ============================================================
// AMOUNT / DATE
// ============================================================

function parseAmount(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return isFinite(value) ? value : "";

  const cleaned = String(value)
    .replace(/₹|INR|Rs\.?|,/gi, "")
    .trim();

  if (!cleaned) return "";

  const amount = Number(cleaned);
  return isNaN(amount) ? "" : amount;
}

function resolveTransactionDate(created) {
  if (created instanceof Date && !isNaN(created.getTime())) return created;

  const value = String(created || "").trim();
  if (!value) return new Date();

  const suppliedDate = new Date(value);
  if (!isNaN(suppliedDate.getTime())) return suppliedDate;

  const match = value.match(
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0)
    );
  }

  return new Date();
}

// ============================================================
// LOCAL LEARNING ENGINE
// Reuses patterns already present in your own Sheet.
// This is deterministic local learning, not an external LLM.
// ============================================================

function applyLocalLearning(transaction, sheet, mode) {
  if (!transaction || mode === "quick" || sheet.getLastRow() < 2) {
    return transaction;
  }

  const lastRow = sheet.getLastRow();
  const startRow = Math.max(2, lastRow - 499); // learn from last 500 rows
  const rowCount = lastRow - startRow + 1;
  if (rowCount <= 0) return transaction;

  // E:M => Category, Payment Method, Merchant, Account, Source,
  // Raw Message, Transaction ID, Bank, Last 4.
  const rows = sheet.getRange(startRow, 5, rowCount, 9).getValues();

  // 1) Merchant category learning uses consensus only.
  // If the same merchant has conflicting historical categories, do nothing.
  if (transaction.category === "Other" && transaction.merchant) {
    const wantedMerchant = merchantLearningKey(transaction.merchant);
    const categoryMap = {};

    for (let i = 0; i < rows.length; i++) {
      const previousCategory = String(rows[i][0] || "").trim(); // E
      const previousMerchant = String(rows[i][2] || "").trim(); // G

      if (
        wantedMerchant &&
        merchantLearningKey(previousMerchant) === wantedMerchant &&
        previousCategory &&
        previousCategory !== "Other"
      ) {
        categoryMap[normalizeCategory(previousCategory)] = true;
      }
    }

    const learnedCategories = Object.keys(categoryMap);
    if (learnedCategories.length === 1) {
      transaction.category = learnedCategories[0];
    }
  }

  // 2) Bank-by-last4 learning also requires an unambiguous historical match.
  // This prevents a coincidental same last-four number on two accounts/cards
  // from causing an incorrect bank name.
  if (!transaction.bank && transaction.last4) {
    const bankMap = {};
    let previousAccountExample = "";

    for (let i = 0; i < rows.length; i++) {
      const previousAccount = String(rows[i][3] || "").trim(); // H
      const previousBank = String(rows[i][7] || "").trim();   // L
      const previousLast4 = String(rows[i][8] || "").trim();  // M

      if (previousBank && previousLast4 === transaction.last4) {
        bankMap[previousBank] = true;
        if (!previousAccountExample) previousAccountExample = previousAccount;
      }
    }

    const learnedBanks = Object.keys(bankMap);
    if (learnedBanks.length === 1) {
      transaction.bank = learnedBanks[0];
      transaction.account = buildAccountLabel(
        learnedBanks[0],
        transaction.paymentMethod,
        transaction.last4,
        previousAccountExample
      );
    }
  }

  transaction.nature = detectNature(
    transaction.merchant + " " + transaction.account,
    transaction.type,
    transaction.paymentMethod,
    transaction.category
  );

  if (mode === "sms") {
    transaction.confidence = calculateConfidence(transaction);
  }

  return transaction;
}

function merchantLearningKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9@]/g, "")
    .trim();
}

function buildAccountLabel(bank, paymentMethod, last4, previousAccount) {
  let label = String(bank || "").trim();

  if (paymentMethod === "Credit Card" || paymentMethod === "Credit Card UPI") {
    label += (label ? " " : "") + "Credit Card";
  } else if (paymentMethod === "Debit Card" || paymentMethod === "Card / POS") {
    label += (label ? " " : "") + "Debit Card";
  } else if (!label && previousAccount) {
    label = String(previousAccount || "").replace(/XX\d{3,4}$/i, "").trim();
  }

  if (last4) {
    label += (label ? " " : "") + "XX" + last4;
  }

  return label.trim();
}

// ============================================================
// TRANSACTION ID / DUPLICATES
// ============================================================

function createTransactionId(transaction, message, sender, mode, requestId) {
  if (requestId) {
    return hashToId(mode + "|" + requestId);
  }

  if (mode === "sms") {
    // Prefer a bank reference ID when available.
    if (transaction.referenceId) {
      return hashToId(
        "SMS|" +
        transaction.bank + "|" +
        transaction.referenceId + "|" +
        transaction.amount + "|" +
        transaction.type
      );
    }

    // Fallback: identical SMS body + sender = duplicate.
    return hashToId(
      "SMS|" +
      normalizeMessageForHash(message) + "|" +
      String(sender || "").trim().toLowerCase()
    );
  }

  // Quick/manual can legitimately repeat the same amount/text.
  const prefix = mode === "quick" ? "Q" : "M";
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").substring(0, 16);
}

function normalizeMessageForHash(message) {
  return String(message || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hashToId(value) {
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ""),
    Utilities.Charset.UTF_8
  );

  return hash
    .map(function(byte) {
      return ("0" + (byte & 255).toString(16)).slice(-2);
    })
    .join("")
    .substring(0, 16);
}

function isDuplicate(sheet, transactionId) {
  if (sheet.getLastRow() < 2) return false;

  const existingIds = sheet
    .getRange(2, 11, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .map(function(value) {
      return String(value || "");
    });

  return existingIds.includes(String(transactionId));
}

// ============================================================
// SHEET MIGRATION
// Keeps columns 1-11 untouched and appends analytics columns.
// ============================================================

function migrateDeprecatedFinanceColumns(transactionSheet, billsSheet) {
  removeColumnsByExactHeader(transactionSheet, [
    "Available Balance",
    "Available Credit"
  ]);

  removeColumnsByExactHeader(billsSheet, [
    "Credit Limit",
    "Available Credit",
    "Available Balance"
  ]);
}

function removeColumnsByExactHeader(sheet, names) {
  if (!sheet || sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return;

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(value) {
      return String(value || "").trim();
    });

  const wanted = {};
  for (let i = 0; i < names.length; i++) wanted[names[i]] = true;

  // Delete right-to-left so column indexes remain stable.
  for (let col = headers.length; col >= 1; col--) {
    if (wanted[headers[col - 1]]) {
      sheet.deleteColumn(col);
    }
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    styleHeaderRow(sheet, HEADERS.length);
    sheet.setFrozenRows(1);
    return;
  }

  // Never overwrite existing first 11 headers/data.
  const currentLastColumn = Math.max(sheet.getLastColumn(), 11);

  if (currentLastColumn < HEADERS.length) {
    sheet.getRange(1, currentLastColumn + 1, 1, HEADERS.length - currentLastColumn)
      .setValues([HEADERS.slice(currentLastColumn)]);
  } else {
    // Ensure only our optional analytics header cells are populated if blank.
    for (let col = 12; col <= HEADERS.length; col++) {
      const cell = sheet.getRange(1, col);
      if (!String(cell.getValue() || "").trim()) {
        cell.setValue(HEADERS[col - 1]);
      }
    }
  }

  styleHeaderRow(sheet, HEADERS.length);
  sheet.setFrozenRows(1);
}


// ============================================================
// V6 FINANCE INTELLIGENCE LAYER
// Transactions, Bills, Alerts, Rules, reminders and review queue.
// ============================================================

function getOrCreateSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  ensureNamedSheetHeaders(sheet, headers);
  return sheet;
}

function ensureNamedSheetHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
    sheet.setFrozenRows(1);
    return;
  }

  for (let col = 1; col <= headers.length; col++) {
    const cell = sheet.getRange(1, col);
    if (!String(cell.getValue() || "").trim()) {
      cell.setValue(headers[col - 1]);
    }
  }

  styleHeaderRow(sheet, headers.length);
  sheet.setFrozenRows(1);
}

function saveTransactionRecord(options) {
  const sheet = options.sheet;
  const billsSheet = options.billsSheet;
  const transaction = options.transaction;
  const rawMessage = options.rawMessage;
  const sender = options.sender;
  const mode = options.mode;
  const requestId = options.requestId;

  transaction.currency = transaction.currency || detectCurrency(rawMessage);
  transaction.status = transaction.status || detectTransactionStatus(rawMessage);
  if (!transaction.status && (mode === "quick" || mode === "manual")) {
    transaction.status = "Posted";
  }
  transaction.parserVersion = PARSER_VERSION;
  transaction.paymentApp = transaction.paymentApp || detectPaymentApp(rawMessage);
  transaction.cardNetwork = transaction.cardNetwork || detectCardNetwork(rawMessage);

  const review = determineReviewState(transaction, mode);
  transaction.reviewFlag = review.flag;
  transaction.reviewReason = review.reason;

  const transactionId = createTransactionId(
    transaction,
    rawMessage,
    sender,
    mode,
    requestId
  );

  if (isDuplicate(sheet, transactionId)) {
    return {
      duplicate: true,
      transactionId: transactionId,
      transaction: transaction
    };
  }

  // Link card/loan/utility payments to an open bill before writing the row.
  transaction.linkedBillId = linkTransactionToBill(
    transaction,
    rawMessage,
    billsSheet
  );

  const transactionDate = resolveTransactionDate(transaction.created);

  sheet.appendRow([
    Utilities.formatDate(transactionDate, TIMEZONE, "dd-MM-yyyy"),
    Utilities.formatDate(transactionDate, TIMEZONE, "hh:mm:ss a"),
    transaction.type,
    transaction.amount,
    transaction.category,
    transaction.paymentMethod,
    transaction.merchant,
    transaction.account,
    transaction.source,
    rawMessage,
    transactionId,
    transaction.bank,
    transaction.last4,
    transaction.referenceId,
    transaction.nature,
    transaction.confidence,
    transaction.currency,
    transaction.status,
    transaction.reviewFlag ? "Yes" : "No",
    transaction.reviewReason,
    transaction.linkedBillId,
    PARSER_VERSION,
    transaction.paymentApp,
    transaction.cardNetwork
  ]);

  formatTransactionRow(sheet, sheet.getLastRow());

  return {
    duplicate: false,
    transactionId: transactionId,
    transaction: transaction
  };
}

function detectCurrency(message) {
  const text = String(message || "");

  if (/\bUSD\b|US\$/i.test(text)) return "USD";
  if (/\bEUR\b|€/i.test(text)) return "EUR";
  if (/\bGBP\b|£/i.test(text)) return "GBP";
  if (/\bAED\b/i.test(text)) return "AED";
  if (/\bSGD\b/i.test(text)) return "SGD";
  if (/\bCHF\b/i.test(text)) return "CHF";
  if (/\bJPY\b|¥/i.test(text)) return "JPY";
  if (/\bINR\b|₹|\bRs\.?\s*\d/i.test(text)) return "INR";
  return "";
}

function detectPaymentApp(message) {
  const text = String(message || "").toLowerCase();
  if (/supermoney/i.test(text)) return "SuperMoney";
  if (/phonepe/i.test(text)) return "PhonePe";
  if (/google pay|\bgpay\b/i.test(text)) return "Google Pay";
  if (/paytm/i.test(text)) return "Paytm";
  if (/\bbhim\b/i.test(text)) return "BHIM";
  if (/\bcred\b/i.test(text)) return "CRED";
  if (/amazon pay/i.test(text)) return "Amazon Pay";
  if (/mobikwik/i.test(text)) return "MobiKwik";
  return "";
}

function detectCardNetwork(message) {
  const text = String(message || "").toLowerCase();
  if (/rupay/i.test(text)) return "RuPay";
  if (/mastercard|master card/i.test(text)) return "Mastercard";
  if (/\bvisa\b/i.test(text)) return "Visa";
  if (/american express|\bamex\b/i.test(text)) return "American Express";
  if (/diners club|\bdiners\b/i.test(text)) return "Diners Club";
  return "";
}


function detectTransactionStatus(message) {
  const text = String(message || "").toLowerCase();
  if (/pending|processing|awaiting confirmation/i.test(text)) return "Pending";
  if (/reversed|reversal|refunded|refund credited/i.test(text)) return "Posted - Reversal/Refund";
  if (/debited|credited|spent|paid|withdrawn|received|deposited|transferred|sent/i.test(text)) return "Posted";
  return "";
}

function determineReviewState(transaction, mode) {
  if (mode === "quick" || mode === "manual") {
    return { flag: false, reason: "" };
  }

  const reasons = [];
  if (Number(transaction.confidence || 0) < 75) reasons.push("Low confidence");
  if (!transaction.bank) reasons.push("Bank not identified");
  if (!transaction.merchant) reasons.push("Merchant not identified");
  if (transaction.category === "Other") reasons.push("Category needs review");

  return {
    flag: reasons.length > 0,
    reason: reasons.join("; ")
  };
}

function applyRules(transaction, rulesSheet) {
  if (!transaction || !rulesSheet || rulesSheet.getLastRow() < 2) return transaction;

  const rows = rulesSheet
    .getRange(2, 1, rulesSheet.getLastRow() - 1, RULE_HEADERS.length)
    .getValues();

  const merchantKey = merchantLearningKey(transaction.merchant || "");
  const last4 = String(transaction.last4 || "").trim();

  for (let i = 0; i < rows.length; i++) {
    const ruleType = String(rows[i][1] || "").trim().toLowerCase();
    const match = String(rows[i][2] || "").trim();
    const value = String(rows[i][3] || "").trim();
    const activeRaw = String(rows[i][4] == null ? "true" : rows[i][4]).trim().toLowerCase();
    const active = !(activeRaw === "false" || activeRaw === "no" || activeRaw === "0");

    if (!active || !ruleType || !match || !value) continue;

    if (ruleType === "merchant category") {
      if (merchantKey && merchantKey.indexOf(merchantLearningKey(match)) !== -1) {
        transaction.category = normalizeCategory(value);
      }
    } else if (ruleType === "merchant rename") {
      if (merchantKey && merchantKey.indexOf(merchantLearningKey(match)) !== -1) {
        transaction.merchant = value;
      }
    } else if (ruleType === "bank by last4") {
      const ruleLast4 = String(match).replace(/\D/g, "").slice(-4);
      if (last4 && ruleLast4 && last4 === ruleLast4) {
        transaction.bank = value;
        transaction.account = buildAccountLabel(
          value,
          transaction.paymentMethod,
          last4,
          transaction.account
        );
      }
    }
  }

  transaction.nature = detectNature(
    transaction.merchant + " " + transaction.account,
    transaction.type,
    transaction.paymentMethod,
    transaction.category
  );

  if (transaction.source === "iPhone SMS") {
    transaction.confidence = calculateConfidence(transaction);
  }

  return transaction;
}

// ------------------------------------------------------------
// BILL / STATEMENT ENGINE
// ------------------------------------------------------------

function parseBillMessage(message, sender) {
  const bank = detectBankName(message, sender);
  const billType = detectBillType(message);
  const last4 = detectBillLast4(message, billType);
  const issuer = detectBillerName(message, bank, billType);
  const account = buildBillAccountLabel(bank, issuer, billType, last4);
  const dueDate = detectDateAfterLabels(message, [
    "due date",
    "payment due date",
    "payment due",
    "due on",
    "due by",
    "pay by"
  ]);
  const statementDate = detectDateAfterLabels(message, [
    "statement date",
    "bill date",
    "generated on",
    "statement generated on"
  ]);

  const billAmount = detectBillAmount(message);
  const minimumDue = detectMinimumDue(message);
  const referenceId = detectReferenceId(message);
  const event = detectBillEvent(message);
  const autopay = detectAutopayMention(message);
  const statementPeriod = detectStatementPeriod(message, dueDate);

  const bill = {
    billType: billType,
    issuer: issuer,
    bank: bank,
    account: account,
    last4: last4,
    statementDate: statementDate,
    statementPeriod: statementPeriod,
    dueDate: dueDate,
    billAmount: billAmount,
    minimumDue: minimumDue,
    paidAmount: "",
    balanceDue: billAmount,
    status: determineBillStatus(message, dueDate, billAmount, 0),
    autopay: autopay,
    lastEvent: event,
    referenceId: referenceId,
    confidence: 0,
    source: "iPhone SMS"
  };

  bill.confidence = calculateBillConfidence(bill);
  bill.billId = createBillId(bill, message, sender);
  return bill;
}

function detectBillType(message) {
  const text = String(message || "").toLowerCase();

  // BNPL / Pay Later must be checked before generic EMI/loan wording because
  // providers such as LazyPay can include EMIs inside a monthly statement.
  if (/lazypay|\bsimpl\b|amazon pay later|flipkart pay later|paytm postpaid|mobikwik zip|olamoney postpaid|freecharge pay later|\bpostpe\b|pay later|\bbnpl\b/i.test(text)) {
    return "Pay Later / BNPL";
  }

  if (/credit card|card statement|minimum (?:amount )?due/i.test(text)) return "Credit Card Bill";
  if (/\bemi\b|loan|instalment|installment/i.test(text)) return "Loan / EMI";
  if (/electricity|power bill|bescom|water bill|gas bill|utility/i.test(text)) return "Utility Bill";
  if (/mobile bill|telecom bill|broadband|internet bill|airtel postpaid|jio postpaid|vi postpaid/i.test(text)) return "Telecom Bill";
  if (/insurance|premium due|policy premium/i.test(text)) return "Insurance Premium";
  if (/subscription|membership renewal|renewal due/i.test(text)) return "Subscription";
  return "Other Bill";
}

function detectBillerName(message, bank, billType) {
  if (billType === "Credit Card Bill" && bank) return bank;

  const text = String(message || "");
  const known = [
    ["LazyPay", /\blazypay\b/i],
    ["Simpl", /(?:^|\s)simpl(?:\s|$)/i],
    ["Amazon Pay Later", /amazon pay later/i],
    ["Flipkart Pay Later", /flipkart pay later/i],
    ["Paytm Postpaid", /paytm postpaid/i],
    ["MobiKwik ZIP", /mobikwik zip/i],
    ["OlaMoney Postpaid", /olamoney postpaid/i],
    ["Freecharge Pay Later", /freecharge pay later/i],
    ["PostPe", /\bpostpe\b/i],
    ["BESCOM", /\bbescom\b/i],
    ["Airtel", /\bairtel\b/i],
    ["Jio", /\bjio\b|jiofiber/i],
    ["Vi", /\bvi\b|vodafone idea/i],
    ["LIC", /\blic\b|life insurance corporation/i],
    ["Tata Play", /tata play/i],
    ["ACT Fibernet", /act fibernet|act broadband/i]
  ];

  for (let i = 0; i < known.length; i++) {
    if (known[i][1].test(text)) return known[i][0];
  }

  // "LazyPay statement ...", "ABC statement ..."
  const leadingStatement = text.match(/^\s*([A-Za-z][A-Za-z0-9 .&'_-]{1,39}?)\s+(?:credit card\s+)?statement\b/i);
  if (leadingStatement) {
    const candidate = cleanMerchantName(leadingStatement[1]);
    if (candidate && !/^(?:your|monthly|credit card)$/i.test(candidate)) return candidate;
  }

  const match = text.match(/(?:bill|statement|invoice)\s+(?:from|for)\s+([A-Za-z0-9 .&'_-]{2,50})/i);
  if (match) return cleanMerchantName(match[1]);

  return bank || "";
}

function detectBillLast4(message, billType) {
  if (billType === "Credit Card Bill") {
    return detectCreditCardLast4(message) || detectGenericLast4(message);
  }
  return detectBankAccountLast4(message) || detectGenericLast4(message);
}

function buildBillAccountLabel(bank, issuer, billType, last4) {
  let label = "";

  if (billType === "Credit Card Bill") {
    label = bank ? bank + " Credit Card" : (issuer ? issuer + " Credit Card" : "");
  } else if (billType === "Pay Later / BNPL") {
    label = issuer || bank || "";
  } else if (bank) {
    label = bank;
  } else if (issuer) {
    label = issuer;
  }

  if (last4) label += (label ? " " : "") + "XX" + last4;
  return label.trim();
}

function detectBillAmount(message) {
  const labeled = detectLabeledAmount(message, [
    "total amount due",
    "total due",
    "bill amount",
    "statement amount",
    "amount due",
    "outstanding amount",
    "total outstanding",
    "premium due",
    "emi due"
  ]);

  if (labeled !== "") return labeled;

  // Provider statements often use wording such as:
  // "statement of Rs. 1251.37" or "bill for INR 999".
  // Currency is mandatory in this fallback so dates or statement-period
  // numbers are never mistaken for bill amounts.
  const text = String(message || "").replace(/\s+/g, " ");
  const patterns = [
    /(?:statement|bill|invoice)\s+(?:amount\s+)?(?:of|for|is|:|-)\s*(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:spends?|dues?)\s+(?:of|for|worth)\s*(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) return parseAmount(match[1]);
  }

  return "";
}

function detectMinimumDue(message) {
  return detectLabeledAmount(message, [
    "minimum amount due",
    "minimum due",
    "min amount due",
    "min due"
  ]);
}


function detectLabeledAmount(message, labels) {
  const text = String(message || "").replace(/\s+/g, " ");

  for (let i = 0; i < labels.length; i++) {
    const escaped = escapeRegExp(labels[i]);
    const regex = new RegExp(
      escaped + "\\s*(?:is|of|:|-)?\\s*(?:INR|Rs\\.?|₹)?\\s*([\\d,]+(?:\\.\\d{1,2})?)",
      "i"
    );
    const match = text.match(regex);
    if (match) return parseAmount(match[1]);
  }

  return "";
}

function detectBillEvent(message) {
  const text = String(message || "").toLowerCase();
  if (/payment reminder/i.test(text)) return "Payment Reminder";
  if (/\bstatement\b/i.test(text) && /due date|due on|due by|pay by|amount due|total due/i.test(text)) {
    return "Statement / Due Notice";
  }
  if (/statement (?:generated|ready|available)|credit card statement/i.test(text)) return "Statement Generated";
  if (/\bstatement\b/i.test(text)) return "Statement Update";
  if (/bill generated/i.test(text)) return "Bill Generated";
  if (/emi due/i.test(text)) return "EMI Due";
  if (/premium due/i.test(text)) return "Premium Due";
  if (/minimum (?:amount )?due/i.test(text)) return "Minimum Due Notice";
  if (/amount due|total due|payment due|due date|due on|due by|pay by/i.test(text)) return "Due Notice";
  return "Bill Update";
}

function detectAutopayMention(message) {
  const text = String(message || "").toLowerCase();
  if (/autopay|auto[- ]?debit|standing instruction|e-?nach|\bnach\b|\becs\b/i.test(text)) {
    if (/disabled|cancelled|canceled|deactivated/i.test(text)) return "Disabled";
    if (/enabled|active|registered|set up|scheduled|will be auto/i.test(text)) return "Enabled / Mentioned";
    return "Mentioned";
  }
  return "";
}

function detectStatementPeriod(message, referenceDate) {
  const text = String(message || "").replace(/\s+/g, " ").trim();

  const dateToken =
    "(?:" +
      "\\d{1,2}(?:st|nd|rd|th)?[-/.]\\d{1,2}(?:[-/.]\\d{2,4})?" +
      "|\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]{3,9}(?:,?\\s+\\d{2,4})?" +
      "|[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{2,4})?" +
    ")";

  const patterns = [
    new RegExp("(?:between|from)\\s+(" + dateToken + ")\\s+(?:to|and|-)\\s+(" + dateToken + ")", "i"),
    new RegExp("(?:statement|billing)\\s+period\\s*(?:is|:|-)?\\s*(" + dateToken + ")\\s*(?:to|and|-)\\s*(" + dateToken + ")", "i")
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (!match) continue;

    const startDate = parseStatementPeriodDate(match[1], referenceDate);
    const endDate = parseStatementPeriodDate(match[2], referenceDate);

    if (isValidDate(startDate) && isValidDate(endDate)) {
      return formatStatementPeriodDate(startDate) + " to " + formatStatementPeriodDate(endDate);
    }

    // Do not invent a year when the dates cannot be parsed reliably.
    // Preserve the exact detected period instead.
    return String(match[1] || "").trim() + " to " + String(match[2] || "").trim();
  }

  // Fallback for free-form labels that do not cleanly expose two date tokens.
  const labeled = text.match(/(?:statement|billing)\s+period\s*(?:is|:|-)?\s*([A-Za-z0-9 ,/.-]{5,45}?)(?:\.|\bdue\b|\btotal\b|\bamount\b|$)/i);
  return labeled ? String(labeled[1] || "").trim() : "";
}

function parseStatementPeriodDate(value, referenceDate) {
  const raw = normalizeOrdinalDateText(value);
  if (!raw) return null;

  // If the period explicitly contains a year, trust it.
  if (/\b\d{4}\b/.test(raw) || /[-/.]\d{2,4}$/.test(raw)) {
    return parseFlexibleDate(raw);
  }

  const reference = isValidDate(referenceDate)
    ? referenceDate
    : todayInFinanceTimezone();

  const year = reference.getFullYear();
  let date = parseFlexibleDate(raw + " " + year);

  if (!isValidDate(date)) return null;

  // Statement periods normally precede their due date. If adding the due
  // date's year puts the period implausibly after the due date, use the
  // previous year (important for December statements due in January).
  const referenceDay = startOfDay(reference);
  if (date.getTime() > referenceDay.getTime() + 14 * 86400000) {
    date = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
  }

  return date;
}

function formatStatementPeriodDate(date) {
  return isValidDate(date)
    ? Utilities.formatDate(date, TIMEZONE, "dd-MMM-yyyy")
    : "";
}

function normalizeOrdinalDateText(value) {
  return String(value || "")
    .trim()
    .replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDateAfterLabels(message, labels) {
  const text = String(message || "").replace(/\s+/g, " ");

  const datePattern =
    "(" +
      "\\d{1,2}(?:st|nd|rd|th)?[-/.]\\d{1,2}(?:[-/.]\\d{2,4})?" +
      "|\\d{1,2}(?:st|nd|rd|th)?[- ]?[A-Za-z]{3,9}(?:,?\\s*\\d{2,4})?" +
      "|[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{2,4})?" +
    ")";

  for (let i = 0; i < labels.length; i++) {
    const escaped = escapeRegExp(labels[i]);
    const regex = new RegExp(
      escaped + "\\s*(?:is|on|by|:|-)?\\s*" + datePattern,
      "i"
    );
    const match = text.match(regex);
    if (match) {
      const date = parseFlexibleDate(match[1]);
      if (date) return date;
    }
  }

  return null;
}

function parseFlexibleDate(value) {
  const raw = normalizeOrdinalDateText(value);
  if (!raw) return null;

  let match = raw.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (match) {
    const hasYear = Boolean(match[3]);
    let year = hasYear ? Number(match[3]) : todayInFinanceTimezone().getFullYear();
    if (year < 100) year += 2000;
    let date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    if (!hasYear) date = adjustYearForUpcomingDate(date);
    return isValidDate(date) ? date : null;
  }

  const months = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
    nov: 10, november: 10, dec: 11, december: 11
  };

  match = raw.match(/^(\d{1,2})[- ]([A-Za-z]{3,9})(?:[- ](\d{2,4}))?$/);
  if (match) {
    const key = match[2].toLowerCase();
    if (months[key] == null) return null;
    const hasYear = Boolean(match[3]);
    let year = hasYear ? Number(match[3]) : todayInFinanceTimezone().getFullYear();
    if (year < 100) year += 2000;
    let date = new Date(year, months[key], Number(match[1]));
    if (!hasYear) date = adjustYearForUpcomingDate(date);
    return date;
  }

  match = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
  if (match) {
    const key = match[1].toLowerCase();
    if (months[key] == null) return null;
    const hasYear = Boolean(match[3]);
    let year = hasYear ? Number(match[3]) : todayInFinanceTimezone().getFullYear();
    if (year < 100) year += 2000;
    let date = new Date(year, months[key], Number(match[2]));
    if (!hasYear) date = adjustYearForUpcomingDate(date);
    return date;
  }

  return null;
}


function adjustYearForUpcomingDate(date) {
  if (!isValidDate(date)) return date;
  const now = todayInFinanceTimezone();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / 86400000);
  // If a year-less date looks far in the past, it normally means next year.
  if (diffDays < -120) {
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  return date;
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

function formatDateValue(date) {
  return isValidDate(date) ? Utilities.formatDate(date, TIMEZONE, "dd-MM-yyyy") : "";
}

function determineBillStatus(message, dueDate, totalAmount, paidAmount) {
  const text = String(message || "").toLowerCase();
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (/paid in full|payment received|fully paid|no amount due/i.test(text)) return "Paid";
  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";

  if (isValidDate(dueDate)) {
    const today = todayInFinanceTimezone();
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);

    if (days < 0) return "Overdue";
    if (days === 0) return "Due Today";
    if (days <= 3) return "Due Soon";
    return "Due";
  }

  if (/payment reminder|amount due|total due|minimum due/i.test(text)) return "Due";
  return "Generated";
}

function calculateBillConfidence(bill) {
  let score = 20;
  if (bill.billType && bill.billType !== "Other Bill") score += 15;
  if (bill.issuer) score += 10;
  if (bill.bank) score += 10;
  if (bill.last4) score += 10;
  if (bill.billAmount !== "") score += 15;
  if (bill.minimumDue !== "") score += 5;
  if (isValidDate(bill.dueDate)) score += 10;
  if (bill.referenceId) score += 5;
  return Math.min(100, score);
}

function createBillId(bill, message, sender) {
  if (bill.referenceId) {
    return hashToId("BILL|" + bill.referenceId + "|" + bill.bank + "|" + bill.last4);
  }

  const due = formatDateValue(bill.dueDate);
  const stable = [
    bill.billType,
    bill.issuer,
    bill.bank,
    bill.last4,
    due,
    bill.billAmount
  ].join("|");

  if (due || bill.billAmount !== "" || bill.last4) {
    return hashToId("BILL|" + stable);
  }

  return hashToId("BILL|" + normalizeMessageForHash(message) + "|" + String(sender || "").toLowerCase());
}

function upsertBillRecord(sheet, bill, rawMessage, sender) {
  const row = findRowById(sheet, 1, bill.billId);
  const now = new Date();
  const nowDate = Utilities.formatDate(now, TIMEZONE, "dd-MM-yyyy");
  const nowTime = Utilities.formatDate(now, TIMEZONE, "hh:mm:ss a");
  const updatedAt = Utilities.formatDate(now, TIMEZONE, "dd-MM-yyyy hh:mm:ss a");

  if (row > 0) {
    const existing = sheet.getRange(row, 1, 1, BILL_HEADERS.length).getValues()[0];

    // Raw Message = column 22 (array index 21).
    if (normalizeMessageForHash(existing[21]) === normalizeMessageForHash(rawMessage)) {
      formatBillRow(sheet, row);
      return { duplicate: true, updated: false, billId: bill.billId, bill: bill };
    }

    const existingPaid = parseAmount(existing[13]) || 0;
    const total = bill.billAmount !== "" ? Number(bill.billAmount) : parseAmount(existing[11]);
    const balance = total !== "" && total != null
      ? Math.max(0, Number(total || 0) - Number(existingPaid || 0))
      : existing[14];
    const status = determineBillStatus(rawMessage, bill.dueDate, total, existingPaid);

    const values = [
      bill.billId,
      existing[1] || nowDate,
      existing[2] || nowTime,
      bill.billType || existing[3],
      bill.issuer || existing[4],
      bill.bank || existing[5],
      bill.account || existing[6],
      bill.last4 || existing[7],
      formatDateValue(bill.statementDate) || existing[8],
      bill.statementPeriod || existing[9],
      formatDateValue(bill.dueDate) || existing[10],
      bill.billAmount !== "" ? bill.billAmount : existing[11],
      bill.minimumDue !== "" ? bill.minimumDue : existing[12],
      existingPaid,
      balance,
      existing[15] === "Paid" ? "Paid" : status,
      bill.autopay || existing[16],
      bill.lastEvent || existing[17],
      bill.referenceId || existing[18],
      Math.max(Number(existing[19] || 0), Number(bill.confidence || 0)),
      "iPhone SMS",
      rawMessage,
      updatedAt,
      existing[23] || ""
    ];

    sheet.getRange(row, 1, 1, values.length).setValues([values]);
    formatBillRow(sheet, row);
    return { duplicate: false, updated: true, billId: bill.billId, bill: bill };
  }

  sheet.appendRow([
    bill.billId,
    nowDate,
    nowTime,
    bill.billType,
    bill.issuer,
    bill.bank,
    bill.account,
    bill.last4,
    formatDateValue(bill.statementDate),
    bill.statementPeriod,
    formatDateValue(bill.dueDate),
    bill.billAmount,
    bill.minimumDue,
    0,
    bill.billAmount !== "" ? bill.billAmount : "",
    bill.status,
    bill.autopay,
    bill.lastEvent,
    bill.referenceId,
    bill.confidence,
    "iPhone SMS",
    rawMessage,
    updatedAt,
    ""
  ]);

  formatBillRow(sheet, sheet.getLastRow());
  return { duplicate: false, updated: false, billId: bill.billId, bill: bill };
}

function linkTransactionToBill(transaction, rawMessage, billsSheet) {
  if (!billsSheet || billsSheet.getLastRow() < 2) return "";

  const eligible =
    transaction.nature === "Credit Card Payment" ||
    transaction.nature === "Debt Payment" ||
    transaction.category === "Bills & Utilities" ||
    transaction.category === "Insurance" ||
    transaction.category === "Subscriptions";

  if (!eligible) return "";

  const rows = billsSheet
    .getRange(2, 1, billsSheet.getLastRow() - 1, BILL_HEADERS.length)
    .getValues();

  const targetCardLast4 = detectCreditCardLast4(rawMessage);
  const wantedLast4 = targetCardLast4 || transaction.last4;
  const merchantKey = merchantLearningKey(transaction.merchant || "");
  const amount = Number(transaction.amount || 0);

  let bestIndex = -1;
  let bestScore = -1;

  for (let i = rows.length - 1; i >= 0; i--) {
    const status = String(rows[i][15] || "");
    if (/paid|closed/i.test(status)) continue;

    let score = 0;
    const billLast4 = String(rows[i][7] || "");
    const issuerKey = merchantLearningKey(rows[i][4] || "");
    const total = Number(parseAmount(rows[i][11]) || 0);
    const balance = Number(parseAmount(rows[i][14]) || total || 0);

    if (wantedLast4 && billLast4 && wantedLast4 === billLast4) score += 60;
    if (merchantKey && issuerKey && (merchantKey.indexOf(issuerKey) !== -1 || issuerKey.indexOf(merchantKey) !== -1)) score += 25;
    if (amount > 0 && balance > 0 && Math.abs(amount - balance) < 0.01) score += 25;
    else if (amount > 0 && total > 0 && Math.abs(amount - total) < 0.01) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 25) return "";

  const sheetRow = bestIndex + 2;
  const row = rows[bestIndex];
  const billId = String(row[0] || "");
  const previousPaid = Number(parseAmount(row[13]) || 0);
  const total = Number(parseAmount(row[11]) || 0);
  const newPaid = previousPaid + amount;
  const balance = total > 0 ? Math.max(0, total - newPaid) : "";
  const status = total > 0 && newPaid >= total ? "Paid" : "Partially Paid";

  billsSheet.getRange(sheetRow, 14).setValue(newPaid); // Paid Amount
  billsSheet.getRange(sheetRow, 15).setValue(balance); // Balance Due
  billsSheet.getRange(sheetRow, 16).setValue(status);  // Status
  billsSheet.getRange(sheetRow, 18).setValue("Payment Detected");
  billsSheet.getRange(sheetRow, 23).setValue(
    Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a")
  );
  if (status === "Paid") {
    billsSheet.getRange(sheetRow, 24).setValue(
      Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a")
    );
  }

  formatBillRow(billsSheet, sheetRow);
  return billId;
}

// ------------------------------------------------------------
// ALERT / SPAM / FRAUD / FAILURE ENGINE
// ------------------------------------------------------------

function parseAlertMessage(message, sender, analysis) {
  const bank = detectBankName(message, sender);
  const paymentMethod = detectPaymentMethod(message);
  const accountInfo = detectAccountInfo(message, paymentMethod, bank);
  const alertClass = analysis.forcedAlertClass || detectAlertClass(message, analysis);
  const severity = analysis.forcedAlertSeverity || detectAlertSeverity(alertClass, message);
  const amount = detectAmount(message);
  const merchant = detectMerchant(message, detectTransactionType(message));
  const reason = analysis.forcedAlertReason || detectAlertReason(alertClass, message);
  const suggestedAction = suggestedActionForAlert(alertClass, severity);

  const alert = {
    alertClass: alertClass,
    severity: severity,
    bank: bank,
    account: accountInfo.account,
    last4: accountInfo.last4,
    amount: amount,
    merchant: merchant,
    reason: reason,
    suggestedAction: suggestedAction,
    status: "Open",
    confidence: calculateAlertConfidence(alertClass, bank, accountInfo.last4, amount),
    source: "iPhone SMS"
  };

  alert.alertId = createAlertId(alert, message, sender);
  return alert;
}

function detectAlertClass(message, analysis) {
  const text = String(message || "").toLowerCase();
  if (analysis && analysis.security) {
    if (/unauthori[sz]ed|fraud|not you|did not make|unrecognized|unrecognised/i.test(text)) return "Unauthorized / Fraud";
    if (/suspicious|unusual activity|security alert/i.test(text)) return "Suspicious Activity";
    if (/card.*blocked|blocked.*card|card.*frozen|account.*blocked|account.*frozen/i.test(text)) return "Account / Card Security";
  }
  if (analysis && analysis.failed) return "Transaction Failed / Declined";
  if (analysis && analysis.paymentRequest) return "Payment Request";
  if (analysis && analysis.promotion) return "Promotion / Spam";
  return "Financial Alert";
}

function detectAlertSeverity(alertClass, message) {
  if (alertClass === "Unauthorized / Fraud") return "Critical";
  if (alertClass === "Suspicious Activity" || alertClass === "Account / Card Security") return "High";
  if (alertClass === "Transaction Failed / Declined" || alertClass === "Payment Request" || alertClass === "Parser Review") return "Medium";
  if (alertClass === "Promotion / Spam") return "Info";
  return "Low";
}

function detectAlertReason(alertClass, message) {
  const text = String(message || "").toLowerCase();
  if (alertClass === "Unauthorized / Fraud") return "Message contains unauthorized/fraud indicators.";
  if (alertClass === "Suspicious Activity") return "Bank reported suspicious or unusual activity.";
  if (alertClass === "Account / Card Security") return "Card or account security status changed.";
  if (alertClass === "Transaction Failed / Declined") {
    if (/insufficient (?:funds|balance)/i.test(text)) return "Transaction failed due to insufficient balance/funds.";
    return "Transaction was reported as failed, declined or unsuccessful.";
  }
  if (alertClass === "Payment Request") return "A collect/payment request was received; this is not a completed transaction.";
  if (alertClass === "Promotion / Spam") return "Promotional financial message detected.";
  return "Financial message requires attention.";
}

function suggestedActionForAlert(alertClass, severity) {
  if (alertClass === "Unauthorized / Fraud") return "Verify immediately. If not yours, use the bank's official app/number to block the instrument and report it.";
  if (alertClass === "Suspicious Activity") return "Review recent transactions and secure the account if the activity is unfamiliar.";
  if (alertClass === "Account / Card Security") return "Open the bank's official app or contact the bank to verify the card/account status.";
  if (alertClass === "Transaction Failed / Declined") return "Check balance, limits and bank status before retrying. Do not count this as spending unless a debit is later confirmed.";
  if (alertClass === "Payment Request") return "Approve only if you recognize the requester and amount.";
  if (alertClass === "Promotion / Spam") return "No action required. Hide in the app unless you want to review offers.";
  if (severity === "Medium" || severity === "High" || severity === "Critical") return "Review this alert.";
  return "No immediate action required.";
}

function calculateAlertConfidence(alertClass, bank, last4, amount) {
  let score = 50;
  if (alertClass && alertClass !== "Financial Alert") score += 20;
  if (bank) score += 10;
  if (last4) score += 10;
  if (amount !== "") score += 10;
  return Math.min(100, score);
}

function createAlertId(alert, message, sender) {
  return hashToId(
    "ALERT|" +
    alert.alertClass + "|" +
    normalizeMessageForHash(message) + "|" +
    String(sender || "").toLowerCase()
  );
}

function saveAlertRecord(sheet, alert, rawMessage, sender, relatedTransactionId) {
  const existingRow = findRowById(sheet, 1, alert.alertId);
  if (existingRow > 0) {
    formatAlertRow(sheet, existingRow);
    return {
      duplicate: true,
      alertId: alert.alertId,
      alert: alert
    };
  }

  const now = new Date();
  sheet.appendRow([
    alert.alertId,
    Utilities.formatDate(now, TIMEZONE, "dd-MM-yyyy"),
    Utilities.formatDate(now, TIMEZONE, "hh:mm:ss a"),
    alert.alertClass,
    alert.severity,
    alert.bank,
    alert.account,
    alert.last4,
    alert.amount,
    alert.merchant,
    alert.reason,
    alert.suggestedAction,
    alert.status,
    sender,
    alert.source,
    sanitizeSensitiveAlertText(rawMessage),
    alert.confidence,
    relatedTransactionId || ""
  ]);

  formatAlertRow(sheet, sheet.getLastRow());

  return {
    duplicate: false,
    alertId: alert.alertId,
    alert: alert
  };
}

function sanitizeSensitiveAlertText(message) {
  return String(message || "")
    .replace(/((?:otp|pin|cvv|verification code)\D{0,12})(\d{3,8})/ig, "$1[REDACTED]")
    .trim();
}


// ------------------------------------------------------------
// AUTOMATIC DAILY BILL MAINTENANCE
// The trigger is installed automatically when the web app receives data.
// This keeps due statuses and row colors current without manual work.
// ------------------------------------------------------------

function dailyFinanceMaintenance() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const billsSheet = getOrCreateSheet(spreadsheet, "Bills", BILL_HEADERS);
  const alertsSheet = getOrCreateSheet(spreadsheet, "Alerts", ALERT_HEADERS);

  if (billsSheet.getLastRow() < 2) return;

  const rows = billsSheet
    .getRange(2, 1, billsSheet.getLastRow() - 1, BILL_HEADERS.length)
    .getValues();

  const today = todayInFinanceTimezone();

  for (let i = 0; i < rows.length; i++) {
    const sheetRow = i + 2;
    const billId = String(rows[i][0] || "");
    const dueDate = parseStoredDate(rows[i][10]);
    const status = String(rows[i][15] || "");
    const total = Number(parseAmount(rows[i][11]) || 0);
    const paid = Number(parseAmount(rows[i][13]) || 0);
    const balance = Number(parseAmount(rows[i][14]) || Math.max(0, total - paid));

    if (!billId || !dueDate || /paid|closed/i.test(status) || balance <= 0) continue;

    const days = Math.round((startOfDay(dueDate).getTime() - today.getTime()) / 86400000);
    let newStatus = status;
    let reminderClass = "";
    let severity = "Info";

    if (days < 0) {
      newStatus = "Overdue";
      reminderClass = "Bill Overdue";
      severity = "High";
    } else if (days === 0) {
      newStatus = "Due Today";
      reminderClass = "Bill Due Today";
      severity = "High";
    } else if (days <= 3) {
      newStatus = "Due Soon";
      reminderClass = "Bill Due Soon";
      severity = "Medium";
    } else if (!/paid|closed|partially paid/i.test(status)) {
      newStatus = "Due";
    }

    if (newStatus !== status) {
      billsSheet.getRange(sheetRow, 16).setValue(newStatus);
      billsSheet.getRange(sheetRow, 23).setValue(
        Utilities.formatDate(new Date(), TIMEZONE, "dd-MM-yyyy hh:mm:ss a")
      );
    }

    if (reminderClass) {
      saveBillReminderAlert(alertsSheet, rows[i], reminderClass, severity, days);
    }

    // Re-evaluate visual state every day so colors change automatically
    // as due dates approach or pass.
    formatBillRow(billsSheet, sheetRow);
  }

  formatAlertsSheet(alertsSheet);
}

function saveBillReminderAlert(alertsSheet, billRow, alertClass, severity, days) {
  const billId = String(billRow[0] || "");
  const alertId = hashToId("BILL_REMINDER|" + billId + "|" + alertClass);

  if (findRowById(alertsSheet, 1, alertId) > 0) return;

  const now = new Date();
  const amount = parseAmount(billRow[14]) || parseAmount(billRow[11]);
  const dueDate = String(billRow[10] || "");
  const issuer = String(billRow[4] || "");

  let reason = issuer + " bill";
  if (days < 0) reason += " is overdue";
  else if (days === 0) reason += " is due today";
  else reason += " is due in " + days + " day(s)";
  if (dueDate) reason += " (" + dueDate + ")";
  if (amount !== "") reason += ". Balance due: " + amount;

  alertsSheet.appendRow([
    alertId,
    Utilities.formatDate(now, TIMEZONE, "dd-MM-yyyy"),
    Utilities.formatDate(now, TIMEZONE, "hh:mm:ss a"),
    alertClass,
    severity,
    billRow[5],
    billRow[6],
    billRow[7],
    amount,
    issuer,
    reason,
    "Pay or review the bill before the due date.",
    "Open",
    "",
    "Daily Finance Maintenance",
    "",
    100,
    ""
  ]);

  formatAlertRow(alertsSheet, alertsSheet.getLastRow());
}

function ensureDailyFinanceMaintenanceTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "dailyFinanceMaintenance") {
        return;
      }
    }

    ScriptApp.newTrigger("dailyFinanceMaintenance")
      .timeBased()
      .everyDays(1)
      .atHour(8)
      .create();
  } catch (error) {
    // Styling and transaction saving must never fail because a trigger could
    // not be installed in the current deployment context.
    console.log("Daily maintenance trigger not installed: " + error.message);
  }
}

function setupDailyFinanceMaintenanceTrigger() {
  ensureDailyFinanceMaintenanceTrigger();
}

function parseStoredDate(value) {
  if (value instanceof Date && isValidDate(value)) return value;
  return parseFlexibleDate(String(value || ""));
}

function todayInFinanceTimezone() {
  const value = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  const parts = value.split("-");
  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ------------------------------------------------------------
// PREMIUM AUTOMATIC ROW COLOR ENGINE
// ------------------------------------------------------------

function styleHeaderRow(sheet, columnCount) {
  if (!sheet || columnCount < 1) return;
  const range = sheet.getRange(1, 1, 1, columnCount);
  range
    .setBackground(FINANCE_THEME.headerBg)
    .setFontColor(FINANCE_THEME.headerText)
    .setFontWeight("bold")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 32);
}

function applyRowTheme(sheet, row, columnCount, theme) {
  if (!sheet || row < 2 || columnCount < 1) return;
  const range = sheet.getRange(row, 1, 1, columnCount);
  range
    .setBackground(theme.bg)
    .setFontColor(theme.text)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, theme.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(row, 28);
}

function formatTransactionRow(sheet, row) {
  if (!sheet || row < 2) return;

  const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const nature = String(values[14] || "");      // Nature
  const status = String(values[17] || "");      // Status
  const review = String(values[18] || "").toLowerCase(); // Review Flag

  let theme = {
    bg: FINANCE_THEME.normalBg,
    text: FINANCE_THEME.normalText,
    border: FINANCE_THEME.normalBorder
  };

  if (/pending/i.test(status)) {
    theme = {
      bg: FINANCE_THEME.neutralBg,
      text: FINANCE_THEME.neutralText,
      border: FINANCE_THEME.neutralBorder
    };
  } else if (/reversal|refund/i.test(status) || nature === "Refund") {
    theme = {
      bg: FINANCE_THEME.infoBg,
      text: FINANCE_THEME.infoText,
      border: FINANCE_THEME.infoBorder
    };
  }

  if (review === "yes" || review === "true") {
    theme = {
      bg: FINANCE_THEME.warningBg,
      text: FINANCE_THEME.warningText,
      border: FINANCE_THEME.warningBorder
    };
  }

  applyRowTheme(sheet, row, HEADERS.length, theme);
}

function billVisualState(status, dueDateValue, balanceValue) {
  const statusText = String(status || "").toLowerCase();
  const balance = Number(parseAmount(balanceValue) || 0);

  if (/paid|closed/.test(statusText) || balance === 0 && /paid/.test(statusText)) {
    return "paid";
  }

  const dueDate = parseStoredDate(dueDateValue);
  if (!dueDate) return "neutral";

  const today = todayInFinanceTimezone();
  const due = startOfDay(dueDate);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "neutral";
}

function formatBillRow(sheet, row) {
  if (!sheet || row < 2) return;

  const values = sheet.getRange(row, 1, 1, BILL_HEADERS.length).getValues()[0];
  const dueDate = values[10];
  const balanceDue = values[14];
  const status = values[15];
  const state = billVisualState(status, dueDate, balanceDue);

  let theme;
  if (state === "paid") {
    theme = {
      bg: FINANCE_THEME.normalBg,
      text: FINANCE_THEME.normalText,
      border: FINANCE_THEME.normalBorder
    };
  } else if (state === "overdue") {
    theme = {
      bg: FINANCE_THEME.dangerBg,
      text: FINANCE_THEME.dangerText,
      border: FINANCE_THEME.dangerBorder
    };
  } else if (state === "soon") {
    theme = {
      bg: FINANCE_THEME.warningBg,
      text: FINANCE_THEME.warningText,
      border: FINANCE_THEME.warningBorder
    };
  } else {
    theme = {
      bg: FINANCE_THEME.neutralBg,
      text: FINANCE_THEME.neutralText,
      border: FINANCE_THEME.neutralBorder
    };
  }

  applyRowTheme(sheet, row, BILL_HEADERS.length, theme);
}

function formatAlertRow(sheet, row) {
  if (!sheet || row < 2) return;

  const values = sheet.getRange(row, 1, 1, ALERT_HEADERS.length).getValues()[0];
  const alertClass = String(values[3] || "").toLowerCase();
  const severity = String(values[4] || "").toLowerCase();
  const status = String(values[12] || "").toLowerCase();

  let theme = {
    bg: FINANCE_THEME.neutralBg,
    text: FINANCE_THEME.neutralText,
    border: FINANCE_THEME.neutralBorder
  };

  if (/resolved|closed|dismissed/.test(status)) {
    theme = {
      bg: FINANCE_THEME.normalBg,
      text: FINANCE_THEME.normalText,
      border: FINANCE_THEME.normalBorder
    };
  } else if (/critical|high/.test(severity) || /fraud|unauthorized|suspicious|overdue/.test(alertClass)) {
    theme = {
      bg: FINANCE_THEME.dangerBg,
      text: FINANCE_THEME.dangerText,
      border: FINANCE_THEME.dangerBorder
    };
  } else if (/medium/.test(severity) || /due soon|due today|failed|declined|review/.test(alertClass)) {
    theme = {
      bg: FINANCE_THEME.warningBg,
      text: FINANCE_THEME.warningText,
      border: FINANCE_THEME.warningBorder
    };
  }

  applyRowTheme(sheet, row, ALERT_HEADERS.length, theme);
}

function formatTransactionsSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return;
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    formatTransactionRow(sheet, row);
  }
}

function formatBillsSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return;
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    formatBillRow(sheet, row);
  }
}

function formatAlertsSheet(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return;
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    formatAlertRow(sheet, row);
  }
}

function ensureInitialVisualMigration(transactionSheet, billsSheet, alertsSheet) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = "VISUAL_MIGRATION_" + PARSER_VERSION;
    if (properties.getProperty(key) === "done") return;

    configureFinanceSheetLayout(transactionSheet, HEADERS.length, "transactions");
    configureFinanceSheetLayout(billsSheet, BILL_HEADERS.length, "bills");
    configureFinanceSheetLayout(alertsSheet, ALERT_HEADERS.length, "alerts");

    formatTransactionsSheet(transactionSheet);
    formatBillsSheet(billsSheet);
    formatAlertsSheet(alertsSheet);

    properties.setProperty(key, "done");
  } catch (error) {
    console.log("Initial visual migration skipped: " + error.message);
  }
}

function configureFinanceSheetLayout(sheet, columnCount, kind) {
  if (!sheet) return;

  styleHeaderRow(sheet, columnCount);
  sheet.setFrozenRows(1);

  const widths = kind === "transactions"
    ? [90, 105, 75, 95, 145, 135, 185, 220, 105, 420, 155, 165, 75, 165, 145, 90, 75, 135, 95, 240, 155, 105, 115, 110]
    : kind === "bills"
      ? [155, 95, 105, 145, 175, 165, 220, 75, 105, 150, 105, 105, 105, 105, 105, 115, 115, 145, 165, 90, 105, 420, 155, 170]
      : [155, 95, 105, 175, 95, 165, 220, 75, 105, 190, 260, 260, 105, 120, 120, 420, 90, 165];

  for (let i = 0; i < Math.min(widths.length, columnCount); i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, columnCount)
      .setVerticalAlignment("middle");
  }

  // Amounts remain plain numbers instead of forcing a currency symbol,
  // because the parser intentionally does not guess currency.
  if (kind === "transactions" && sheet.getLastRow() > 1) {
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setNumberFormat("#,##0.00");
  }
  if (kind === "bills" && sheet.getLastRow() > 1) {
    sheet.getRange(2, 12, sheet.getLastRow() - 1, 4).setNumberFormat("#,##0.00");
  }
  if (kind === "alerts" && sheet.getLastRow() > 1) {
    sheet.getRange(2, 9, sheet.getLastRow() - 1, 1).setNumberFormat("#,##0.00");
  }
}

// Optional manual refresh; normally unnecessary because new rows and daily
// bill-state changes are formatted automatically.
function refreshAllFinanceColors() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const transactionSheet = spreadsheet.getSheets()[0];
  const billsSheet = getOrCreateSheet(spreadsheet, "Bills", BILL_HEADERS);
  const alertsSheet = getOrCreateSheet(spreadsheet, "Alerts", ALERT_HEADERS);

  ensureHeaders(transactionSheet);
  ensureNamedSheetHeaders(billsSheet, BILL_HEADERS);
  ensureNamedSheetHeaders(alertsSheet, ALERT_HEADERS);

  configureFinanceSheetLayout(transactionSheet, HEADERS.length, "transactions");
  configureFinanceSheetLayout(billsSheet, BILL_HEADERS.length, "bills");
  configureFinanceSheetLayout(alertsSheet, ALERT_HEADERS.length, "alerts");

  formatTransactionsSheet(transactionSheet);
  formatBillsSheet(billsSheet);
  formatAlertsSheet(alertsSheet);
}

// ------------------------------------------------------------
// SHARED HELPERS
// ------------------------------------------------------------

function findRowById(sheet, column, id) {
  if (!id || sheet.getLastRow() < 2) return -1;

  const values = sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .getValues();

  const wanted = String(id);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || "") === wanted) return i + 2;
  }
  return -1;
}

function uniqueValues(values) {
  const seen = {};
  const output = [];
  for (let i = 0; i < values.length; i++) {
    const value = String(values[i] || "");
    if (value && !seen[value]) {
      seen[value] = true;
      output.push(value);
    }
  }
  return output;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================
// HEALTH CHECK
// ============================================================

function doGet() {
  return sendResponse({
    success: true,
    message: "Smart Finance Intelligence Engine is working",
    version: PARSER_VERSION,
    modes: ["Quick Add", "Manual Entry", "Automatic Finance SMS"],
    sheets: ["Transactions (first sheet)", "Bills", "Alerts", "Rules"],
    capabilities: [
      "Transactions",
      "Normal UPI vs Credit Card UPI",
      "Bank and last-4 detection",
      "UPI app and card-network detection",
      "Available balance / available credit extraction",
      "Bills and statements",
      "Due date and minimum due",
      "Credit limit and available credit",
      "Bill payment linking",
      "Failed/declined transaction alerts",
      "Fraud/security alerts",
      "Promotion/spam classification",
      "Local merchant learning",
      "Review queue and confidence score",
      "Optional daily due-soon and overdue maintenance"
    ]
  });
}

function sendResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
