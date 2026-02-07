// Global configuration for sheet names
const SHEET_NAMES = {
  BOATS: 'Boats',
  TARIFFS: 'Tariffs',
  BOAT_PRICES: 'BoatPrices',
  EXTRAS: 'Extras',
  RESERVATIONS: 'Reservations',
  PAYMENTS: 'Payments',
  DAILY_TRIP_OPTIONS: 'DailyTripOptions',
  FOOD_OPTIONS: 'FoodOptions',
  DAILY_TRAVELS: 'DailyTravels',
  TRAVEL_CONFIG: 'TravelConfig',
  MOORINGS: 'Moorings', // NEW: Sheet for mooring system
  RESTAURANT: 'Restaurant' // NEW: Sheet for the restaurant system
};

// Column headers for each sheet
const HEADERS = {
  [SHEET_NAMES.BOATS]: ['Boat Unique ID', 'Boat Name', 'Boat Model'],
  [SHEET_NAMES.TARIFFS]: ['Tariff Name', 'Start Date', 'End Date'],
  [SHEET_NAMES.BOAT_PRICES]: ['Boat Model', 'Tariff Name', 'Price Normal Night', 'Price Weekend Night'],
  [SHEET_NAMES.MOORINGS]: [
  'Mooring ID', 'Client Name', 'Client Phone', 'Client Email', 'Boat Name',
  'Boat Length', 'Place', 'Payment Status', 'Insurance Paid',
  'Next Payment Date', 'Value', 'Notes', 'Recorded By', 'Last Updated'
  ],
  [SHEET_NAMES.EXTRAS]: ['Extra Name', 'Price', 'Unit (per day/per booking)'],
  [SHEET_NAMES.RESERVATIONS]: [
    'Reservation ID', 'Client Name', 'Client Phone', 'Client Email',
    'Boat Unique ID', 'Boat Name (auto)', 'Boat Model (auto)',
    'Check-in Date', 'Check-in Time', 'Check-out Date', 'Check-out Time',
    'Number of Nights', 'Normal Nights', 'Weekend Nights',
    'Unit Price Normal Night', 'Total Normal Night Cost',
    'Unit Price Weekend Night', 'Total Weekend Night Cost',
    'Extras Booked (JSON)',
    'Discount Percentage',
    'Tax Value',
    'Base Boat Cost', 'Extras Cost', 'Subtotal',
    'Tax Amount Applied',
    'Amount With Tax Before Discount',
    'Discount Amount',
    'Total Cost',
    'Total Paid',
    'Amount Due',
    'Status', 'Reservation Source',
    'Reservation Date', 'Recorded By', 'Notes'
  ],
  [SHEET_NAMES.PAYMENTS]: [
    'Payment ID', 'Booking ID', 'Payment Date', 'Payment Amount',
    'Payment Method', 'Payment Notes', 'Recorded By (auto)'
  ],
  [SHEET_NAMES.DAILY_TRIP_OPTIONS]: ['Trip Name', 'Price Per Adult', 'Price Per Kid', 'Price Per Senior', 'Duration (hours)'],
  [SHEET_NAMES.FOOD_OPTIONS]: ['Option Name', 'Price', 'Description'],
  [SHEET_NAMES.DAILY_TRAVELS]: [
      'Travel ID', 'Client Name', 'Client Phone', 'Client Email', 'Travel Date', 'Travel Time', 'Trip Name',
      'Adults', 'Kids', 'Seniors', 'Food Options (JSON)', 'Trip Base Cost', 'Food Cost',
      'Subtotal', 'Discount Percentage', 'Discount Amount', 'Tax Percentage', 'Tax Amount', 'Total Cost',
      'Total Paid', 'Amount Due', 'Status', 'Notes', 'Recorded By', 'Booking Date'
  ],
   [SHEET_NAMES.TRAVEL_CONFIG]: ['Travel ID', 'Client Name', 'Travel Date', 'Travel Time', 'Trip Name', 'Total Cost', 'Notes', 'Recorded By', 'Booking Date'],
   [SHEET_NAMES.RESTAURANT]: [ // NEW: Headers for the restaurant sheet
    'Reservation ID', 'Client Name', 'Client Phone', 'Client Email', 
    'Number of People', 'Reservation Date', 'Reservation Hour', 'Status', 
    'Notes', 'Recorded By', 'Last Updated'
  ]
};

// --- Date/Time Helper Functions ---
function parseDateTimeToUTCDate(dateInput, timeStr) {
  try {
    let dateString;
    if (dateInput instanceof Date) {
      // If it's already a Date object, format it to a consistent string format
      dateString = Utilities.formatDate(dateInput, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (typeof dateInput === 'string') {
      dateString = dateInput.trim();
    } else {
      Logger.log(`parseDateTimeToUTCDate: dateInput is neither a Date object nor a string. Type: ${typeof dateInput}, Value: ${dateInput}`);
      return null;
    }

    if (!dateString || !timeStr) {
      Logger.log(`parseDateTimeToUTCDate: Missing date or time string. Date: ${dateString}, Time: ${timeStr}`);
      return null;
    }

    // --- FIX: Handle M/D/YYYY format from Google Sheets ---
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3 && parts[2].length === 4) { // Assumes M/D/YYYY
            dateString = `${parts[2]}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
        } else if (parts.length === 3 && parts[0].length === 4) { // YYYY/MM/DD
             dateString = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        }
    }
    // --- END OF FIX ---
    
    const dateParts = dateString.split('-');
    const timeParts = timeStr.split(':');

    if (dateParts.length !== 3 || timeParts.length < 2) {
      Logger.log(`parseDateTimeToUTCDate: Invalid date or time format. Date: ${dateString}, Time: ${timeStr}`);
      return null;
    }
    
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS month is 0-indexed
    const day = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts.length === 3 ? parseInt(timeParts[2], 10) : 0;

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds) || month < 0 || month > 11 || day < 1 || day > 31 ) {
      Logger.log(`parseDateTimeToUTCDate: One or more date/time components are NaN or out of range. Y:${year}, M:${month}, D:${day}, H:${hours}, Min:${minutes}, S:${seconds}. Original DateStr: ${dateString}`);
      return null;
    }

    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (isNaN(utcDate.getTime())) {
        Logger.log(`parseDateTimeToUTCDate: Resulting UTC Date object is invalid. Original DateStr: ${dateString}, TimeStr: ${timeStr}`);
        return null;
    }
    return utcDate;
  } catch (e) {
    Logger.log(`parseDateTimeToUTCDate: Exception during parsing. DateInput: ${String(dateInput).substring(0,100)}, Time: ${timeStr}. Error: ${e.toString()}`);
    return null;
  }
}

const formatDateField_hoisted = (dateField, fieldName) => {
    try {
        if (dateField instanceof Date) {
            if (isNaN(dateField.getTime())) {
                Logger.log(`formatDateField_hoisted: Received Invalid Date object for ${fieldName}. Value: ${dateField}`);
                return "Invalid Date Obj";
            }
            return Utilities.formatDate(dateField, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else if (dateField && typeof dateField === 'string' && dateField.trim() !== "") {
            // UPDATED: Handle M/D/YYYY and MM/DD/YYYY
            let parsedDate = new Date(dateField.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2')); 
            if (isNaN(parsedDate.getTime())) {
                 // Fallback for YYYY-MM-DD
                 parsedDate = new Date(dateField);
            }
            if (!isNaN(parsedDate.getTime())) {
                return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
            }
            Logger.log(`formatDateField_hoisted: Failed to parse date string for ${fieldName}. Value: "${dateField}"`);
            return dateField; 
        }
        return null;
    } catch (formatError) {
        Logger.log(`formatDateField_hoisted: CRITICAL EXCEPTION for field "${fieldName}", value "${String(dateField).substring(0,100)}": ${formatError.toString()}`);
        return `Error formatting ${fieldName}`;
    }
};

const formatTimeValue_hoisted = (timeField, fieldName) => {
  try {
    if (timeField instanceof Date) {
      if (isNaN(timeField.getTime())) return "00:00";
      return Utilities.formatDate(timeField, Session.getScriptTimeZone(), "HH:mm");
    } else if (typeof timeField === 'string') {
      const trimmedTimeField = timeField.trim();
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedTimeField)) return trimmedTimeField.substring(0,5);
      const parsedDate = new Date(`1970-01-01T${trimmedTimeField}Z`);
      if (!isNaN(parsedDate.getTime())) return Utilities.formatDate(parsedDate, "UTC", "HH:mm");
      return "00:00";
    }
    return null;
  } catch (formatError) {
    Logger.log(`formatTimeValue_hoisted: CRITICAL EXCEPTION for field "${fieldName}", value "${String(timeField)}": ${formatError.toString()}`);
    return "ErrorTime";
  }
};

/**
 * Calculates the total, normal, and weekend nights between two dates.
 * @param {string | Date} checkInDate - The check-in date.
 * @param {string | Date} checkOutDate - The check-out date.
 * @returns {{totalNights: number, normalNightsCount: number, weekendNightsCount: number}}
 */
function _calculateNights(checkInDate, checkOutDate) {
    const coDateOnly = _parseToDateObject(checkOutDate);
    const ciDateOnly = _parseToDateObject(checkInDate);
    
    if (!coDateOnly || !ciDateOnly || coDateOnly <= ciDateOnly) {
        // Handle same-day bookings if needed, otherwise return 0
        if (coDateOnly === ciDateOnly) {
           const dayOfWeek = new Date(ciDateOnly).getUTCDay();
           if (dayOfWeek === 5 || dayOfWeek === 6) return { totalNights: 1, normalNightsCount: 0, weekendNightsCount: 1 };
           return { totalNights: 1, normalNightsCount: 1, weekendNightsCount: 0 };
        }
        return { totalNights: 0, normalNightsCount: 0, weekendNightsCount: 0 };
    }

    let currentDateIter = new Date(ciDateOnly);
    let totalNights = 0;
    let weekendNightsCount = 0;
    let normalNightsCount = 0;
    
    while (currentDateIter.getTime() < coDateOnly) {
        const dayOfWeek = currentDateIter.getUTCDay();
        // Friday (5) and Saturday (6) nights are weekend nights
        if (dayOfWeek === 5 || dayOfWeek === 6) { 
            weekendNightsCount++;
        } else {
            normalNightsCount++;
        }
        totalNights++;
        currentDateIter.setUTCDate(currentDateIter.getUTCDate() + 1);
    }

    return { totalNights, normalNightsCount, weekendNightsCount };
}

function formatDateForPdfDisplay(dateStr, lang = 'en') {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
        const dateObj = new Date(dateStr.replace(/-/g, '/'));
        if (isNaN(dateObj.getTime())) return dateStr;
        return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
    } catch (e) {
        Logger.log(`formatDateForPdfDisplay Error: ${e.toString()} for dateStr: ${dateStr}`);
        return dateStr;
    }
}

function groupReservationsByDate(reservations, dateFieldKey, timeFieldKey) {
  const grouped = {};
  if (!Array.isArray(reservations)) return grouped;

  reservations.forEach(res => {
    let dateStr = res[dateFieldKey];
    if (dateStr instanceof Date) {
      dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // UPDATED: Handle M/D/YYYY
        if (parts.length === 3 && parts[2].length === 4) { 
             dateStr = `${parts[2]}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
        }
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(res);
  });

  for (const date in grouped) {
    grouped[date].sort((a, b) => {
      const timeA = formatTimeValue_hoisted(a[timeFieldKey], 'sort time A') || "00:00";
      const timeB = formatTimeValue_hoisted(b[timeFieldKey], 'sort time B') || "00:00";
      return timeA.localeCompare(timeB);
    });
  }
  return grouped;
}

/**
 * [UPDATED] A robust function to parse various date inputs into a UTC time value (milliseconds).
 * Handles Date objects, 'YYYY-MM-DD' strings, and 'M/D/YYYY' strings from Sheets.
 * Returns a number representing the milliseconds for the start of the day in UTC.
 */
function _parseToDateObject(dateInput) {
  if (!dateInput) return null;

  // 1. If it's already a valid Date object
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate());
  }

  // 2. Handle numbers (assume they are milliseconds)
  if (typeof dateInput === 'number') {
    return dateInput;
  }

  if (typeof dateInput !== 'string') {
    return null;
  }

  const dateStr = dateInput.trim();
  if (!dateStr) return null;

  // 3. Handle ISO strings (e.g., from Cache JSON.stringify)
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }

  // 4. Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  // 5. Handle M/D/YYYY or MM/DD/YYYY or D/M/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2], 10);
      let month = parseInt(parts[0], 10);
      let day = parseInt(parts[1], 10);
      
      // Basic heuristic: if first part > 12, it's likely D/M/YYYY
      if (month > 12) {
        [month, day] = [day, month];
      }
      
      const d = Date.UTC(year, month - 1, day);
      if (!isNaN(d)) return d;
    }
  }

  // Fallback for any other string format new Date() might handle
  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    return Date.UTC(fallbackDate.getUTCFullYear(), fallbackDate.getUTCMonth(), fallbackDate.getUTCDate());
  }

  Logger.log(`_parseToDateObject: Failed to parse: "${dateInput}"`);
  return null;
}


// --- Invoice/Report Translation Helper ---
const PDF_STRINGS = {
  en: {
    invoice_header: "BREAKDOWN",
    invoice_date_issued: "Date Issued:",
    invoice_item_desc: "Description", invoice_item_qty: "Quantity/Nights", invoice_item_unit_price: "Unit Price (€)", invoice_item_total: "Total (€)",
    invoice_subtotal: "Subtotal (Boat + Extras):", invoice_tax_applied: "Tax Applied:", invoice_total_before_discount: "Total Before Discount:", invoice_discount: "Discount",
    invoice_payments_made: "Payments Made:", invoice_amount_paid_on: "Amount Paid on", invoice_total_due: "TOTAL DUE:",
    invoice_item_boat_normal_nights: "{{boatName}} - Normal Nights",
    invoice_item_boat_weekend_nights: "{{boatName}} - Weekend Nights",
    invoice_item_boat_rental_generic: "{{boatName}} - Rental ({{numNights}} night(s))",
    invoice_check_in_datetime_label: "Check-in:",
    invoice_check_out_datetime_label: "Check-out:",
    invoice_total_nights_suffix: "total night(s)", invoice_calculated: "Calculated", invoice_extra_prefix: "Extra",
    report_header: "Reservation Report", report_period: "Week of", report_checkins_header: "Check in", report_checkouts_header: "Check out", report_client_name: "Observations", report_boat_name: "Boat", report_checkin_datetime: "Check-in Date/Time", report_checkout_datetime: "Check-out Date/Time", report_extras_booked: "Extras", report_none: "None", report_error_parsing_extras: "Error parsing extras", report_generated_on: "Report generated on", report_nights: "Nights", report_recorded_by: "Recorded By", report_date_col: "Date", report_day_col: "Day", report_time_col: "Time",
    report_daily_travels_header: "Daily Travels Schedule", report_travel_client: "Client", report_travel_trip: "Trip", report_travel_passengers: "Passengers",
    report_financial_header: "Financial Report", 
    report_financial_period: "Period:", 
    report_financial_type: "Type", 
    report_financial_amount: "Amount (€)", 
    report_financial_daily_total: "Daily Total:", 
    report_financial_grand_total: "Grand Total:", 
    report_financial_type_boat: "House Boat", 
    report_financial_type_travel: "Daily Travel", 
    report_financial_no_transactions: "No transactions recorded in this period.",
    unit_per_day: "per day", unit_per_booking: "per booking",
    boats_list_header: "Available Boats", boats_list_boat_name: "Boat Name", boats_list_boat_model: "Model", boats_list_generated_on: "List generated on",
    tariffs_brochure_header: "Our Tariffs", tariffs_brochure_tariff_period: "Tariff Period", tariffs_brochure_boat_model: "Boat Model", tariffs_brochure_price_normal_night: "Price/Normal Night (€)", tariffs_brochure_price_weekend_night: "Price/Weekend Night (€)",
    tariffs_brochure_row_normal_night_label: "Normal Night (Week)",
    tariffs_brochure_row_weekend_night_label: "Weekend Night",
    tariffs_brochure_no_prices_for_model: "No specific prices listed for this model under this tariff.", tariffs_brochure_generated_on: "Brochure generated on",
    extras_list_header: "Optional Extras", extras_list_extra_name: "Extra", extras_list_price: "Price (€)", extras_list_unit: "Unit", extras_list_generated_on: "List generated on",
    payments_modal_title: "Manage Payments for Reservation {{id}}", payments_total_cost: "Total Cost:", payments_total_paid: "Total Paid:", payments_amount_due: "Amount Due:", payments_add_new: "Add New Payment", payments_date: "Date", payments_amount: "Amount (€)", payments_method: "Method", payments_method_cash: "Cash", payments_method_card: "Card", payments_method_transfer: "Bank Transfer", payments_method_other: "Other", payments_no_payments_recorded: "No payments recorded yet.", payments_history: "Payment History", payments_action_delete: "Delete Payment", payments_confirm_delete: "Are you sure you want to delete this payment of {{amount}} on {{date}}?",
    newReservation_initialPaymentAmount: "Initial Payment Amount (€)", newReservation_initialPaymentMethod: "Initial Payment Method",
    travel_invoice_header: "Travel Breakdown", travel_invoice_id: "Travel ID:", travel_invoice_date: "Date:", travel_invoice_at_time: "at", travel_invoice_trip_base_cost: "Trip Base Cost", travel_invoice_food_cost: "Food Options", travel_invoice_subtotal: "Subtotal", travel_invoice_tax: "Tax",
  },
  pt: {
    invoice_header: "DETALHE DA RESERVA",
    invoice_date_issued: "Data de Emissão:",
    invoice_item_desc: "Descrição", invoice_item_qty: "Quantidade/Noites", invoice_item_unit_price: "Preço Unit. (€)", invoice_item_total: "Total (€)",
    invoice_subtotal: "Subtotal (Barco + Extras):", invoice_tax_applied: "Imposto Aplicado:", invoice_total_before_discount: "Total Antes Desconto:", invoice_discount: "Desconto",
    invoice_payments_made: "Pagamentos Efetuados:", invoice_amount_paid_on: "Valor Pago em", invoice_total_due: "TOTAL A PAGAR:",
    invoice_item_boat_normal_nights: "{{boatName}} - Noites Normais",
    invoice_item_boat_weekend_nights: "{{boatName}} - Noites Fim de Semana",
    invoice_item_boat_rental_generic: "{{boatName}} - Aluguer ({{numNights}} noite(s))",
    invoice_check_in_datetime_label: "Check-in:",
    invoice_check_out_datetime_label: "Check-out:",
    invoice_total_nights_suffix: "total de noite(s)", invoice_calculated: "Calculado", invoice_extra_prefix: "Extra",
    report_header: "Relatório de Reservas", report_period: "Semana de", report_checkins_header: "Check in", report_checkouts_header: "Check out", report_client_name: "Observações", report_boat_name: "Barco", report_checkin_datetime: "Data/Hora Check-in", report_checkout_datetime: "Data/Hora Check-out", report_extras_booked: "Extras", report_none: "Nenhum", report_error_parsing_extras: "Erro ao processar extras", report_generated_on: "Relatório gerado em", report_nights: "Estadia", report_recorded_by: "Registado Por", report_date_col: "Data", report_day_col: "Dia", report_time_col: "Hora",
    report_daily_travels_header: "Agenda de Passeios Diários", report_travel_client: "Cliente", report_travel_trip: "Passeio", report_travel_passengers: "Passageiros",
    report_financial_header: "Relatório Financeiro", 
    report_financial_period: "Período:", 
    report_financial_type: "Tipo", 
    report_financial_amount: "Valor (€)", 
    report_financial_daily_total: "Total do Dia:", 
    report_financial_grand_total: "Total Geral:", 
    report_financial_type_boat: "Barco Casa", 
    report_financial_type_travel: "Passeio Diário", 
    report_financial_no_transactions: "Nenhuma transação registada neste período.",
    unit_per_day: "por dia", unit_per_booking: "por reserva",
    boats_list_header: "Barcos Disponíveis", boats_list_boat_name: "Nome do Barco", boats_list_boat_model: "Modelo", boats_list_generated_on: "Lista gerada em",
    tariffs_brochure_header: "Nossas Tarifas", tariffs_brochure_tariff_period: "Período Tarifário", tariffs_brochure_boat_model: "Modelo do Barco", tariffs_brochure_price_normal_night: "Preço/Noite Normal (€)", tariffs_brochure_price_weekend_night: "Preço/Noite Fim de Semana (€)",
    tariffs_brochure_row_normal_night_label: "Noite de Semana",
    tariffs_brochure_row_weekend_night_label: "Noite Fim de Semana",
    tariffs_brochure_no_prices_for_model: "Nenhum preço específico listado para este modelo nesta tarifa.", tariffs_brochure_generated_on: "Folheto gerado em",
    extras_list_header: "Extras Opcionais", extras_list_extra_name: "Extra", extras_list_price: "Preço (€)", extras_list_unit: "Unidade", extras_list_generated_on: "Lista gerada em",
    payments_modal_title: "Gerir Pagamentos da Reserva {{id}}", payments_total_cost: "Custo Total:", payments_total_paid: "Total Pago:", payments_amount_due: "Valor em Dívida:", payments_add_new: "Adicionar Novo Pagamento", payments_date: "Data", payments_amount: "Valor (€)", payments_method: "Método", payments_method_select: "Selecione o Método...", payments_notes: "Notas", payments_method_cash: "Dinheiro", payments_method_card: "Cartão", payments_method_transfer: "Transferência Bancária", payments_method_other: "Outro", payments_no_payments_recorded: "Nenhum pagamento registado.", payments_history: "Histórico de Pagamentos", payments_action_delete: "Eliminar Pagamento", payments_confirm_delete: "Tem a certeza que quer eliminar este pagamento de {{amount}} na data {{date}}?",
    newReservation_initialPaymentAmount: "Valor Pagamento Inicial (€)", newReservation_initialPaymentMethod: "Método Pagamento Inicial",
    travel_invoice_header: "Detalhe do Passeio", travel_invoice_id: "ID do Passeio:", travel_invoice_date: "Data:", travel_invoice_at_time: "às", travel_invoice_trip_base_cost: "Custo Base do Passeio", travel_invoice_food_cost: "Opções de Comida", travel_invoice_subtotal: "Subtotal", travel_invoice_tax: "Imposto",
  }
};

function _s(key, lang = 'en', params = {}) {
  let text = PDF_STRINGS[lang]?.[key] || PDF_STRINGS.en?.[key] || key;
  for (const p in params) {
    text = text.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
  }
  return text;
}

// --- Spreadsheet Management ---
function setupSpreadsheet() {
  Logger.log("setupSpreadsheet: Called.");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  try {
    for (const sheetNameKey in SHEET_NAMES) {
      const sheetName = SHEET_NAMES[sheetNameKey];
      const headers = HEADERS[sheetName];
      if (!headers) {
        Logger.log(`setupSpreadsheet: No headers defined for sheet name key "${sheetNameKey}". Skipping.`);
        continue;
      }
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
      let headersMatch = headers.length === currentHeaders.filter(String).length && headers.every((h, i) => h === currentHeaders[i]);

      if (!headersMatch || sheet.getLastRow() === 0) {
        if(sheet.getLastRow() > 0) sheet.getRange(1, 1, 1, sheet.getMaxColumns()).clearContent();
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        Logger.log(`setupSpreadsheet: Headers set/reset for sheet "${sheetName}".`);
      }
      
      // NEW: Add data validation for Mooring Status and Insurance
      if (sheetName === SHEET_NAMES.MOORINGS && sheet.getMaxRows() > 1) {
        const paymentStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Paid', 'Due', 'Overdue'], true).build();
        const insuranceRule = SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).build();
        sheet.getRange('H2:H').setDataValidation(paymentStatusRule); // Payment Status column
        sheet.getRange('I2:I').setDataValidation(insuranceRule);   // Insurance Paid column
      }
    }
    addDefaultDataIfEmpty(SHEET_NAMES.DAILY_TRIP_OPTIONS, [
      ['Alqueva Lake Tour', 25, 15, 20, 2],
      ['Sunset Cruise', 35, 20, 30, 2.5]
    ]);
    addDefaultDataIfEmpty(SHEET_NAMES.FOOD_OPTIONS, [
      ['None', 0, 'No food included'],
      ['Snack Box', 8.50, 'Includes chips, a sandwich, and a drink'],
      ['Premium Lunch', 22.00, 'Full meal with appetizer, main course, and dessert']
    ]);

    ui.alert('Spreadsheet Setup Complete', 'All required sheets and headers have been checked/created.', ui.ButtonSet.OK);
  } catch (e) {
    Logger.log(`Error in setupSpreadsheet: ${e.toString()} \nStack: ${e.stack}`);
    ui.alert('Setup Failed', `An error occurred: ${e.message}. Check logs.`, ui.ButtonSet.OK);
  }
}

function addDefaultDataIfEmpty(sheetName, defaultData) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() < 2) { // Only headers exist
        sheet.getRange(2, 1, defaultData.length, defaultData[0].length).setValues(defaultData);
        Logger.log(`Added default data to "${sheetName}".`);
    }
}

/**
 * BigCache Utility: Handles data larger than 100KB by splitting into chunks.
 */
const BigCache = {
  MAX_CHUNK_SIZE: 90000, // 90KB to be safe

  put: function(cache, key, value, duration) {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (jsonValue.length < this.MAX_CHUNK_SIZE) {
      cache.put(key, jsonValue, duration);
      cache.remove(key + "_chunks");
      return;
    }

    const chunks = [];
    for (let i = 0; i < jsonValue.length; i += this.MAX_CHUNK_SIZE) {
      chunks.push(jsonValue.substring(i, i + this.MAX_CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      cache.put(key + "_chunk_" + index, chunk, duration + 60);
    });
    cache.put(key + "_chunks", chunks.length.toString(), duration);
  },

  get: function(cache, key) {
    const numChunks = cache.get(key + "_chunks");
    if (!numChunks) return cache.get(key);

    let fullValue = "";
    for (let i = 0; i < parseInt(numChunks); i++) {
      const chunk = cache.get(key + "_chunk_" + i);
      if (chunk === null) return null; // Missing chunk
      fullValue += chunk;
    }
    return fullValue;
  },

  remove: function(cache, key) {
    const numChunks = cache.get(key + "_chunks");
    if (numChunks) {
      for (let i = 0; i < parseInt(numChunks); i++) {
        cache.remove(key + "_chunk_" + i);
      }
      cache.remove(key + "_chunks");
    }
    cache.remove(key);
  }
};

/**
 * Fetches data from a sheet with caching to improve performance.
 */
function getData(sheetName, forceRefresh = false) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "DATA_" + sheetName.replace(/\s/g, "_");
  
  if (!forceRefresh) {
    const cached = BigCache.get(cache, cacheKey);
    if (cached) {
      Logger.log(`getData: Returning cached data for ${sheetName}`);
      return JSON.parse(cached);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`getData: Sheet not found: ${sheetName}`);
    return null;
  }
  const definedHeaders = HEADERS[sheetName];
  if (!definedHeaders) {
    Logger.log(`getData: Headers not defined for sheet: ${sheetName}`);
    throw new Error(`Headers not defined for sheet: ${sheetName}`);
  }
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) {
    Logger.log(`getData: No data found in sheet "${sheetName}" (or only headers).`);
    return [];
  }
  const actualHeaderRow = values[0];
  const data = [];
  
  // Cache header indices for this run
  const headerIndexMap = {};
  definedHeaders.forEach(headerName => {
    headerIndexMap[headerName] = actualHeaderRow.indexOf(headerName);
  });

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowObject = {};
    let hasAnyData = false;
    definedHeaders.forEach(headerName => {
      const colIndex = headerIndexMap[headerName];
      if (colIndex !== -1 && colIndex < row.length) {
        rowObject[headerName] = row[colIndex];
        if (row[colIndex] !== "" && row[colIndex] !== null && row[colIndex] !== undefined) {
            hasAnyData = true;
        }
      } else {
        rowObject[headerName] = null;
      }
    });

    if (hasAnyData) {
      data.push(rowObject);
    }
  }

  // Cache for 10 minutes (600 seconds) using BigCache
  try {
    BigCache.put(cache, cacheKey, data, 600);
  } catch (e) {
    Logger.log(`Cache error for ${sheetName}: ${e.message}`);
  }

  Logger.log(`getData: Processed ${data.length} valid rows from sheet "${sheetName}".`);
  return data;
}

/**
 * Combined startup function to reduce round-trips.
 */
function getStartupData() {
  Logger.log("getStartupData: Aggregating all essential data.");
  try {
    const appData = getInitialAppData();
    const dashboardData = getDashboardData();
    
    return {
      success: true,
      appData: appData,
      dashboardData: dashboardData,
      cacheVersion: _getGlobalCacheVersion(),
      timestamp: Date.now()
    };
  } catch (e) {
    Logger.log(`Error in getStartupData: ${e.toString()}`);
    return { success: false, error: e.message };
  }
}

/**
 * Invalidates cache for a specific sheet and increments the global version.
 */
function invalidateSheetCache(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "DATA_" + sheetName.replace(/\s/g, "_");
  BigCache.remove(cache, cacheKey);
  
  // Also invalidate high-level processed caches
  if (sheetName === SHEET_NAMES.RESERVATIONS) BigCache.remove(cache, "PROCESSED_RESERVATIONS");
  if (sheetName === SHEET_NAMES.DAILY_TRAVELS) BigCache.remove(cache, "PROCESSED_TRAVELS");
  if (sheetName === SHEET_NAMES.BOATS || sheetName === SHEET_NAMES.EXTRAS) {
     cache.remove("INITIAL_APP_DATA");
  }
  
  // Increment global version for cross-user sync
  _incrementGlobalCacheVersion();
  
  Logger.log(`Cache invalidated for ${sheetName} and version incremented.`);
}

/**
 * Gets the current global cache version from script properties.
 */
function _getGlobalCacheVersion() {
  try {
    const props = PropertiesService.getScriptProperties();
    let v = props.getProperty('GLOBAL_CACHE_VER');
    if (!v) {
      v = Date.now().toString();
      props.setProperty('GLOBAL_CACHE_VER', v);
    }
    return v;
  } catch (e) {
    return Date.now().toString();
  }
}

/**
 * Increments the global cache version.
 */
function _incrementGlobalCacheVersion() {
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('GLOBAL_CACHE_VER', Date.now().toString());
  } catch (e) {}
}

function appendData(sheetName, dataObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sheet not found: ${sheetName}` };
  const headers = HEADERS[sheetName];
  if (!headers) return { success: false, message: `Headers not defined for sheet: ${sheetName}` };
  const newRow = headers.map(header => dataObject[header] !== undefined ? dataObject[header] : '');
  try {
    sheet.appendRow(newRow);
    SpreadsheetApp.flush(); 
    invalidateSheetCache(sheetName); // Invalidate cache after modification
    return { success: true };
  } catch (e) {
    Logger.log(`Error appending data to ${sheetName}: ${e.toString()}`);
    return { success: false, message: `Failed to append data: ${e.message}` };
  }
}

function updateData(sheetName, identifierHeader, identifierValue, updatedData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sheet not found: ${sheetName}` };
  const headers = HEADERS[sheetName];
  if (!headers) return { success: false, message: `Headers not defined for sheet: ${sheetName}` };
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headerRow = values[0];
  const identifierColIndex = headerRow.indexOf(identifierHeader);
  if (identifierColIndex === -1) return { success: false, message: `ID header "${identifierHeader}" not found in "${sheetName}".` };
  let rowIndexToUpdate = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][identifierColIndex]) === String(identifierValue)) {
      rowIndexToUpdate = i;
      break;
    }
  }
  if (rowIndexToUpdate === -1) return { success: false, message: `Row with ${identifierHeader} "${identifierValue}" not found.` };
  const updatedRowValues = [...values[rowIndexToUpdate]];
  for (const key in updatedData) {
    if (updatedData.hasOwnProperty(key)) {
      const headerIndex = headerRow.indexOf(key);
      if (headerIndex !== -1) {
        updatedRowValues[headerIndex] = updatedData[key];
      } else {
        Logger.log(`Warning: Update key "${key}" not found in headers for sheet "${sheetName}".`);
      }
    }
  }
  try {
    sheet.getRange(rowIndexToUpdate + 1, 1, 1, updatedRowValues.length).setValues([updatedRowValues]);
    SpreadsheetApp.flush(); 
    invalidateSheetCache(sheetName); // Invalidate cache after modification
    return { success: true };
  } catch (e) {
    Logger.log(`Error updating row in ${sheetName}: ${e.toString()}`);
    return { success: false, message: `Failed to update data: ${e.message}` };
  }
}

function deleteData(sheetName, identifierHeader, identifierValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sheet not found: ${sheetName}` };
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headerRow = values[0];
  const identifierColIndex = headerRow.indexOf(identifierHeader);
  
  if (identifierColIndex === -1) return { success: false, message: `ID header "${identifierHeader}" not found.` };
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][identifierColIndex]) === String(identifierValue)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      invalidateSheetCache(sheetName);
      return { success: true };
    }
  }
  return { success: false, message: `Row with ${identifierHeader} "${identifierValue}" not found.` };
}

// --- NEW: MOORING SYSTEM FUNCTIONS ---

/**
 * Fetches and processes all data from the Moorings sheet.
 * @returns {object} An object containing the mooring data or an error.
 */
function getMooringsData() {
  Logger.log("getMooringsData: Fetching all mooring records.");
  try {
    const rawData = getData(SHEET_NAMES.MOORINGS);
    if (!Array.isArray(rawData)) {
      return { success: false, moorings: [], error: `Could not fetch mooring data.` };
    }
    const moorings = rawData.map(m => ({
      mooringId: m['Mooring ID'],
      clientName: m['Client Name'],
      clientPhone: m['Client Phone'],
      clientEmail: m['Client Email'],
      boatName: m['Boat Name'],
      boatLength: m['Boat Length'],
      place: m['Place'],
      paymentStatus: m['Payment Status'],
      insurancePaid: m['Insurance Paid'],
      nextPaymentDate: formatDateField_hoisted(m['Next Payment Date'], 'nextPaymentDate'),
      value: m['Value'],
      notes: m['Notes'],
      recordedBy: m['Recorded By'],
      // UPDATED: Ensure 'Last Updated' is always a string before sending to client
      lastUpdated: m['Last Updated'] instanceof Date ? Utilities.formatDate(m['Last Updated'], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : m['Last Updated']
    }));
    Logger.log(`getMooringsData: Successfully fetched ${moorings.length} records.`);
    return { success: true, moorings: moorings };
  } catch(e) {
    Logger.log(`Error in getMooringsData: ${e.toString()}`);
    return { success: false, moorings: [], error: e.message };
  }
}

/**
 * Saves (adds or updates) a mooring record.
 * @param {object} mooringDetails - The details of the mooring record to save.
 * @param {string|null} mooringIdToUpdate - The ID of the mooring to update, or null for a new record.
 * @returns {object} A result object indicating success or failure.
 */
function saveMooring(mooringDetails, mooringIdToUpdate = null) {
  Logger.log("saveMooring: Called. Mode: " + (mooringIdToUpdate ? "UPDATE" : "NEW"));
  try {
    const isUpdate = !!mooringIdToUpdate;
    const mooringId = isUpdate ? mooringIdToUpdate : `MOOR-${Date.now()}`;
    const currentUser = getUserEmail();
    
    const sheetRowData = {
      'Mooring ID': mooringId,
      'Client Name': mooringDetails.clientName,
      'Client Phone': mooringDetails.clientPhone,
      'Client Email': mooringDetails.clientEmail,
      'Boat Name': mooringDetails.boatName,
      'Boat Length': mooringDetails.boatLength,
      'Place': mooringDetails.place,
      'Payment Status': mooringDetails.paymentStatus,
      'Insurance Paid': mooringDetails.insurancePaid,
      'Next Payment Date': formatDateField_hoisted(mooringDetails.nextPaymentDate, 'nextPaymentDate'),
      'Value': mooringDetails.value,
      'Notes': mooringDetails.notes,
      'Recorded By': isUpdate ? mooringDetails.recordedBy : currentUser, // Preserve original recorder on update
      'Last Updated': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    };
    
    let operationResult;
    if (isUpdate) {
      operationResult = updateData(SHEET_NAMES.MOORINGS, 'Mooring ID', mooringIdToUpdate, sheetRowData);
    } else {
      operationResult = appendData(SHEET_NAMES.MOORINGS, sheetRowData);
    }
    
    return operationResult;
  } catch (e) {
    Logger.log(`CRITICAL Error in saveMooring: ${e.toString()}`);
    return { success: false, message: `Server error: ${e.message}` };
  }
}

/**
 * Deletes a mooring record from the sheet.
 * @param {string} mooringId - The ID of the mooring record to delete.
 * @returns {object} A result object indicating success or failure.
 */
function deleteMooring(mooringId) {
  Logger.log(`deleteMooring: ID: ${mooringId}`);
  try {
    if (!mooringId) return { success: false, message: "Missing Mooring ID." };
    return deleteData(SHEET_NAMES.MOORINGS, 'Mooring ID', mooringId);
  } catch (e) {
    Logger.log(`Error in deleteMooring: ${e.toString()}`);
    return { success: false, message: `Server error: ${e.message}` };
  }
}

/**
 * Fetches and processes all data from the Restaurant sheet.
 * @returns {object} An object containing the restaurant reservation data or an error.
 */
function getRestaurantReservations() {
  Logger.log("getRestaurantReservations: Fetching all restaurant records.");
  try {
    const rawData = getData(SHEET_NAMES.RESTAURANT);
    if (!Array.isArray(rawData)) {
      return { success: false, reservations: [], error: `Could not fetch restaurant data.` };
    }
    const reservations = rawData.map(r => ({
      reservationId: r['Reservation ID'],
      clientName: r['Client Name'],
      clientPhone: r['Client Phone'],
      clientEmail: r['Client Email'],
      numPeople: r['Number of People'],
      reservationDate: formatDateField_hoisted(r['Reservation Date'], 'reservationDate'),
      reservationHour: formatTimeValue_hoisted(r['Reservation Hour'], 'reservationHour'),
      status: r['Status'],
      notes: r['Notes'],
      recordedBy: r['Recorded By'],
      lastUpdated: r['Last Updated'] instanceof Date ? Utilities.formatDate(r['Last Updated'], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : r['Last Updated']
    }));
    Logger.log(`getRestaurantReservations: Successfully fetched ${reservations.length} records.`);
    return { success: true, reservations: reservations };
  } catch(e) {
    Logger.log(`Error in getRestaurantReservations: ${e.toString()}`);
    return { success: false, reservations: [], error: e.message };
  }
}

/**
 * Saves (adds or updates) a restaurant reservation.
 * @param {object} details - The details of the reservation to save.
 * @param {string|null} idToUpdate - The ID of the reservation to update, or null for a new record.
 * @returns {object} A result object indicating success or failure.
 */
function saveRestaurantReservation(details, idToUpdate = null) {
  Logger.log("saveRestaurantReservation: Called. Mode: " + (idToUpdate ? "UPDATE" : "NEW"));
  try {
    const isUpdate = !!idToUpdate;
    const reservationId = isUpdate ? idToUpdate : `REST-${Date.now()}`;
    const currentUser = getUserEmail();
    
    const sheetRowData = {
      'Reservation ID': reservationId,
      'Client Name': details.clientName,
      'Client Phone': details.clientPhone,
      'Client Email': details.clientEmail,
      'Number of People': details.numPeople,
      'Reservation Date': formatDateField_hoisted(details.reservationDate, 'reservationDate'),
      'Reservation Hour': details.reservationHour,
      'Status': details.status || 'Confirmed',
      'Notes': details.notes,
      'Recorded By': isUpdate ? details.recordedBy : currentUser,
      'Last Updated': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    };
    
    let operationResult;
    if (isUpdate) {
      operationResult = updateData(SHEET_NAMES.RESTAURANT, 'Reservation ID', idToUpdate, sheetRowData);
    } else {
      operationResult = appendData(SHEET_NAMES.RESTAURANT, sheetRowData);
    }
    
    return operationResult;
  } catch (e) {
    Logger.log(`CRITICAL Error in saveRestaurantReservation: ${e.toString()}`);
    return { success: false, message: `Server error: ${e.message}` };
  }
}

/**
 * Deletes a restaurant reservation from the sheet.
 * @param {string} reservationId - The ID of the reservation to delete.
 * @returns {object} A result object indicating success or failure.
 */
function deleteRestaurantReservation(reservationId) {
  Logger.log(`deleteRestaurantReservation: ID: ${reservationId}`);
  try {
    if (!reservationId) return { success: false, message: "Missing Reservation ID." };
    return deleteData(SHEET_NAMES.RESTAURANT, 'Reservation ID', reservationId);
  } catch (e) {
    Logger.log(`Error in deleteRestaurantReservation: ${e.toString()}`);
    return { success: false, message: `Server error: ${e.message}` };
  }
}


/**
 * Generates a PDF report for restaurant reservations within a date range.
 * @param {object} reportParamsWithLang - Object containing startDate, endDate, and lang.
 * @returns {object} Result object with base64 PDF data or an error.
 */
function generateRestaurantReportPdf(reportParamsWithLang) {
    const lang = reportParamsWithLang.lang || 'pt';
    const { startDate, endDate } = reportParamsWithLang;

    Logger.log(`generateRestaurantReportPdf: Called for lang '${lang}' from ${startDate} to ${endDate}`);
    try {
        if (!startDate || !endDate) {
            return { success: false, error: "Start and end dates are required for the report." };
        }
        
        const reservationsResult = getRestaurantReservations();
        if (!reservationsResult.success) {
            return { success: false, error: `Failed to fetch restaurant reservations: ${reservationsResult.error}` };
        }

        const filterStartDate = parseDateTimeToUTCDate(startDate, "00:00:00");
        const filterEndDate = parseDateTimeToUTCDate(endDate, "23:59:59");
        if (!filterStartDate || !filterEndDate) {
             return { success: false, error: `Invalid date format for report. Start: ${startDate}, End: ${endDate}` };
        }

        const filteredReservations = reservationsResult.reservations.filter(res => {
            if (!res.reservationDate || res.status === 'Cancelled') return false;
            const resDate = parseDateTimeToUTCDate(res.reservationDate, "00:00:00");
            return resDate && resDate >= filterStartDate && resDate <= filterEndDate;
        });

        const htmlContent = generateRestaurantReportPdfHtml(filteredReservations, startDate, endDate, lang);
        const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `Restaurant-Report.html`).getAs(MimeType.PDF);
        const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
        const fileName = `Restaurant_Report_${startDate}_to_${endDate}.pdf`;
        Logger.log("generateRestaurantReportPdf: PDF generated: " + fileName);
        return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };

    } catch (e) {
        Logger.log(`Error in generateRestaurantReportPdf: ${e.toString()}`);
        return { success: false, error: `Server error generating restaurant report: ${e.message}` };
    }
}

function generateRestaurantReportPdfHtml(reservations, startDate, endDate, lang = 'pt') {
    const reportTitle = "Relatório de Reservas do Restaurante";
    const reportPeriod = `${formatDateForPdfDisplay(startDate, lang)} a ${formatDateForPdfDisplay(endDate, lang)}`;

    let tableRowsHtml = '';
    if (reservations.length === 0) {
        tableRowsHtml = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhuma reserva encontrada para este período.</td></tr>';
    } else {
        // Group reservations by date using a sortable key
        const groupedByDate = reservations.reduce((acc, curr) => {
            const dateKey = formatDateField_hoisted(curr.reservationDate, 'groupingDate');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(curr);
            return acc;
        }, {});

        // Sort dates chronologically
        const sortedDates = Object.keys(groupedByDate).sort();
        
        let dayIndex = 0;
        sortedDates.forEach(dateKey => {
            const dateDisplay = formatDateForPdfDisplay(dateKey, lang);
            const dayReservations = groupedByDate[dateKey].sort((a, b) => (a.reservationHour || '00:00').localeCompare(b.reservationHour || '00:00'));
            
            // Add a date header row for each day
            tableRowsHtml += `<tr><td colspan="5" class="date-header">${dateDisplay}</td></tr>`;

            // Add rows for each reservation within that day
            dayReservations.forEach(res => {
                const bgClass = dayIndex % 2 === 0 ? 'day-group-even' : 'day-group-odd';
                tableRowsHtml += `
                    <tr class="item-row ${bgClass}">
                        <td>${res.reservationHour || 'N/A'}</td>
                        <td>${res.clientName || 'N/A'}</td>
                        <td class="text-center">${res.numPeople || 'N/A'}</td>
                        <td>${res.clientPhone || 'N/A'}</td>
                        <td class="notes-cell">${res.notes || ''}</td>
                    </tr>
                `;
            });
            dayIndex++;
        });
    }

    return `
    <html>
        <head>
            <style>
                @page { size: A4 portrait; margin: 1.5cm; }
                body { 
                    font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; 
                    font-size: 10pt; 
                    color: #333; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                .report-container { 
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                .report-header { 
                    text-align: left; 
                    padding: 15px 20px;
                    background-color: #f8f9fa;
                    border-bottom: 2px solid #0d6efd;
                }
                .report-header h1 { 
                    font-size: 18pt; 
                    margin: 0; 
                    color: #0d6efd; 
                    font-weight: 600;
                }
                .report-header p { 
                    font-size: 11pt; 
                    margin: 5px 0 0; 
                    color: #6c757d; 
                }
                .report-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                }
                .report-table th, .report-table td { 
                    border: 1px solid #dee2e6; 
                    padding: 8px 10px;
                    vertical-align: middle;
                }
                .report-table thead th { 
                    background-color: #e9ecef; 
                    color: #495057; 
                    font-weight: 600;
                    text-align: left;
                    font-size: 9pt;
                    text-transform: uppercase;
                    border-bottom: 2px solid #adb5bd;
                }
                .text-center { text-align: center; }
                .date-header { 
                    background-color: #6c757d; 
                    color: white;
                    font-weight: bold; 
                    font-size: 11pt; 
                    padding: 10px 10px;
                    text-align: center;
                    border-top: 3px solid #343a40;
                }
                .item-row td {
                    border-bottom: 1px solid #f1f1f1;
                }
                .day-group-even { background-color: #ffffff; }
                .day-group-odd { background-color: #f8f9fa; }
                .notes-cell {
                    font-size: 9pt;
                    color: #555;
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="report-header">
                    <h1>${reportTitle}</h1>
                    <p>${reportPeriod}</p>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width:12%;">Hora</th>
                            <th style="width:25%;">Nome</th>
                            <th style="width:10%;" class="text-center">Pessoas</th>
                            <th style="width:18%;">Telefone</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        </body>
    </html>`;
}

/**
 * Generates the HTML content for the restaurant report PDF.
 * @param {Array<object>} reservations - The filtered array of reservation records.
 * @param {string} startDate - The start date of the report period.
 * @param {string} endDate - The end date of the report period.
 * @param {string} lang - The language for translations.
 * @returns {string} The complete HTML string for the PDF.
 */

function deleteData(sheetName, identifierHeader, identifierValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sheet not found: ${sheetName}` };
  const headers = HEADERS[sheetName];
  if (!headers) return { success: false, message: `Headers not defined for sheet: ${sheetName}` };

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headerRow = values[0];
  const identifierColIndex = headerRow.indexOf(identifierHeader);

  if (identifierColIndex === -1) return { success: false, message: `ID header "${identifierHeader}" not found in "${sheetName}".` };

  let rowIndexToDelete = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][identifierColIndex]) === String(identifierValue)) {
      rowIndexToDelete = i;
      break;
    }
  }

  if (rowIndexToDelete === -1) return { success: false, message: `Row with ${identifierHeader} "${identifierValue}" not found for deletion.` };

  try {
    sheet.deleteRow(rowIndexToDelete + 1);
    SpreadsheetApp.flush(); // Add this line
    return { success: true };
  } catch (e) {
    Logger.log(`Error deleting row in ${sheetName}: ${e.toString()}`);
    return { success: false, message: `Failed to delete data: ${e.message}` };
  }
}


// --- Data Getters ---
function getBoatsData() {
  Logger.log("getBoatsData: Attempting to fetch boats.");
  let response = { boats: [], error: null };
  try {
    const rawBoats = getData(SHEET_NAMES.BOATS);
    if (!Array.isArray(rawBoats)) {
        Logger.log("getBoatsData: getData returned non-array or null. Treating as empty.");
        response.boats = [];
    } else {
        response.boats = rawBoats.map(boat => ({
          uniqueId: boat[HEADERS[SHEET_NAMES.BOATS][0]],
          boatName: boat[HEADERS[SHEET_NAMES.BOATS][1]],
          boatModel: boat[HEADERS[SHEET_NAMES.BOATS][2]]
        }));
    }
    Logger.log("getBoatsData: Successfully fetched " + response.boats.length + " boats.");
  } catch (e) {
    Logger.log(`Error in getBoatsData: ${e.toString()} \nStack: ${e.stack}`);
    response.error = `Server error fetching boats data: ${e.message}`;
    response.boats = [];
  }
  return response;
}

function getExtrasData() {
  Logger.log("getExtrasData: Attempting to fetch extras.");
  let response = { extras: [], error: null };
  try {
    const rawExtras = getData(SHEET_NAMES.EXTRAS);
    if (!Array.isArray(rawExtras)) {
        Logger.log("getExtrasData: getData returned non-array or null. Treating as empty.");
        response.extras = [];
    } else {
        response.extras = rawExtras.map(extra => ({
          extraName: extra[HEADERS[SHEET_NAMES.EXTRAS][0]],
          price: parseFloat(extra[HEADERS[SHEET_NAMES.EXTRAS][1]]) || 0,
          unit: extra[HEADERS[SHEET_NAMES.EXTRAS][2]]
        }));
    }
    Logger.log("getExtrasData: Successfully fetched " + response.extras.length + " extras.");
  } catch (e) {
    Logger.log(`Error in getExtrasData: ${e.toString()} \nStack: ${e.stack}`);
    response.error = `Server error fetching extras data: ${e.message}`;
    response.extras = [];
  }
  return response;
}

function getTariffsPricesData() {
  Logger.log("getTariffsPricesData: Attempting to fetch tariffs and prices.");
  let response = { tariffsPrices: [], error: null };
  try {
    const tariffs = getData(SHEET_NAMES.TARIFFS);
    const boatPrices = getData(SHEET_NAMES.BOAT_PRICES);

    const validTariffs = Array.isArray(tariffs) ? tariffs : [];
    const validBoatPrices = Array.isArray(boatPrices) ? boatPrices : [];

    // Group boat prices by tariff name for efficient lookup
    const pricesByTariffName = validBoatPrices.reduce((acc, price) => {
        const tariffName = price[HEADERS[SHEET_NAMES.BOAT_PRICES][1]];
        if (!acc[tariffName]) {
            acc[tariffName] = [];
        }
        acc[tariffName].push(price);
        return acc;
    }, {});

    let combinedData = [];
    // Iterate through each defined tariff period (e.g., each row in the Tariffs sheet)
    validTariffs.forEach(tariffPeriod => {
        const tariffName = tariffPeriod[HEADERS[SHEET_NAMES.TARIFFS][0]];
        const pricesForThisTariffName = pricesByTariffName[tariffName];

        // If there are any boat prices associated with this tariff name
        if (pricesForThisTariffName) {
            // Create a distinct entry for each boat model for this specific date range
            pricesForThisTariffName.forEach(priceEntry => {
                combinedData.push({
                    tariffName: tariffName,
                    startDate: _parseToDateObject(tariffPeriod[HEADERS[SHEET_NAMES.TARIFFS][1]]),
                    endDate: _parseToDateObject(tariffPeriod[HEADERS[SHEET_NAMES.TARIFFS][2]]),
                    boatModel: priceEntry[HEADERS[SHEET_NAMES.BOAT_PRICES][0]],
                    rateNormalNight: parseFloat(priceEntry[HEADERS[SHEET_NAMES.BOAT_PRICES][2]]) || 0,
                    rateWeekendNight: parseFloat(priceEntry[HEADERS[SHEET_NAMES.BOAT_PRICES][3]]) || 0
                });
            });
        }
    });

    response.tariffsPrices = combinedData;
    Logger.log("getTariffsPricesData: Successfully processed " + response.tariffsPrices.length + " tariff/price entries.");
  } catch (e) {
    Logger.log(`Error in getTariffsPricesData: ${e.toString()} \nStack: ${e.stack}`);
    response.error = `Server error fetching tariffs/prices: ${e.message}`;
    response.tariffsPrices = [];
  }
  return response;
}



function getReservations() {
    Logger.log("getReservations: Fetching all reservations.");
    let responseObjectToReturn = { reservations: [], error: null };
    try {
        const rawReservationsFromGetData = getData(SHEET_NAMES.RESERVATIONS);
        if (!Array.isArray(rawReservationsFromGetData)) {
            responseObjectToReturn.error = "Error fetching raw reservations or data is not an array.";
            Logger.log(responseObjectToReturn.error + (rawReservationsFromGetData === null ? ` Sheet "${SHEET_NAMES.RESERVATIONS}" likely not found.` : ''));
            return responseObjectToReturn;
        }
        if (rawReservationsFromGetData.length === 0) {
            Logger.log("getReservations: No reservations found in the sheet.");
            return responseObjectToReturn;
        }

        const reservationSheetHeaders = HEADERS[SHEET_NAMES.RESERVATIONS];

        const mappedReservations = rawReservationsFromGetData.map((rawRes, index) => {
            const getRawValue = (headerKey) => {
                const val = rawRes[headerKey];
                return val !== undefined ? val : null;
            };

            const reservationId = getRawValue('Reservation ID') || `MISSING_RID-${Date.now()}-${index}`;
            
            let numberOfNights = parseInt(getRawValue('Number of Nights'), 10) || 0;
            let normalNights = parseInt(getRawValue('Normal Nights'), 10) || 0;
            let weekendNights = parseInt(getRawValue('Weekend Nights'), 10) || 0;

            const rawTotalCost = getRawValue('Total Cost');
            const parsedTotalCost = parseFloat(rawTotalCost);
            const finalTotalCost = isNaN(parsedTotalCost) ? 0 : parsedTotalCost;

            const rawTotalPaid = getRawValue('Total Paid');
            const parsedTotalPaid = parseFloat(rawTotalPaid);
            const finalTotalPaid = isNaN(parsedTotalPaid) ? 0 : parsedTotalPaid;

            const rawAmountDue = getRawValue('Amount Due');
            const parsedAmountDue = parseFloat(rawAmountDue);
            let finalAmountDue = isNaN(parsedAmountDue) ? finalTotalCost - finalTotalPaid : parsedAmountDue;
            if (finalAmountDue < 0 && finalTotalPaid > finalTotalCost) finalAmountDue = 0;

            return {
                reservationId: reservationId,
                clientName: getRawValue('Client Name') || "N/A Client",
                clientPhone: getRawValue('Client Phone'),
                clientEmail: getRawValue('Client Email'),
                boatUniqueId: getRawValue('Boat Unique ID'),
                boatNameAuto: getRawValue('Boat Name (auto)') || "N/A Boat Name",
                boatModelAuto: getRawValue('Boat Model (auto)') || "N/A Boat Model",
                checkInDate: formatDateField_hoisted(getRawValue('Check-in Date'), `Check-in Date (Res ${index})`),
                checkInTime: formatTimeValue_hoisted(getRawValue('Check-in Time'), `Check-in Time (Res ${index})`),
                checkOutDate: formatDateField_hoisted(getRawValue('Check-out Date'), `Check-out Date (Res ${index})`),
                checkOutTime: formatTimeValue_hoisted(getRawValue('Check-out Time'), `Check-out Time (Res ${index})`),
                numberOfNights: isNaN(numberOfNights) ? 0 : numberOfNights, // Use the potentially recalculated value
                normalNights: isNaN(normalNights) ? 0 : normalNights, // Use the potentially recalculated value
                weekendNights: isNaN(weekendNights) ? 0 : weekendNights, // Use the potentially recalculated value
                unitPriceNormalNight: parseFloat(getRawValue('Unit Price Normal Night')) || 0,
                totalNormalNightCost: parseFloat(getRawValue('Total Normal Night Cost')) || 0,
                unitPriceWeekendNight: parseFloat(getRawValue('Unit Price Weekend Night')) || 0,
                totalWeekendNightCost: parseFloat(getRawValue('Total Weekend Night Cost')) || 0,
                extrasBooked: getRawValue('Extras Booked (JSON)') || "{}",
                discountPercentage: parseFloat(getRawValue('Discount Percentage')) || 0,
                taxValue: parseFloat(getRawValue('Tax Value')) || 0,
                baseBoatCost: parseFloat(getRawValue('Base Boat Cost')) || 0,
                extrasCost: parseFloat(getRawValue('Extras Cost')) || 0,
                subtotal: parseFloat(getRawValue('Subtotal')) || 0,
                taxAmountApplied: parseFloat(getRawValue('Tax Amount Applied')) || 0,
                amountWithTaxBeforeDiscount: parseFloat(getRawValue('Amount With Tax Before Discount')) || 0,
                discountAmount: parseFloat(getRawValue('Discount Amount')) || 0,
                totalCost: finalTotalCost,
                totalPaid: finalTotalPaid,
                amountDue: finalAmountDue,
                status: getRawValue('Status') || "Unknown",
                reservationSource: getRawValue('Reservation Source'),
                reservationDate: formatDateField_hoisted(getRawValue('Reservation Date'), `Reservation Date (Res ${index})`),
                recordedBy: getRawValue('Recorded By'),
                notes: getRawValue('Notes'),
            };
        });
        Logger.log(`getReservations: Successfully mapped ${mappedReservations.length} reservations.`);
        responseObjectToReturn.reservations = mappedReservations;
    } catch (e) {
        Logger.log(`CRITICAL Error in getReservations: ${e.toString()} \nStack: ${e.stack}`);
        responseObjectToReturn.error = `Server error during reservation processing: ${e.message || 'Unknown error'}. Check logs.`;
    }
    return responseObjectToReturn;
}

// NEW: Getter for Daily Trip Options
function getDailyTripOptions() {
  Logger.log("getDailyTripOptions: Fetching trip options.");
  try {
    const rawData = getData(SHEET_NAMES.DAILY_TRIP_OPTIONS);
    if (!Array.isArray(rawData)) {
      return { success: false, error: "Could not load trip options data.", options: [] };
    }
    const options = rawData.map(row => ({
      tripName: row[HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][0]],
      pricePerAdult: parseFloat(row[HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][1]]) || 0,
      pricePerKid: parseFloat(row[HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][2]]) || 0,
      pricePerSenior: parseFloat(row[HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][3]]) || 0,
      duration: parseFloat(row[HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][4]]) || 0
    }));
    return { success: true, options };
  } catch(e) {
    Logger.log(`Error in getDailyTripOptions: ${e.toString()}`);
    return { success: false, error: e.message, options: [] };
  }
}

// NEW: Getter for Food Options
function getFoodOptions() {
  Logger.log("getFoodOptions: Fetching food options.");
  try {
    const rawData = getData(SHEET_NAMES.FOOD_OPTIONS);
    if (!Array.isArray(rawData)) {
      return { success: false, error: "Could not load food options data.", options: [] };
    }
    const options = rawData.map(row => ({
      optionName: row[HEADERS[SHEET_NAMES.FOOD_OPTIONS][0]],
      price: parseFloat(row[HEADERS[SHEET_NAMES.FOOD_OPTIONS][1]]) || 0,
      description: row[HEADERS[SHEET_NAMES.FOOD_OPTIONS][2]]
    }));
    return { success: true, options };
  } catch(e) {
    Logger.log(`Error in getFoodOptions: ${e.toString()}`);
    return { success: false, error: e.message, options: [] };
  }
}

// UPDATED: getInitialAppData to include new travel data
function getInitialAppData() {
    Logger.log("getInitialAppData: Called.");
    let response = {
        boats: [],
        extras: [],
        dailyTripOptions: [],
        foodOptions: [],
        tariffsPrices: [],
        error: null
    };
    try {
        const boatsData = getBoatsData();
        const extrasData = getExtrasData();
        const tripOptionsData = getDailyTripOptions();
        const foodOptionsData = getFoodOptions();
        const tariffsPricesData = getTariffsPricesData();

        if (boatsData.error) response.error = (response.error ? response.error + "; " : "") + "Boats: " + boatsData.error;
        response.boats = boatsData.boats;

        if (extrasData.error) response.error = (response.error ? response.error + "; " : "") + "Extras: " + extrasData.error;
        response.extras = extrasData.extras;

        if(tripOptionsData.error) response.error = (response.error ? response.error + "; " : "") + "Trip Options: " + tripOptionsData.error;
        response.dailyTripOptions = tripOptionsData.options;

        if(foodOptionsData.error) response.error = (response.error ? response.error + "; " : "") + "Food Options: " + foodOptionsData.error;
        response.foodOptions = foodOptionsData.options;

        if(tariffsPricesData.error) response.error = (response.error ? response.error + "; " : "") + "Tariffs: " + tariffsPricesData.error;
        response.tariffsPrices = tariffsPricesData.tariffsPrices;

        if (!response.error) Logger.log("getInitialAppData: Successfully fetched initial app data.");
    } catch (e) {
        Logger.log(`Error in getInitialAppData: ${e.toString()} \nStack: ${e.stack}`);
        response.error = `Server error loading initial app data: ${e.message}`;
    }
    return response;
}

function getDashboardData() {
    Logger.log("getDashboardData: Called.");
    let response = {
        activeReservations: '--',
        upcomingCheckins: '--',
        pendingPayments: '--',
        availableBoats: '-- / --',
        todayCheckIns: [],
        todayCheckOuts: [],
        error: null
    };
    try {
        const reservationsData = getReservations();
        const boatsData = getBoatsData();
        if (reservationsData.error) response.error = (response.error ? response.error + "; " : "") + "Reservations: " + reservationsData.error;
        if (boatsData.error) response.error = (response.error ? response.error + "; " : "") + "Boats: " + boatsData.error;
        if (response.error) {
            Logger.log("getDashboardData: Error fetching underlying data: " + response.error);
            return response;
        }
        const reservations = reservationsData.reservations;
        const boats = boatsData.boats;

        const today = new Date();
        const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
        const todayEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

        const sevenDaysLater = new Date(todayStart.getTime());
        sevenDaysLater.setUTCDate(todayStart.getUTCDate() + 7);
        sevenDaysLater.setUTCHours(23,59,59,999);


        response.activeReservations = reservations.filter(r => {
            if (!r.status || r.status.toLowerCase() !== 'confirmed' || !r.checkOutDate) return false;
            const ciDateTime = parseDateTimeToUTCDate(r.checkInDate, r.checkInTime || "00:00");
            const coDateTime = parseDateTimeToUTCDate(r.checkOutDate, r.checkOutTime || "23:59");
            return ciDateTime && coDateTime && todayStart >= ciDateTime && todayStart < coDateTime;
        }).length;

        response.upcomingCheckins = reservations.filter(r => {
            if (!r.status || r.status.toLowerCase() !== 'confirmed' || !r.checkInDate) return false;
            const ciDateTime = parseDateTimeToUTCDate(r.checkInDate, r.checkInTime || "00:00");
            return ciDateTime && ciDateTime >= todayStart && ciDateTime <= sevenDaysLater;
        }).length;

        response.pendingPayments = reservations.filter(r =>
            r.status && r.status.toLowerCase() === 'confirmed' && typeof r.amountDue === 'number' && r.amountDue > 0
        ).length;

        const totalBoats = boats.length;
        const currentlyBookedBoatIds = new Set(
            reservations.filter(r => {
                if (r.status && r.status.toLowerCase() === 'confirmed' && r.checkInDate && r.checkOutDate) {
                    const checkIn = parseDateTimeToUTCDate(r.checkInDate, r.checkInTime || "00:00");
                    const checkOut = parseDateTimeToUTCDate(r.checkOutDate, r.checkOutTime || "00:00");
                    if (!checkIn || !checkOut) return false;
                    return todayStart >= checkIn && todayStart < checkOut;
                }
                return false;
            }).map(r => r.boatUniqueId)
        );
        const availableNow = totalBoats - currentlyBookedBoatIds.size;
        response.availableBoats = `${availableNow} / ${totalBoats}`;

        response.todayCheckIns = reservations.filter(r => {
            if (!r.checkInDate || r.status === 'Cancelled') return false;
            const ciDateOnly = parseDateTimeToUTCDate(r.checkInDate, "00:00");
            return ciDateOnly && ciDateOnly.getTime() === todayStart.getTime();
        }).map(r => ({
            clientName: r.clientName,
            boatNameAuto: r.boatNameAuto,
            checkInTime: r.checkInTime || "N/A"
        }));

        response.todayCheckOuts = reservations.filter(r => {
            if (!r.checkOutDate || r.status === 'Cancelled') return false;
            const coDateOnly = parseDateTimeToUTCDate(r.checkOutDate, "00:00");
            return coDateOnly && coDateOnly.getTime() === todayStart.getTime();
        }).map(r => ({
            clientName: r.clientName,
            boatNameAuto: r.boatNameAuto,
            checkOutTime: r.checkOutTime || "N/A"
        }));

        Logger.log("getDashboardData: Successfully compiled dashboard data. Today CIs: " + response.todayCheckIns.length + ", Today COs: " + response.todayCheckOuts.length);
    } catch (e) {
        Logger.log(`Error in getDashboardData: ${e.toString()} \nStack: ${e.stack}`);
        response.error = `Server error fetching dashboard data: ${e.message}`;
        response.activeReservations = '--';
        response.upcomingCheckins = '--';
        response.pendingPayments = '--';
        response.availableBoats = '-- / --';
        response.todayCheckIns = [];
        response.todayCheckOuts = [];
    }
    return response;
}


function getUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "WebApp User";
  } catch (e) {
    Logger.log('Error in getUserEmail: ' + e.toString());
    return "WebApp User (Error)";
  }
}

function addBoat(boatData) {
    Logger.log("addBoat: Called with data: " + JSON.stringify(boatData));
    try {
        if (!boatData || !boatData.uniqueId || !boatData.name || !boatData.model) {
            return { success: false, message: "Missing boat data (ID, Name, or Model)." };
        }
        const currentBoatsData = getBoatsData();
        if (currentBoatsData.error) {
             return { success: false, message: "Could not verify existing boats: " + currentBoatsData.error };
        }
        if (currentBoatsData.boats.some(boat => String(boat.uniqueId).trim().toLowerCase() === String(boatData.uniqueId).trim().toLowerCase())) {
            return { success: false, message: `Boat with Unique ID "${boatData.uniqueId}" already exists.` };
        }
        const dataToAppend = {};
        dataToAppend[HEADERS[SHEET_NAMES.BOATS][0]] = boatData.uniqueId;
        dataToAppend[HEADERS[SHEET_NAMES.BOATS][1]] = boatData.name;
        dataToAppend[HEADERS[SHEET_NAMES.BOATS][2]] = boatData.model;
        return appendData(SHEET_NAMES.BOATS, dataToAppend);
    } catch (e) {
        Logger.log(`Error in addBoat: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function editBoat(originalUniqueId, updatedData) {
    Logger.log(`editBoat: ID "${originalUniqueId}", data: ${JSON.stringify(updatedData)}`);
    try {
        if (!originalUniqueId || !updatedData) return { success: false, message: "Missing data for boat edit." };
        const dataToUpdate = {};
        if (updatedData.hasOwnProperty('name')) dataToUpdate[HEADERS[SHEET_NAMES.BOATS][1]] = updatedData.name;
        if (updatedData.hasOwnProperty('model')) dataToUpdate[HEADERS[SHEET_NAMES.BOATS][2]] = updatedData.model;
        if (Object.keys(dataToUpdate).length === 0) return { success: true, message: "No updatable fields." };
        return updateData(SHEET_NAMES.BOATS, HEADERS[SHEET_NAMES.BOATS][0], originalUniqueId, dataToUpdate);
    } catch (e) {
        Logger.log(`Error in editBoat: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function deleteBoat(uniqueId) {
    Logger.log(`deleteBoat: ID: ${uniqueId}`);
    try {
        if (!uniqueId) return { success: false, message: "Missing boat Unique ID." };
        return deleteData(SHEET_NAMES.BOATS, HEADERS[SHEET_NAMES.BOATS][0], uniqueId);
    } catch (e) {
        Logger.log(`Error in deleteBoat: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function addTariffPrice(tariffPriceData) {
    Logger.log("addTariffPrice: Called with data: " + JSON.stringify(tariffPriceData));
    try {
        if (!tariffPriceData || !tariffPriceData.tariffName || !tariffPriceData.startDate || !tariffPriceData.endDate ||
            !tariffPriceData.boatModel || typeof tariffPriceData.rateNormalNight !== 'number' || typeof tariffPriceData.rateWeekendNight !== 'number') {
            return { success: false, message: "Missing required tariff/price data." };
        }

        const tariffsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TARIFFS);
        const tariffValues = tariffsSheet ? tariffsSheet.getDataRange().getValues() : [];
        const tariffNameCol = HEADERS[SHEET_NAMES.TARIFFS].indexOf('Tariff Name');
        let tariffExists = false;
        if (tariffValues.length > 0 && tariffNameCol !== -1) {
            for (let i = 1; i < tariffValues.length; i++) {
                if (tariffValues[i][tariffNameCol] == tariffPriceData.tariffName) {
                    tariffExists = true;
                    break;
                }
            }
        }

        if (!tariffExists) {
            const tariffDataToAppend = {};
            tariffDataToAppend[HEADERS[SHEET_NAMES.TARIFFS][0]] = tariffPriceData.tariffName;
            tariffDataToAppend[HEADERS[SHEET_NAMES.TARIFFS][1]] = tariffPriceData.startDate;
            tariffDataToAppend[HEADERS[SHEET_NAMES.TARIFFS][2]] = tariffPriceData.endDate;
            const tariffAppendResult = appendData(SHEET_NAMES.TARIFFS, tariffDataToAppend);
            if (!tariffAppendResult.success) {
                return { success: false, message: `Failed to add new tariff period: ${tariffAppendResult.message}` };
            }
        }

        const currentBoatPricesData = getTariffsPricesData();
         if (currentBoatPricesData.error) {
             return { success: false, message: "Could not verify existing boat prices: " + currentBoatPricesData.error };
        }
        if (currentBoatPricesData.tariffsPrices.some(item => item.boatModel == tariffPriceData.boatModel && item.tariffName == tariffPriceData.tariffName)) {
            return { success: false, message: `Price entry for Boat Model "${tariffPriceData.boatModel}" and Tariff "${tariffPriceData.tariffName}" already exists.` };
        }

        const boatPriceDataToAppend = {};
        boatPriceDataToAppend[HEADERS[SHEET_NAMES.BOAT_PRICES][0]] = tariffPriceData.boatModel;
        boatPriceDataToAppend[HEADERS[SHEET_NAMES.BOAT_PRICES][1]] = tariffPriceData.tariffName;
        boatPriceDataToAppend[HEADERS[SHEET_NAMES.BOAT_PRICES][2]] = tariffPriceData.rateNormalNight;
        boatPriceDataToAppend[HEADERS[SHEET_NAMES.BOAT_PRICES][3]] = tariffPriceData.rateWeekendNight;
        return appendData(SHEET_NAMES.BOAT_PRICES, boatPriceDataToAppend);
    } catch (e) {
        Logger.log(`Error in addTariffPrice: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}


function editTariffPrice(updatedData) {
    Logger.log("editTariffPrice (rates only): Called with data: " + JSON.stringify(updatedData));
    try {
        if (!updatedData || !updatedData.boatModel || !updatedData.tariffName) {
            return { success: false, message: "Missing identifiers (Boat Model, Tariff Name) for rate edit." };
        }
        const dataToUpdate = {};
        if (updatedData.hasOwnProperty('rateNormalNight')) dataToUpdate[HEADERS[SHEET_NAMES.BOAT_PRICES][2]] = updatedData.rateNormalNight;
        if (updatedData.hasOwnProperty('rateWeekendNight')) dataToUpdate[HEADERS[SHEET_NAMES.BOAT_PRICES][3]] = updatedData.rateWeekendNight;
        if (Object.keys(dataToUpdate).length === 0) return { success: true, message: "No rate fields provided for update." };
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAMES.BOAT_PRICES);
        if (!sheet) return { success: false, message: `Sheet not found: ${SHEET_NAMES.BOAT_PRICES}` };
        const values = sheet.getDataRange().getValues();
        const headerRow = values[0];
        const boatModelColIdx = headerRow.indexOf(HEADERS[SHEET_NAMES.BOAT_PRICES][0]);
        const tariffNameColIdx = headerRow.indexOf(HEADERS[SHEET_NAMES.BOAT_PRICES][1]);
        if (boatModelColIdx === -1 || tariffNameColIdx === -1) return { success: false, message: "Identifier columns not found in BoatPrices."};
        let rowIndexToUpdate = -1;
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][boatModelColIdx]) === String(updatedData.boatModel) && String(values[i][tariffNameColIdx]) === String(updatedData.tariffName)) {
                rowIndexToUpdate = i;
                break;
            }
        }
        if (rowIndexToUpdate === -1) return { success: false, message: `Price entry for ${updatedData.boatModel} / ${updatedData.tariffName} not found.`};
        const updatedRowValues = [...values[rowIndexToUpdate]];
        for (const key in dataToUpdate) {
            if (dataToUpdate.hasOwnProperty(key)) {
                const headerIndex = headerRow.indexOf(key);
                if (headerIndex !== -1) {
                    updatedRowValues[headerIndex] = dataToUpdate[key];
                }
            }
        }
        sheet.getRange(rowIndexToUpdate + 1, 1, 1, updatedRowValues.length).setValues([updatedRowValues]);
        return { success: true };
    } catch (e) {
        Logger.log(`Error in editTariffPrice: ${e.toString()}`);
        return { success: false, message: `Server error editing rates: ${e.message}` };
    }
}

function deleteTariffPrice(identifiers) {
    Logger.log(`deleteTariffPrice: IDs: ${JSON.stringify(identifiers)}`);
    try {
        if (!identifiers || !identifiers.boatModel || !identifiers.tariffName) return { success: false, message: "Missing identifiers." };
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAMES.BOAT_PRICES);
        if (!sheet) return { success: false, message: `Sheet not found: ${SHEET_NAMES.BOAT_PRICES}` };
        const values = sheet.getDataRange().getValues();
        const headerRow = values[0];
        const boatModelColIdx = headerRow.indexOf(HEADERS[SHEET_NAMES.BOAT_PRICES][0]);
        const tariffNameColIdx = headerRow.indexOf(HEADERS[SHEET_NAMES.BOAT_PRICES][1]);
        if (boatModelColIdx === -1 || tariffNameColIdx === -1) return { success: false, message: "Identifier columns not found."};
        let rowIndexToDelete = -1;
        for (let i = values.length - 1; i >= 1; i--) {
            if (String(values[i][boatModelColIdx]) === String(identifiers.boatModel) && String(values[i][tariffNameColIdx]) === String(identifiers.tariffName)) {
                rowIndexToDelete = i;
                sheet.deleteRow(rowIndexToDelete + 1);
                break;
            }
        }
        if (rowIndexToDelete === -1) return { success: false, message: `Price entry for ${identifiers.boatModel} / ${identifiers.tariffName} not found.`};
        return { success: true };
    } catch (e) {
        Logger.log(`Error in deleteTariffPrice: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function addExtra(extraData) {
    Logger.log("addExtra: Data: " + JSON.stringify(extraData));
    try {
        if (!extraData || !extraData.name || typeof extraData.price !== 'number' || !extraData.unit) {
            return { success: false, message: "Missing extra data (Name, Price, or Unit)." };
        }
        const currentExtrasData = getExtrasData();
        if (currentExtrasData.error) {
            return { success: false, message: "Could not verify existing extras: " + currentExtrasData.error };
        }
        if (currentExtrasData.extras.some(ex => String(ex.extraName).trim().toLowerCase() === String(extraData.name).trim().toLowerCase())) {
            return { success: false, message: `Extra with name "${extraData.name}" already exists.` };
        }
        const dataToAppend = {};
        dataToAppend[HEADERS[SHEET_NAMES.EXTRAS][0]] = extraData.name;
        dataToAppend[HEADERS[SHEET_NAMES.EXTRAS][1]] = extraData.price;
        dataToAppend[HEADERS[SHEET_NAMES.EXTRAS][2]] = extraData.unit;
        return appendData(SHEET_NAMES.EXTRAS, dataToAppend);
    } catch (e) {
        Logger.log(`Error in addExtra: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function editExtra(originalName, updatedData) {
    Logger.log(`editExtra: Name "${originalName}", data: ${JSON.stringify(updatedData)}`);
    try {
        if (!originalName || !updatedData) return { success: false, message: "Missing data for extra edit." };
        const dataToUpdate = {};
        if (updatedData.hasOwnProperty('price')) dataToUpdate[HEADERS[SHEET_NAMES.EXTRAS][1]] = updatedData.price;
        if (updatedData.hasOwnProperty('unit')) dataToUpdate[HEADERS[SHEET_NAMES.EXTRAS][2]] = updatedData.unit;
        if (Object.keys(dataToUpdate).length === 0) return { success: true, message: "No updatable fields." };
        return updateData(SHEET_NAMES.EXTRAS, HEADERS[SHEET_NAMES.EXTRAS][0], originalName, dataToUpdate);
    } catch (e) {
        Logger.log(`Error in editExtra: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function deleteExtra(name) {
    Logger.log(`deleteExtra: Name: ${name}`);
    try {
        if (!name) return { success: false, message: "Missing extra Name." };
        return deleteData(SHEET_NAMES.EXTRAS, HEADERS[SHEET_NAMES.EXTRAS][0], name);
    } catch (e) {
        Logger.log(`Error in deleteExtra: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

// --- NEW CRUD Functions for Daily Trips ---
function addDailyTrip(tripData) {
    Logger.log("addDailyTrip: Called with data: " + JSON.stringify(tripData));
    try {
        if (!tripData || !tripData.tripName) {
            return { success: false, message: "Missing trip name." };
        }
        const currentData = getDailyTripOptions();
        if (currentData.error) {
             return { success: false, message: "Could not verify existing trips: " + currentData.error };
        }
        if (currentData.options.some(t => String(t.tripName).trim().toLowerCase() === String(tripData.tripName).trim().toLowerCase())) {
            return { success: false, message: `A trip with the name "${tripData.tripName}" already exists.` };
        }
        const dataToAppend = {
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][0]]: tripData.tripName,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][1]]: tripData.pricePerAdult,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][2]]: tripData.pricePerKid,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][3]]: tripData.pricePerSenior,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][4]]: tripData.duration,
        };
        return appendData(SHEET_NAMES.DAILY_TRIP_OPTIONS, dataToAppend);
    } catch (e) {
        Logger.log(`Error in addDailyTrip: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function editDailyTrip(originalTripName, updatedData) {
    Logger.log(`editDailyTrip: Name "${originalTripName}", data: ${JSON.stringify(updatedData)}`);
    try {
        if (!originalTripName || !updatedData) return { success: false, message: "Missing data for trip edit." };
        const dataToUpdate = {
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][1]]: updatedData.pricePerAdult,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][2]]: updatedData.pricePerKid,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][3]]: updatedData.pricePerSenior,
            [HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][4]]: updatedData.duration,
        };
        return updateData(SHEET_NAMES.DAILY_TRIP_OPTIONS, HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][0], originalTripName, dataToUpdate);
    } catch (e) {
        Logger.log(`Error in editDailyTrip: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function deleteDailyTrip(tripName) {
    Logger.log(`deleteDailyTrip: Name: ${tripName}`);
    try {
        if (!tripName) return { success: false, message: "Missing trip name." };
        return deleteData(SHEET_NAMES.DAILY_TRIP_OPTIONS, HEADERS[SHEET_NAMES.DAILY_TRIP_OPTIONS][0], tripName);
    } catch (e) {
        Logger.log(`Error in deleteDailyTrip: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

// --- NEW CRUD Functions for Food Options ---
function addFoodOption(foodData) {
    Logger.log("addFoodOption: Called with data: " + JSON.stringify(foodData));
    try {
        if (!foodData || !foodData.optionName) {
            return { success: false, message: "Missing food option name." };
        }
        const currentData = getFoodOptions();
        if (currentData.error) {
             return { success: false, message: "Could not verify existing food options: " + currentData.error };
        }
        if (currentData.options.some(f => String(f.optionName).trim().toLowerCase() === String(foodData.optionName).trim().toLowerCase())) {
            return { success: false, message: `A food option with the name "${foodData.optionName}" already exists.` };
        }
        const dataToAppend = {
            [HEADERS[SHEET_NAMES.FOOD_OPTIONS][0]]: foodData.optionName,
            [HEADERS[SHEET_NAMES.FOOD_OPTIONS][1]]: foodData.price,
            [HEADERS[SHEET_NAMES.FOOD_OPTIONS][2]]: foodData.description,
        };
        return appendData(SHEET_NAMES.FOOD_OPTIONS, dataToAppend);
    } catch (e) {
        Logger.log(`Error in addFoodOption: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function editFoodOption(originalOptionName, updatedData) {
    Logger.log(`editFoodOption: Name "${originalOptionName}", data: ${JSON.stringify(updatedData)}`);
    try {
        if (!originalOptionName || !updatedData) return { success: false, message: "Missing data for food option edit." };
        const dataToUpdate = {
            [HEADERS[SHEET_NAMES.FOOD_OPTIONS][1]]: updatedData.price,
            [HEADERS[SHEET_NAMES.FOOD_OPTIONS][2]]: updatedData.description,
        };
        return updateData(SHEET_NAMES.FOOD_OPTIONS, HEADERS[SHEET_NAMES.FOOD_OPTIONS][0], originalOptionName, dataToUpdate);
    } catch (e) {
        Logger.log(`Error in editFoodOption: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

function deleteFoodOption(optionName) {
    Logger.log(`deleteFoodOption: Name: ${optionName}`);
    try {
        if (!optionName) return { success: false, message: "Missing food option name." };
        return deleteData(SHEET_NAMES.FOOD_OPTIONS, HEADERS[SHEET_NAMES.FOOD_OPTIONS][0], optionName);
    } catch (e) {
        Logger.log(`Error in deleteFoodOption: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}


/**
 * Saves or updates a reservation, handling both calculated and manual pricing.
 * UPDATED: Now correctly handles fast reservations from the calendar for manual sources
 * by defaulting the Total Cost to 0 if it's not a valid number.
 *
 * @param {object} reservationDetails - The details of the reservation to save.
 * @param {string|null} reservationIdToUpdate - The ID of the reservation to update, or null for a new one.
 * @param {object|null} initialPaymentDetails - Optional details for an initial payment on a new reservation.
 * @returns {object} A result object indicating success or failure.
 */
function saveReservation(reservationDetails, reservationIdToUpdate = null, initialPaymentDetails = null) {
    Logger.log("saveReservation: Called. Mode: " + (reservationIdToUpdate ? "UPDATE" : "NEW") +
               ". Data passed: " + JSON.stringify(reservationDetails) +
               (initialPaymentDetails ? ". Initial Payment: " + JSON.stringify(initialPaymentDetails) : ""));
    let responseObject = { success: false, message: "Initialization error in saveReservation", reservationId: null, details: null };
    try {
        const isUpdate = !!reservationIdToUpdate;
        const reservationId = isUpdate ? reservationIdToUpdate : `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const currentUser = getUserEmail();

        if (!reservationDetails.checkInDate || !reservationDetails.checkInTime || !reservationDetails.checkOutDate || !reservationDetails.checkOutTime) {
            responseObject.message = "Check-in/out dates and times are required."; return responseObject;
        }
        const newResStart = parseDateTimeToUTCDate(reservationDetails.checkInDate, reservationDetails.checkInTime);
        const newResEnd = parseDateTimeToUTCDate(reservationDetails.checkOutDate, reservationDetails.checkOutTime);

        if (!newResStart || !newResEnd) {
            responseObject.message = `Invalid date/time format for reservation period (Start: ${reservationDetails.checkInDate} ${reservationDetails.checkInTime}, End: ${reservationDetails.checkOutDate} ${reservationDetails.checkOutTime}). Cannot check for overlap. Ensure dates are YYYY-MM-dd or dd/MM/yyyy.`; return responseObject;
        }
        if (newResEnd <= newResStart) {
            responseObject.message = "Check-out date/time must be after check-in date/time."; return responseObject;
        }

        const allReservationsResult = getReservations();
        if (allReservationsResult.error) {
            responseObject.message = "Could not verify existing reservations for overlap: " + allReservationsResult.error; return responseObject;
        }
        const existingReservations = allReservationsResult.reservations;
        for (const existingRes of existingReservations) {
            if (existingRes.boatUniqueId === reservationDetails.boatUniqueId &&
                (existingRes.status === 'Confirmed' || existingRes.status === 'Pending') &&
                (!isUpdate || existingRes.reservationId !== reservationIdToUpdate)) {
                const existingResStart = parseDateTimeToUTCDate(existingRes.checkInDate, existingRes.checkInTime);
                const existingResEnd = parseDateTimeToUTCDate(existingRes.checkOutDate, existingRes.checkOutTime);
                if (existingResStart && existingResEnd && existingResEnd > existingResStart) {
                    if (newResStart < existingResEnd && newResEnd > existingResStart) {
                        responseObject.success = false;
                        responseObject.message = `Booking conflict: This boat is already booked from ${formatDateField_hoisted(existingRes.checkInDate, 'conflict CI')} ${formatTimeValue_hoisted(existingRes.checkInTime, 'conflict CI Time')} to ${formatDateField_hoisted(existingRes.checkOutDate, 'conflict CO')} ${formatTimeValue_hoisted(existingRes.checkOutTime, 'conflict CO Time')} (Reservation ID: ${existingRes.reservationId}). Please choose different dates or times.`;
                        return responseObject;
                    }
                }
            }
        }

        const boatsDataResult = getBoatsData();
        if (boatsDataResult.error) {
             responseObject.message = "Could not verify boat details: " + boatsDataResult.error; return responseObject;
        }
        const boats = boatsDataResult.boats;
        const boat = boats.find(b => String(b.uniqueId) === String(reservationDetails.boatUniqueId));

        let dataToSave = { ...reservationDetails };
        dataToSave.reservationId = reservationId;
        dataToSave.boatNameAuto = boat ? boat.boatName : 'Unknown Boat';
        dataToSave.boatModelAuto = boat ? boat.boatModel : 'Unknown Model';
        dataToSave.recordedBy = currentUser;

        const reservationDate = new Date();

        if (!isUpdate) {
            dataToSave.reservationDate = reservationDate;
            dataToSave.totalPaid = 0;
        } else {
            const existingReservation = existingReservations.find(r => r.reservationId === reservationIdToUpdate);
            dataToSave.totalPaid = existingReservation ? (existingReservation.totalPaid || 0) : 0;
            dataToSave.reservationDate = existingReservation ? existingReservation.reservationDate : reservationDate;
        }

        const nightCounts = _calculateNights(reservationDetails.checkInDate, reservationDetails.checkOutDate);
        dataToSave.numberOfNights = nightCounts.totalNights;
        dataToSave.normalNights = nightCounts.normalNightsCount;
        dataToSave.weekendNights = nightCounts.weekendNightsCount;

        const manualPricingSources = ['NICOLS', 'Ancorado', 'Diaria'];
        if (manualPricingSources.includes(reservationDetails.reservationSource)) {
            Logger.log(`saveReservation: Manual pricing for source "${reservationDetails.reservationSource}".`);
            const manualTotalCost = parseFloat(reservationDetails.totalCost);

            // --- MODIFICATION START ---
            // If manualTotalCost is not a valid number (e.g., from the quick-add panel which sends NaN),
            // default it to 0 as requested, instead of throwing an error.
            if (isNaN(manualTotalCost)) {
                dataToSave.totalCost = 0;
                Logger.log(`saveReservation: Manual totalCost was NaN for source "${reservationDetails.reservationSource}". Defaulting to 0.`);
            } else {
                dataToSave.totalCost = manualTotalCost;
            }
            // --- MODIFICATION END ---
            
            // Zero out other cost fields as they are not calculated for manual sources.
            dataToSave.baseBoatCost = 0;
            dataToSave.extrasCost = 0;
            dataToSave.subtotal = 0;
            dataToSave.taxAmountApplied = 0;
            dataToSave.amountWithTaxBeforeDiscount = 0;
            dataToSave.discountAmount = 0;
            dataToSave.unitPriceNormalNight = 0;
            dataToSave.totalNormalNightCost = 0;
            dataToSave.unitPriceWeekendNight = 0;
            dataToSave.totalWeekendNightCost = 0;

        } else { // 'AMIEIRA' or other calculated sources
            Logger.log(`saveReservation: Calculated pricing for source "${reservationDetails.reservationSource}".`);
            const priceCalcParams = {
                boatModel: dataToSave.boatModelAuto,
                checkInDate: reservationDetails.checkInDate, checkInTime: reservationDetails.checkInTime,
                checkOutDate: reservationDetails.checkOutDate, checkOutTime: reservationDetails.checkOutTime,
                selectedExtras: reservationDetails.extrasBooked,
                discountPercentage: reservationDetails.discountPercentage,
                taxValue: reservationDetails.taxValue,
            };
            const priceResult = calculateReservationPrice(priceCalcParams);
            if (priceResult.error) {
                Logger.log(`Price calculation error during save for ${reservationId}: ${priceResult.error}`);
                responseObject.message = `Price calculation error: ${priceResult.error}`;
                return responseObject;
            }
            dataToSave = { ...dataToSave, ...priceResult };
             if (dataToSave.hasOwnProperty('nights')) {
                dataToSave.numberOfNights = nightCounts.totalNights;
                delete dataToSave.nights;
            }
        }
        
        dataToSave.amountDue = (dataToSave.totalCost || 0) - (dataToSave.totalPaid || 0);
        if (dataToSave.amountDue < 0) dataToSave.amountDue = 0;

        Logger.log(`saveReservation - Data prepared for sheet mapping (dataToSave): ${JSON.stringify(dataToSave)}`);

        const sheetRowData = {};
        const dataToHeaderKeyMap = {
            reservationId: 'Reservation ID', clientName: 'Client Name', clientPhone: 'Client Phone', clientEmail: 'Client Email',
            boatUniqueId: 'Boat Unique ID', boatNameAuto: 'Boat Name (auto)', boatModelAuto: 'Boat Model (auto)',
            checkInDate: 'Check-in Date', checkInTime: 'Check-in Time', checkOutDate: 'Check-out Date', checkOutTime: 'Check-out Time',
            numberOfNights: 'Number of Nights', normalNights: 'Normal Nights', weekendNights: 'Weekend Nights',
            unitPriceNormalNight: 'Unit Price Normal Night', totalNormalNightCost: 'Total Normal Night Cost',
            unitPriceWeekendNight: 'Unit Price Weekend Night', totalWeekendNightCost: 'Total Weekend Night Cost',
            extrasBooked: 'Extras Booked (JSON)',
            discountPercentage: 'Discount Percentage', taxValue: 'Tax Value',
            baseBoatCost: 'Base Boat Cost', extrasCost: 'Extras Cost', subtotal: 'Subtotal',
            taxAmountApplied: 'Tax Amount Applied', amountWithTaxBeforeDiscount: 'Amount With Tax Before Discount',
            discountAmount: 'Discount Amount', totalCost: 'Total Cost',
            totalPaid: 'Total Paid', amountDue: 'Amount Due',
            status: 'Status', reservationSource: 'Reservation Source',
            reservationDate: 'Reservation Date', recordedBy: 'Recorded By', notes: 'Notes'
        };

        for (const dataKey in dataToHeaderKeyMap) {
            if (dataToSave.hasOwnProperty(dataKey)) {
                const headerName = dataToHeaderKeyMap[dataKey];
                if (headerName === 'Check-in Date' || headerName === 'Check-out Date') {
                    sheetRowData[headerName] = formatDateField_hoisted(dataToSave[dataKey], headerName);
                } else if (headerName === 'Reservation Date' && dataToSave[dataKey] instanceof Date) {
                     sheetRowData[headerName] = Utilities.formatDate(dataToSave[dataKey], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
                } else {
                    sheetRowData[headerName] = dataToSave[dataKey];
                }
            }
        }

        HEADERS[SHEET_NAMES.RESERVATIONS].forEach(header => {
            if (!sheetRowData.hasOwnProperty(header)) {
                sheetRowData[header] = '';
            }
        });

        Logger.log(`saveReservation - Mapped sheetRowData: ${JSON.stringify(sheetRowData)}`);

        let operationResult;
        if (isUpdate) {
            Logger.log("saveReservation: Attempting to update existing reservation ID: " + reservationIdToUpdate);
            operationResult = updateData(SHEET_NAMES.RESERVATIONS, HEADERS[SHEET_NAMES.RESERVATIONS][0], reservationIdToUpdate, sheetRowData);
        } else {
            Logger.log("saveReservation: Attempting to append new reservation.");
            operationResult = appendData(SHEET_NAMES.RESERVATIONS, sheetRowData);
        }

        if (operationResult.success) {
            if (!isUpdate && initialPaymentDetails && typeof initialPaymentDetails.amount === 'number' && initialPaymentDetails.amount > 0) {
                const paymentData = {
                    reservationId: reservationId,
                    paymentAmount: initialPaymentDetails.amount,
                    paymentDate: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), "yyyy-MM-dd"),
                    paymentMethod: initialPaymentDetails.method || 'Initial Deposit',
                    notes: 'Initial payment made during reservation.',
                };
                const initialPaymentResult = addPayment(paymentData, 'reservation');
                if (!initialPaymentResult.success) {
                    Logger.log(`Warning: Reservation ${reservationId} saved, but initial payment failed: ${initialPaymentResult.message}`);
                } else {
                    Logger.log(`Initial payment of ${initialPaymentDetails.amount} recorded for new reservation ${reservationId}.`);
                }
            } else {
                 _updateBookingPaymentStatus(reservationId, 'reservation');
            }

            responseObject.success = true;
            responseObject.message = `Reservation ${isUpdate ? 'updated' : 'saved'} successfully.`;
            responseObject.reservationId = reservationId;

            const updatedReservationData = getReservations().reservations.find(r => r.reservationId === reservationId);

            const finalDetailsForClient = { ...updatedReservationData };
            finalDetailsForClient.checkInDate = formatDateField_hoisted(finalDetailsForClient.checkInDate, 'final detail checkInDate');
            finalDetailsForClient.checkOutDate = formatDateField_hoisted(finalDetailsForClient.checkOutDate, 'final detail checkOutDate');
            finalDetailsForClient.reservationDate = finalDetailsForClient.reservationDate ? formatDateField_hoisted(finalDetailsForClient.reservationDate, 'final detail resDate') : null;

            responseObject.details = finalDetailsForClient;
            Logger.log("saveReservation - Success. Response details for client: " + JSON.stringify(responseObject.details));
        } else {
            responseObject.message = operationResult.message || `Failed to ${isUpdate ? 'update' : 'save'} reservation to sheet.`;
            Logger.log("saveReservation - Failure to write to sheet: " + responseObject.message);
        }
    } catch (e) {
        Logger.log(`CRITICAL Error in saveReservation: ${e.toString()} \nStack: ${e.stack}`);
        responseObject.success = false;
        responseObject.message = `Server error during reservation ${reservationIdToUpdate ? 'update' : 'save'}: ${e.message}`;
    } finally {
        Logger.log("saveReservation: Finalizing. Response: " + JSON.stringify(responseObject));
        return responseObject;
    }
}

/**
 * Calculates the total price for a reservation.
 * UPDATED: This version now returns the name of the tariff used in the calculation.
 * @param {object} params - The parameters for the calculation.
 * @returns {object} An object with the detailed price breakdown or an error.
 */
function calculateReservationPrice(params) {
    Logger.log("calculateReservationPrice: Called with params: " + JSON.stringify(params));
    try {
        const { boatModel, checkInDate, checkInTime, checkOutDate, checkOutTime, selectedExtras, discountPercentage } = params;
        // Note: the 'taxValue' from params is intentionally ignored.

        if (!boatModel || !checkInDate || !checkOutDate || !checkInTime || !checkOutTime) {
             return { error: "Missing params for price calculation (boatModel, checkInDate/Time, checkOutDate/Time)." };
        }
        
        const ciDateTime = parseDateTimeToUTCDate(checkInDate, checkInTime);
        const coDateTime = parseDateTimeToUTCDate(checkOutDate, checkOutTime);

        if (!ciDateTime || !coDateTime) return { error: `Invalid date/time format provided. CI: ${checkInDate}, CO: ${checkOutDate}.` };
        if (coDateTime <= ciDateTime) return { error: "Check-out date/time must be after check-in date/time."};

        const tariffsData = getTariffsPricesData();
        if (tariffsData.error) return { error: "Could not load tariff information: " + tariffsData.error };
        
        const checkInTimeValue = _parseToDateObject(checkInDate);
        if (!checkInTimeValue) return { error: `Could not parse the check-in date: ${checkInDate}` };

        Logger.log(`Searching for tariff for check-in time value: ${checkInTimeValue} (${new Date(checkInTimeValue).toUTCString()})`);

        const applicableTariffPrice = tariffsData.tariffsPrices.find(tp => {
            if (!tp.startDate || !tp.endDate) return false;
            const tariffStartTime = tp.startDate;
            let tariffEndTime = tp.endDate;
            const d = new Date(tariffEndTime);
            d.setUTCHours(23, 59, 59, 999);
            tariffEndTime = d.getTime();
            if (!tariffStartTime || !tariffEndTime) {
                Logger.log(`Skipping tariff "${tp.tariffName}" due to un-parseable dates.`);
                return false;
            }
            const isMatch = tp.boatModel === boatModel &&
                   checkInTimeValue >= tariffStartTime &&
                   checkInTimeValue <= tariffEndTime;
            if (isMatch) Logger.log(`SUCCESS: Found matching tariff: ${tp.tariffName}`);
            return isMatch;
        });

        if (!applicableTariffPrice) {
            Logger.log(`No applicable tariff found for ${boatModel} on ${checkInDate}`);
            return { error: `No applicable tariff/price for boat model "${boatModel}" on check-in date ${checkInDate}.` };
        }
        
        const nightCounts = _calculateNights(checkInDate, checkOutDate);
        const totalNights = nightCounts.totalNights;
        const normalNightsCount = nightCounts.normalNightsCount;
        const weekendNightsCount = nightCounts.weekendNightsCount;

        const totalNormalNightCost = normalNightsCount * applicableTariffPrice.rateNormalNight;
        const totalWeekendNightCost = weekendNightsCount * applicableTariffPrice.rateWeekendNight;
        const baseBoatCost = totalNormalNightCost + totalWeekendNightCost;

        let extrasCost = 0;
        if (selectedExtras) {
            try {
                const parsedExtras = JSON.parse(selectedExtras);
                for (const extraName in parsedExtras) {
                    if (parsedExtras.hasOwnProperty(extraName)) {
                        const extra = parsedExtras[extraName];
                        if (extra && extra.quantity > 0 && extra.price > 0) {
                            const effectiveNightsForExtras = (totalNights > 0 ? totalNights : 1);
                            extrasCost += (extra.unit === 'per day' ? extra.quantity * extra.price * effectiveNightsForExtras : extra.quantity * extra.price);
                        }
                    }
                }
            } catch (e) { Logger.log("Error parsing selectedExtras JSON: " + e.toString()); }
        }

        const subtotal = baseBoatCost + extrasCost;
        
        // --- MODIFICATION START ---
        // The tax is now a fixed value of 76.
        const taxAmountApplied = 76; 
        // --- MODIFICATION END ---

        const amountWithTaxBeforeDiscount = subtotal + taxAmountApplied;
        const discountRate = (parseFloat(discountPercentage) || 0) / 100;
        const discountAmount = amountWithTaxBeforeDiscount * discountRate;
        const totalCost = amountWithTaxBeforeDiscount - discountAmount;

        return {
            success: true, message: "Price calculated.",
            tariffName: applicableTariffPrice.tariffName, // <-- THIS LINE IS ADDED
            nights: totalNights,
            normalNights: normalNightsCount,
            weekendNights: weekendNightsCount,
            unitPriceNormalNight: applicableTariffPrice.rateNormalNight,
            totalNormalNightCost: parseFloat(totalNormalNightCost.toFixed(2)),
            unitPriceWeekendNight: applicableTariffPrice.rateWeekendNight,
            totalWeekendNightCost: parseFloat(totalWeekendNightCost.toFixed(2)),
            baseBoatCost: parseFloat(baseBoatCost.toFixed(2)),
            extrasCost: parseFloat(extrasCost.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            taxValue: 76, // Ensure the fixed value is returned to be saved in the sheet
            taxAmountApplied: parseFloat(taxAmountApplied.toFixed(2)),
            amountWithTaxBeforeDiscount: parseFloat(amountWithTaxBeforeDiscount.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2))
        };

    } catch (e) {
        Logger.log(`Error in calculateReservationPrice: ${e.toString()} \nStack: ${e.stack}`);
        return { error: `Server error calculating price: ${e.message}` };
    }
}


function cancelReservation(reservationId) {
    Logger.log(`cancelReservation: ID: ${reservationId}`);
    try {
        if (!reservationId) return { success: false, message: "Missing Reservation ID." };
        const statusHeaderName = HEADERS[SHEET_NAMES.RESERVATIONS][HEADERS[SHEET_NAMES.RESERVATIONS].indexOf('Status')];
        if (!statusHeaderName) return { success: false, message: "Status header name not found in definition."};
        const updatedStatus = { [statusHeaderName]: 'Cancelled' };
        const result = updateData(SHEET_NAMES.RESERVATIONS, HEADERS[SHEET_NAMES.RESERVATIONS][0], reservationId, updatedStatus);
        if (result.success) {
            _updateBookingPaymentStatus(reservationId, 'reservation');
        }
        return result;
    } catch (e) {
        Logger.log(`Error in cancelReservation: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

// --- PDF Generation (Reservations and Lists) ---
function generateInvoicePdfHtml(details, lang = 'en') {
  const formatDateForInvoiceDisplay = (dateStr, timeStr = '') => {
    if (!dateStr) return 'N/A';
    try {
        const dateObj = parseDateTimeToUTCDate(dateStr, timeStr || "00:00");
        if (!dateObj || isNaN(dateObj.getTime())) return `${dateStr} ${timeStr || ''}`.trim();

        let display = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
        if (timeStr && /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr.trim())) {
             const formattedTime = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "HH:mm");
             display += ` ${formattedTime}`;
        }
        return display.trim();
    } catch (e) {
        Logger.log(`Error in formatDateForInvoiceDisplay for ${dateStr}, ${timeStr}: ${e}`);
        return `${dateStr} ${timeStr || ''}`.trim();
    }
  };

  let itemsHtml = '';
  const boatName = details.boatNameAuto || _s('invoice_boat_rental', lang, {}, lang);

  let boatRentalItemsAdded = false;

  if (details.normalNights && details.normalNights > 0 && typeof details.totalNormalNightCost === 'number' && typeof details.unitPriceNormalNight === 'number') {
    const description = _s('invoice_item_boat_normal_nights', lang, { boatName: boatName });
    itemsHtml += `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">${description}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${details.normalNights}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(details.unitPriceNormalNight).toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(details.totalNormalNightCost).toFixed(2)}</td>
      </tr>
    `;
    boatRentalItemsAdded = true;
  }

  if (details.weekendNights && details.weekendNights > 0 && typeof details.totalWeekendNightCost === 'number' && typeof details.unitPriceWeekendNight === 'number') {
    const description = _s('invoice_item_boat_weekend_nights', lang, { boatName: boatName });
    itemsHtml += `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">${description}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${details.weekendNights}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(details.unitPriceWeekendNight).toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(details.totalWeekendNightCost).toFixed(2)}</td>
      </tr>
    `;
    boatRentalItemsAdded = true;
  }

  if (!boatRentalItemsAdded && details.baseBoatCost > 0) {
      const numNights = details.numberOfNights || details.nights || 0;
      const description = _s('invoice_item_boat_rental_generic', lang, { boatName: boatName, numNights: numNights });
      itemsHtml += `
    <tr>
      <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">${description}</td>
      <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${numNights}</td>
      <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${_s('invoice_calculated', lang)}</td>
      <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(details.baseBoatCost || 0).toFixed(2)}</td>
    </tr>
  `;
  }

  if (details.extrasBooked) {
    try {
      const extras = JSON.parse(details.extrasBooked);
      const numNightsForExtras = details.numberOfNights || details.nights || 0;
      for (const extraName in extras) {
        if (extras.hasOwnProperty(extraName)) {
          const extraDetail = extras[extraName];
          const effectiveNightsForExtra = (numNightsForExtras > 0 ? numNightsForExtras : 1);
          const extraTotalCost = extraDetail.quantity * extraDetail.price * (extraDetail.unit === 'per day' ? effectiveNightsForExtra : 1);
          const unitDisplay = extraDetail.unit === 'per day' ? _s('unit_per_day', lang) : _s('unit_per_booking', lang);
          itemsHtml += `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">${_s('invoice_extra_prefix', lang)}: ${extraName}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${extraDetail.quantity} (${unitDisplay})</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${(extraDetail.price || 0).toFixed(2)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">€${extraTotalCost.toFixed(2)}</td>
            </tr>
          `;
        }
      }
    } catch (e) {
      Logger.log("Error parsing extras for PDF invoice HTML: " + e);
      itemsHtml += `<tr><td colspan="4" style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">Error displaying extras.</td></tr>`;
    }
  }

  let paymentsHtml = '';
  if (details.reservationId && !details.isPreview) {
    const paymentsResult = getPaymentsForReservation(details.reservationId);
    if (paymentsResult.success && paymentsResult.payments && paymentsResult.payments.length > 0) {
        paymentsHtml += `
          <div style="margin-top: 15mm; margin-bottom: 5mm;">
            <h4 style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm; border-bottom: 1px solid #eee; padding-bottom:1mm;">${_s('invoice_payments_made', lang)}</h4>
            <table class="items-table" style="font-size:10pt; margin-bottom:0;">
              <thead><tr>
                <th style="text-align:left; padding: 2mm;">${_s('payments_date', lang)}</th>
                <th style="text-align:left; padding: 2mm;">${_s('payments_method', lang)}</th>
                <th style="text-align:right; padding: 2mm;">${_s('payments_amount', lang)}</th>
              </tr></thead>
              <tbody>`;
        paymentsResult.payments.forEach(p => {
            paymentsHtml += `
              <tr>
                <td style="padding: 2mm;">${formatDateForPdfDisplay(p.paymentDate, lang)}</td>
                <td style="padding: 2mm;">${p.paymentMethod || 'N/A'}</td>
                <td style="text-align:right; padding: 2mm;">€${(p.paymentAmount || 0).toFixed(2)}</td>
              </tr>`;
        });
        paymentsHtml += `</tbody></table></div>`;
    }
  } else if (details.isPreview && details.initialPaymentAmount > 0) {
     paymentsHtml += `
          <div style="margin-top: 15mm; margin-bottom: 5mm;">
            <h4 style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm; border-bottom: 1px solid #eee; padding-bottom:1mm;">${_s('invoice_payments_made', lang)}</h4>
            <table class="items-table" style="font-size:10pt; margin-bottom:0;">
              <thead><tr>
                <th style="text-align:left; padding: 2mm;">${_s('payments_date', lang)}</th>
                <th style="text-align:left; padding: 2mm;">${_s('payments_method', lang)}</th>
                <th style="text-align:right; padding: 2mm;">${_s('payments_amount', lang)}</th>
              </tr></thead>
              <tbody>
                <tr>
                    <td style="padding: 2mm;">${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")} (${_s('status.Preview', lang)})</td>
                    <td style="padding: 2mm;">${details.initialPaymentMethod || _s('payments_method_other', lang)}</td>
                    <td style="text-align:right; padding: 2mm;">€${(details.initialPaymentAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody></table></div>`;
  }

  let discountHtml = '';
  if (details.discountAmount && details.discountAmount > 0) {
      discountHtml = `<p>${_s('invoice_discount', lang)} (${details.discountPercentage || 0}%): <span>-€${(details.discountAmount || 0).toFixed(2)}</span></p>`;
  }

  const html = `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-box { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; border: none; box-shadow: none; font-size: 10pt; line-height: 1.4; box-sizing: border-box; background: white; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 7mm; padding-bottom: 5mm; border-bottom: 0.7mm solid #6b7280;}
          .client-details { margin-bottom: 7mm; } .client-details p { margin: 1mm 0; font-size: 10pt; }
          .booking-dates { margin-bottom: 5mm; font-size: 10pt; border-bottom: 0.3mm solid #eee; padding-bottom: 3mm; }
          .booking-dates p { margin: 1mm 0; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 7mm; }
          .items-table th, .items-table td { border: 0.3mm solid #ddd; padding: 2mm 2.5mm; font-size: 9pt; }
          .items-table th { background-color: #D1D5DB; color: #1F2937; text-align: left; font-weight:bold; } /* Updated header style */
          .items-table td.text-right, .items-table th.text-right { text-align: right; }
          .items-table td.text-center, .items-table th.text-center { text-align: center; }
          .totals { text-align: right; margin-top: 7mm; } .totals p { margin: 1.5mm 0; font-size: 10pt; }
          .totals .grand-total { font-size: 12pt; font-weight: bold; }
          .totals .amount-due { font-size: 12pt; font-weight: bold; color: #c00; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <h2 style="font-size: 16pt; font-weight: bold; color: #333; margin:0;">${_s('invoice_header', lang)}</h2>
              <p style="color: #555; margin: 1mm 0; font-size: 10pt;">AMIEIRA MARINA</p>
            </div>
          </div>
          <div style="margin-bottom: 7mm; font-size: 9pt;">
            <p><strong>${_s('invoice_date_issued', lang)}</strong> ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")}</p>
          </div>
          <div class="client-details">
            <p><strong>${details.clientName || 'N/A'}</strong></p>
            ${details.clientEmail ? `<p>${details.clientEmail}</p>` : ''}
          </div>
          <div class="booking-dates">
            <p><strong>${_s('invoice_check_in_datetime_label', lang)}</strong> ${formatDateForInvoiceDisplay(details.checkInDate, details.checkInTime)}</p>
            <p><strong>${_s('invoice_check_out_datetime_label', lang)}</strong> ${formatDateForInvoiceDisplay(details.checkOutDate, details.checkOutTime)}</p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>${_s('invoice_item_desc', lang)}</th>
                <th class="text-center">${_s('invoice_item_qty', lang)}</th>
                <th class="text-right">${_s('invoice_item_unit_price', lang)}</th>
                <th class="text-right">${_s('invoice_item_total', lang)}</th>
              </tr>
            </thead>
            <tbody> ${itemsHtml} </tbody>
          </table>
          ${paymentsHtml}
          <div class="totals">
            <p>${_s('invoice_subtotal', lang)} <span>€${(details.subtotal || 0).toFixed(2)}</span></p>
            <p>${_s('invoice_tax_applied', lang)} <span>€${(details.taxAmountApplied || 0).toFixed(2)}</span></p>
            <p>${_s('invoice_total_before_discount', lang)} <span>€${(details.amountWithTaxBeforeDiscount || 0).toFixed(2)}</span></p>
            ${discountHtml}
            <p><strong>${_s('newReservation.summaryTotalCost', lang)}:</strong> <span>€${(details.totalCost || 0).toFixed(2)}</span></p>
            <p><strong>${_s('payments_total_paid', lang)}:</strong> <span>€${(details.totalPaid || 0).toFixed(2)}</span></p>
            <hr style="border: 0; border-top: 0.3mm solid #ccc; margin: 3mm 0;">
            <p class="${(details.amountDue > 0) ? 'amount-due' : 'grand-total'}">${_s('invoice_total_due', lang)} <span>€${(details.amountDue || 0).toFixed(2)}</span></p>
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}

// --- PDF Generation (Reservations and Lists) ---

function generateReportPdf(reportParamsWithLang) {
    const lang = reportParamsWithLang.lang || 'pt'; // Default to Portuguese for this design
    const reportParams = { ...reportParamsWithLang };
    delete reportParams.lang;

    Logger.log(`generateReportPdf: Called for lang '${lang}' with params: ` + JSON.stringify(reportParams));
    try {
        const { startDate, endDate } = reportParams;
        if (!startDate || !endDate) {
            return { success: false, error: "Start date and end date are required for the report." };
        }
        const reservationsData = getReservations();
        if (reservationsData.error) {
            return { success: false, error: `Failed to fetch reservations for report: ${reservationsData.error}` };
        }
        const allReservations = reservationsData.reservations;

        const filterStartDate = parseDateTimeToUTCDate(startDate, "00:00:00");
        const filterEndDate = parseDateTimeToUTCDate(endDate, "23:59:59");
        if (!filterStartDate || !filterEndDate) {
             return { success: false, error: `Invalid start or end date format for report. Start: ${startDate}, End: ${endDate}` };
        }

        // Filtering logic now also excludes 'Pending' status
        const checkIns = allReservations.filter(res => {
            if (!res.checkInDate) return false;
            const resCiDate = parseDateTimeToUTCDate(res.checkInDate, res.checkInTime || "00:00");
            return resCiDate && resCiDate >= filterStartDate && resCiDate <= filterEndDate && res.status !== 'Cancelled' && res.status !== 'Pending';
        });
        const checkOuts = allReservations.filter(res => {
            if (!res.checkOutDate) return false;
            const resCoDate = parseDateTimeToUTCDate(res.checkOutDate, res.checkOutTime || "00:00");
            return resCoDate && resCoDate >= filterStartDate && resCoDate <= filterEndDate && res.status !== 'Cancelled' && res.status !== 'Pending';
        });
        
        const travelsData = getDailyTravels();
        let dailyTravels = [];
        if(travelsData.success) {
            dailyTravels = travelsData.travels.filter(t => {
                if(!t.travelDate) return false;
                const travelDate = parseDateTimeToUTCDate(t.travelDate, "00:00");
                return travelDate && travelDate >= filterStartDate && travelDate <= filterEndDate && t.status !== 'Cancelled'  && t.status !== 'Pending';
            });
        }
       
        const reportData = { checkIns, checkOuts, dailyTravels };
        const htmlContent = generateReportPdfHtml(reportData, startDate, endDate, lang);
        const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `Semana-${startDate}-a-${endDate}.html`).getAs(MimeType.PDF);
        const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
        const fileName = `Semana_${startDate}_a_${endDate}.pdf`;
        Logger.log("generateReportPdf: PDF report generated successfully: " + fileName);
        return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
    } catch (e) {
        Logger.log(`Error in generateReportPdf: ${e.toString()} \nStack: ${e.stack}`);
        return { success: false, error: `Server error generating PDF report: ${e.message}` };
    }
}

/**
 * Generates the HTML content for the weekly/monthly reservation report PDF.
 * This function builds the structure and content for the report.
 * @param {object} reportData - Contains arrays for checkIns, checkOuts, and dailyTravels.
 * @param {string} startDate - The start date of the report period.
 * @param {string} endDate - The end date of the report period.
 * @param {string} lang - The language for translations.
 * @returns {string} The complete HTML string for the PDF.
 */
function generateReportPdfHtml(reportData, startDate, endDate, lang = 'pt') {
    const { checkIns, checkOuts, dailyTravels } = reportData;
    
    const weekDays = {
        pt: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    const dayNames = weekDays[lang] || weekDays.pt; 

    const getDayName = (dateStr) => {
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            return dayNames[date.getUTCDay()]; 
        } catch (e) {
            Logger.log(`Error getting day name for ${dateStr}: ${e}`);
            return 'Err';
        }
    };

    const formatShortDate = (dateStr) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}`;
    };


    const buildCheckInTableBody = (reservations) => {
        if (!reservations || reservations.length === 0) return `<tr><td colspan="7" class="no-data-message">Nenhuma entrada para o período selecionado</td></tr>`;
        const grouped = reservations.reduce((acc, res) => {
            (acc[res.checkInDate] = acc[res.checkInDate] || []).push(res);
            return acc;
        }, {});

        let html = '';
        let dayGroupIndex = 0;
        for (const date of Object.keys(grouped).sort()) {
            const dayReservations = grouped[date].sort((a, b) => (a.checkInTime || '00:00').localeCompare(b.checkInTime || '00:00'));
            const bgClass = dayGroupIndex % 2 !== 0 ? 'day-group-odd' : ''; 

            dayReservations.forEach((res, index) => {
                html += `<tr class="${bgClass}">`;
                if (index === 0) { 
                    html += `<td rowspan="${dayReservations.length}" class="text-center">${formatShortDate(date)}</td>
                             <td rowspan="${dayReservations.length}">${getDayName(date)}</td>`;
                }
                
                const boatNameParts = (res.boatNameAuto || 'N/A').split(' ');
                const boatNameOnly = boatNameParts.length > 1 ? boatNameParts.slice(1).join(' ') : boatNameParts[0];
                // MODIFICATION: Use full client name instead of just the first name
                const clientFullName = res.clientName || '';
                const boatAndClientDisplay = clientFullName ? `${boatNameOnly} (${clientFullName})` : boatNameOnly;

                html += `<td class="text-center">${res.checkInTime || ''}</td>
                         <td>${boatAndClientDisplay}</td>
                         <td class="text-center">${res.numberOfNights || ''}</td>
                         <td>${res.reservationSource || ''}</td>
                         <td>${parseExtrasForReport(res.extrasBooked, lang) || ''}</td></tr>`;
            });
            dayGroupIndex++;
        }
        return html;
    };

    const buildCheckOutTableBody = (reservations) => {
        if (!reservations || reservations.length === 0) return `<tr><td colspan="4" class="no-data-message">Nenhuma saída para o período selecionado</td></tr>`;
        const grouped = reservations.reduce((acc, res) => {
            (acc[res.checkOutDate] = acc[res.checkOutDate] || []).push(res);
            return acc;
        }, {});

        let html = '';
        let dayGroupIndex = 0;
        for (const date of Object.keys(grouped).sort()) {
            const dayReservations = grouped[date].sort((a, b) => (a.checkOutTime || '00:00').localeCompare(b.checkOutTime || '00:00'));
            const bgClass = dayGroupIndex % 2 !== 0 ? 'day-group-odd' : '';

            dayReservations.forEach((res, index) => {
                html += `<tr class="${bgClass}">`;
                if (index === 0) {
                    html += `<td rowspan="${dayReservations.length}" class="text-center">${formatShortDate(date)}</td>
                             <td rowspan="${dayReservations.length}">${getDayName(date)}</td>`;
                }
                
                const boatNameParts = (res.boatNameAuto || 'N/A').split(' ');
                const boatNameOnly = boatNameParts.length > 1 ? boatNameParts.slice(1).join(' ') : boatNameParts[0];
                // MODIFICATION: Use full client name instead of just the first name
                const clientFullName = res.clientName || '';
                const boatAndClientDisplay = clientFullName ? `${boatNameOnly} (${clientFullName})` : boatNameOnly;

                html += `<td class="text-center">${res.checkOutTime || ''}</td>
                         <td>${boatAndClientDisplay}</td></tr>`;
            });
            dayGroupIndex++;
        }
        return html;
    };

    const buildTravelsTableBody = (travels) => {
        if (!travels || travels.length === 0) return `<tr><td colspan="6" class="no-data-message">Nenhum passeio agendado para o período</td></tr>`;
        let html = '';
        travels.sort((a, b) => (a.travelDate + a.travelTime).localeCompare(b.travelDate + b.travelTime));
        travels.forEach(t => {
            const totalPassengers = (parseInt(t.adults) || 0) + (parseInt(t.kids) || 0) + (parseInt(t.seniors) || 0);
            html += `
                <tr>
                    <td class="text-center">${formatShortDate(t.travelDate)}</td>
                    <td>${getDayName(t.travelDate)}</td>
                    <td class="text-center">${t.travelTime || 'N/A'}</td>
                    <td>${t.clientName || 'N/A'}</td>
                    <td>${t.tripName || 'N/A'}</td>
                    <td class="text-center">${totalPassengers}</td>
                </tr>`;
        });
        return html;
    };

    const checkInsHtml = buildCheckInTableBody(checkIns);
    const checkOutsHtml = buildCheckOutTableBody(checkOuts);
    const travelsHtml = buildTravelsTableBody(dailyTravels);

    const html = `
    <html>
    <head>
        <style>
            @page { size: A4 portrait; margin: 0.8cm; }
            body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                color: #000; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .report-container { width: 100%; }
            .report-header { 
                text-align: center; 
                margin-bottom: 4mm;
                font-size: 10pt; 
                font-weight: bold; 
            }
            .section-title { 
                font-size: 11pt;
                font-weight: bold; 
                color: #ffffff; 
                background-color: #003366;
                padding: 2px 6px;
                margin-top: 4mm;
                margin-bottom: 0;
                border: 1px solid #000;
            }
            .report-table { 
                width: 100%; 
                border-collapse: collapse; 
                border: 1.5px solid #000;
            }
            .report-table th { 
                background-color: #8DB3E2;
                color: #000000; 
                border: 0.5px solid #000; 
                padding: 2px 3px;
                font-size: 8pt; 
                font-weight: bold; 
                text-align: center; 
            }
            .report-table td { 
                border: 0.5px solid #000;
                padding: 1px 3px;
                vertical-align: middle; 
                font-size: 9pt; /* MODIFICATION: Increased font size for data rows */
                line-height: 1.2; /* MODIFICATION: Adjusted line height for larger font */
            }
            .report-table .text-center { text-align: center; }
            .day-group-odd { background-color: #FDEFC8; }
            .no-data-message { 
                text-align: center; 
                font-style: italic; 
                color: #555; 
                padding: 10px;
                font-size: 8pt;
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="report-header">Semana de ${formatDateForPdfDisplay(startDate, lang)} a ${formatDateForPdfDisplay(endDate, lang)}</div>
            
            <div class="section-title">${_s('report_checkins_header', lang)}</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th style="width:8%;">${_s('report_date_col', lang)}</th>
                        <th style="width:10%;">${_s('report_day_col', lang)}</th>
                        <th style="width:8%;">${_s('report_time_col', lang)}</th>
                        <th style="width:36%;">${_s('report_boat_name', lang)}</th>
                        <th style="width:8%;">${_s('report_nights', lang)}</th>
                        <th style="width:14%;">${_s('report_recorded_by', lang)}</th>
                        <th style="width:10%;">${_s('report_extras_booked', lang)}</th> <!-- MODIFICATION: Decreased width of Extras column -->
                    </tr>
                </thead>
                <tbody>${checkInsHtml}</tbody>
            </table>
            
            <div class="section-title">${_s('report_checkouts_header', lang)}</div>
            <table class="report-table">
                 <thead>
                    <tr>
                        <th style="width:8%;">${_s('report_date_col', lang)}</th>
                        <th style="width:10%;">${_s('report_day_col', lang)}</th>
                        <th style="width:8%;">${_s('report_time_col', lang)}</th>
                        <th style="width:74%;">${_s('report_boat_name', lang)}</th>
                    </tr>
                </thead>
                <tbody>${checkOutsHtml}</tbody>
            </table>

            <div class="section-title">${_s('report_daily_travels_header', lang)}</div>
             <table class="report-table">
                <thead>
                    <tr>
                        <th style="width:8%;">${_s('report_date_col', lang)}</th>
                        <th style="width:10%;">${_s('report_day_col', lang)}</th>
                        <th style="width:8%;">${_s('report_time_col', lang)}</th>
                        <th>${_s('report_travel_client', lang)}</th>
                        <th>${_s('report_travel_trip', lang)}</th>
                        <th style="width:12%;">${_s('report_travel_passengers', lang)}</th>
                    </tr>
                </thead>
                <tbody>${travelsHtml}</tbody>
            </table>
        </div>
    </body>
    </html>`;
    return html;
}



function generateInvoicePdf(invoiceDetailsObjectWithLang) {
  const lang = invoiceDetailsObjectWithLang.lang || 'en';
  let invoiceDetailsObject = { ...invoiceDetailsObjectWithLang };
  delete invoiceDetailsObject.lang;

  Logger.log(`generateInvoicePdf: Called for lang '${lang}' with details: ` + JSON.stringify(invoiceDetailsObject).substring(0, 500) + "...");
  try {
    const reservationData = getReservations().reservations.find(r => r.reservationId === invoiceDetailsObject.reservationId);
    if (reservationData) {
        invoiceDetailsObject = {
            ...reservationData,
            ...invoiceDetailsObject,
        };
        invoiceDetailsObject.checkInDate = formatDateField_hoisted(invoiceDetailsObject.checkInDate, 'invoice CI');
        invoiceDetailsObject.checkOutDate = formatDateField_hoisted(invoiceDetailsObject.checkOutDate, 'invoice CO');

    } else if (!invoiceDetailsObject.isPreview) {
        Logger.log(`generateInvoicePdf: Could not find reservation ${invoiceDetailsObject.reservationId} to fetch full payment details. Proceeding with passed data.`);
    }


    if (typeof invoiceDetailsObject.totalNormalNightCost === 'undefined' ||
        typeof invoiceDetailsObject.unitPriceNormalNight === 'undefined' ||
        ((invoiceDetailsObject.normalNights > 0 || invoiceDetailsObject.weekendNights > 0) &&
         (invoiceDetailsObject.baseBoatCost === 0 || typeof invoiceDetailsObject.baseBoatCost === 'undefined' ) &&
         (typeof invoiceDetailsObject.totalCost === 'undefined'))) {

        Logger.log("generateInvoicePdf: Price details seem incomplete. Recalculating for invoice...");
        const priceParams = {
            boatModel: invoiceDetailsObject.boatModelAuto,
            checkInDate: invoiceDetailsObject.checkInDate,
            checkInTime: invoiceDetailsObject.checkInTime,
            checkOutDate: invoiceDetailsObject.checkOutDate,
            checkOutTime: invoiceDetailsObject.checkOutTime,
            selectedExtras: invoiceDetailsObject.extrasBooked,
            discountPercentage: invoiceDetailsObject.discountPercentage,
            taxValue: invoiceDetailsObject.taxValue,
        };

        priceParams.checkInDate = formatDateField_hoisted(priceParams.checkInDate, 'invoice recalc CI date');
        priceParams.checkOutDate = formatDateField_hoisted(priceParams.checkOutDate, 'invoice recalc CO date');
        priceParams.checkInTime = formatTimeValue_hoisted(priceParams.checkInTime, 'invoice recalc CI time') || "00:00";
        priceParams.checkOutTime = formatTimeValue_hoisted(priceParams.checkOutTime, 'invoice recalc CO time') || "00:00";

        const freshPriceResult = calculateReservationPrice(priceParams);
        if (freshPriceResult.error) {
            Logger.log("generateInvoicePdf: Error recalculating price: " + freshPriceResult.error + ". Proceeding with existing details, which might be incomplete.");
        } else {
            const existingTotalPaid = invoiceDetailsObject.totalPaid;
            invoiceDetailsObject = {...invoiceDetailsObject, ...freshPriceResult};
            if (typeof existingTotalPaid === 'number') {
                invoiceDetailsObject.totalPaid = existingTotalPaid;
            }
            invoiceDetailsObject.amountDue = (invoiceDetailsObject.totalCost || 0) - (invoiceDetailsObject.totalPaid || 0);
            if(invoiceDetailsObject.amountDue < 0) invoiceDetailsObject.amountDue = 0;
            Logger.log("generateInvoicePdf: Successfully recalculated price details for PDF.");
        }
    } else {
         Logger.log("generateInvoicePdf: Price details appear sufficiently complete.");
         if(typeof invoiceDetailsObject.totalCost === 'number' && typeof invoiceDetailsObject.totalPaid === 'number'){
            invoiceDetailsObject.amountDue = invoiceDetailsObject.totalCost - invoiceDetailsObject.totalPaid;
            if(invoiceDetailsObject.amountDue < 0) invoiceDetailsObject.amountDue = 0;
         }
    }


    const htmlContent = generateInvoicePdfHtml(invoiceDetailsObject, lang);
    const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `Breakdown-${invoiceDetailsObject.reservationId || 'preview'}.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `Breakdown-${invoiceDetailsObject.reservationId || 'PREVIEW'}-${new Date().toISOString().split('T')[0]}.pdf`;
    Logger.log("generateInvoicePdf: PDF generated: " + fileName);
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch (e) {
    Logger.log(`Error in generateInvoicePdf: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, error: `Server error generating PDF: ${e.message}` };
  }
}


function parseExtrasForReport(extrasBookedJson, lang = 'en') {
    if (!extrasBookedJson || extrasBookedJson === "{}" || extrasBookedJson.trim() === "") return '';
    try {
        const extras = JSON.parse(extrasBookedJson);
        const extraItems = [];
        for (const extraName in extras) {
            if (extras.hasOwnProperty(extraName)) {
                const detail = extras[extraName];
                extraItems.push(`${extraName} (x${detail.quantity || 0})`);
            }
        }
        return extraItems.length > 0 ? extraItems.join(', ') : '';
    } catch (e) {
        Logger.log("Error parsing extras for report: " + e + ". JSON: " + extrasBookedJson);
        return _s('report_error_parsing_extras', lang);
    }
}


const PDF_COMMON_STYLES = `
  body { font-family: Arial, sans-serif; margin: 0; color: #333; }
  .pdf-container { width: 100%; margin: 0; padding: 20mm; box-sizing: border-box; }
  .pdf-header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #4A5568; }
  .pdf-main-title { font-size: 20px; font-weight: bold; color: #2D3748; margin:0; }
  .pdf-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 10pt; }
  .pdf-table th, .pdf-table td { border: 1px solid #CBD5E0; padding: 8px 10px; text-align: left; vertical-align: top;}
  .pdf-table th { background-color: #E2E8F0; font-weight: bold; color: #4A5568; }
  .pdf-table td.text-right, .pdf-table th.text-right { text-align: right; }
  .pdf-table td.text-center, .pdf-table th.text-center { text-align: center; }
  .pdf-footer { text-align: center; font-size: 9pt; color: #718096; margin-top: 30px; padding-top: 10px; border-top: 1px solid #E2E8F0; }
  .tariff-period-title { font-size: 16px; font-weight: bold; color: #2D3748; margin-top: 25px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #CBD5E0; }
  .no-data-message { text-align: center; color: #718096; padding: 20px; }
`;

function generateBoatsListPdfHtml(boats, lang = 'en') {
  let itemsHtml = '';
  if (boats && boats.length > 0) {
    boats.forEach(boat => {
      itemsHtml += `
        <tr>
          <td>${boat.boatName || 'N/A'}</td>
          <td>${boat.boatModel || 'N/A'}</td>
        </tr>`;
    });
  } else {
    itemsHtml = `<tr><td colspan="2" class="no-data-message">${_s('report_none', lang)}</td></tr>`;
  }

  return `
<html><head><style>${PDF_COMMON_STYLES}</style></head><body><div class="pdf-container">
  <div class="pdf-header-container">
    <h1 class="pdf-main-title">${_s('boats_list_header', lang)}</h1>
  </div>
  <table class="pdf-table">
    <thead><tr>
      <th>${_s('boats_list_boat_name', lang)}</th>
      <th>${_s('boats_list_boat_model', lang)}</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="pdf-footer">${_s('boats_list_generated_on', lang)} ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}</div>
</div></body></html>`;
}

function generateBoatsListPdf(paramsWithLang) {
  const lang = paramsWithLang.lang || 'en';
  Logger.log(`generateBoatsListPdf: Called for lang '${lang}'.`);
  try {
    const boatsData = getBoatsData();
    if (boatsData.error) {
      return { success: false, error: `Failed to fetch boats data: ${boatsData.error}` };
    }
    const htmlContent = generateBoatsListPdfHtml(boatsData.boats, lang);
    const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `BoatsList-${new Date().toISOString().split('T')[0]}.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `AmieiraMarina_Boats_${new Date().toISOString().split('T')[0]}.pdf`;
    Logger.log("generateBoatsListPdf: PDF generated: " + fileName);
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch (e) {
    Logger.log(`Error in generateBoatsListPdf: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, error: `Server error generating boats list PDF: ${e.message}` };
  }
}

function getRawTariffDefinitions() {
  Logger.log("getRawTariffDefinitions: Fetching all tariff definitions.");
  try {
    const rawTariffs = getData(SHEET_NAMES.TARIFFS);
    if (!Array.isArray(rawTariffs)) {
      Logger.log("getRawTariffDefinitions: getData returned non-array or null for Tariffs sheet.");
      return { success: false, error: "Could not load tariff definitions.", definitions: [] };
    }
    const processedTariffs = rawTariffs.map(t => ({
        name: t[HEADERS[SHEET_NAMES.TARIFFS][0]],
        startDate: t[HEADERS[SHEET_NAMES.TARIFFS][1]] instanceof Date ? Utilities.formatDate(t[HEADERS[SHEET_NAMES.TARIFFS][1]], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(t[HEADERS[SHEET_NAMES.TARIFFS][1]]),
        endDate: t[HEADERS[SHEET_NAMES.TARIFFS][2]] instanceof Date ? Utilities.formatDate(t[HEADERS[SHEET_NAMES.TARIFFS][2]], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(t[HEADERS[SHEET_NAMES.TARIFFS][2]]),
    }));
    return { success: true, definitions: processedTariffs };
  } catch (e) {
    Logger.log(`Error in getRawTariffDefinitions: ${e.toString()}`);
    return { success: false, error: `Server error fetching tariff definitions: ${e.message}`, definitions: [] };
  }
}

function generateTariffsBrochurePdfHtml(tariffsPrices, allRawTariffDefinitions, lang = 'en') {
  let htmlBodyContent = '';
  const brochureYear = new Date().getFullYear();

  const desiredBoatModelOrder = ["Nicols Duo", "Nicols Quattro", "Nicols 1010", "Nicols 1100", "Nicols 1170", "Nicols 1310", "Nicols 1350"];
  let uniqueBoatModels = [...new Set(tariffsPrices.map(tp => tp.boatModel))];
  uniqueBoatModels.sort((a, b) => {
    const indexA = desiredBoatModelOrder.indexOf(a);
    const indexB = desiredBoatModelOrder.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return (a || '').localeCompare(b || '');
  });


  const tariffsColumnsData = {};
  allRawTariffDefinitions.forEach(def => {
    if (!def.name || !def.startDate || !def.endDate) return;
    if (!tariffsColumnsData[def.name]) {
      tariffsColumnsData[def.name] = {
        name: def.name,
        dateRanges: []
      };
    }
    tariffsColumnsData[def.name].dateRanges.push({
      start: def.startDate,
      end: def.endDate,
      display: `${formatDateForPdfDisplay(def.startDate, lang).slice(0,5)} / ${formatDateForPdfDisplay(def.endDate, lang).slice(0,5)}`
    });
  });

  for (const tariffName in tariffsColumnsData) {
    tariffsColumnsData[tariffName].dateRanges.sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  const desiredTariffOrder = ["Tarifa B", "Tarifa C", "Tarifa E"];
  let sortedTariffColumns = Object.values(tariffsColumnsData).sort((a, b) => {
    const indexA = desiredTariffOrder.indexOf(a.name);
    const indexB = desiredTariffOrder.indexOf(b.name);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  let tableHeaderHtml = '<tr>';
  tableHeaderHtml += `<th class="boat-model-header-empty"></th>`;
  sortedTariffColumns.forEach((col, index) => {
    let dateRangesHtml = col.dateRanges.map(range => `<span class="date-range">${range.display}</span>`).join('<br>');
    const colBgClass = index % 2 === 0 ? 'tariff-col-bg-light' : 'tariff-col-bg-dark';
    tableHeaderHtml += `<th class="text-center tariff-header ${colBgClass}"><div>${col.name}</div>${dateRangesHtml ? dateRangesHtml : ''}</th>`;
  });
  tableHeaderHtml += '</tr>';

  let tableBodyHtml = '';
  if (uniqueBoatModels.length === 0 || sortedTariffColumns.length === 0) {
    tableBodyHtml = `<tr><td colspan="${1 + sortedTariffColumns.length}" class="no-data-message">${_s('report_none', lang)}</td></tr>`;
  } else {
    uniqueBoatModels.forEach(boatModel => {
      tableBodyHtml += `<tr><td class="boat-model-cell-main" colspan="${1 + sortedTariffColumns.length}">${boatModel}</td></tr>`;

      tableBodyHtml += '<tr>';
      tableBodyHtml += `<td class="night-type-label">${_s('tariffs_brochure_row_normal_night_label', lang)}*</td>`;
      sortedTariffColumns.forEach((col, index) => {
        const priceEntry = tariffsPrices.find(tp => tp.boatModel === boatModel && tp.tariffName === col.name);
        const price = priceEntry && typeof priceEntry.rateNormalNight === 'number' ? priceEntry.rateNormalNight.toFixed(0) + ' €' : ' - ';
        const colBgClass = index % 2 === 0 ? 'tariff-col-bg-light' : 'tariff-col-bg-dark';
        tableBodyHtml += `<td class="price-cell text-center ${colBgClass}">${price}</td>`;
      });
      tableBodyHtml += '</tr>';

      tableBodyHtml += '<tr>';
      tableBodyHtml += `<td class="night-type-label">${_s('tariffs_brochure_row_weekend_night_label', lang)}*</td>`;
      sortedTariffColumns.forEach((col, index) => {
        const priceEntry = tariffsPrices.find(tp => tp.boatModel === boatModel && tp.tariffName === col.name);
        const price = priceEntry && typeof priceEntry.rateWeekendNight === 'number' ? priceEntry.rateWeekendNight.toFixed(0) + ' €' : ' - ';
        const colBgClass = index % 2 === 0 ? 'tariff-col-bg-light' : 'tariff-col-bg-dark';
        tableBodyHtml += `<td class="price-cell text-center ${colBgClass}">${price}</td>`;
      });
      tableBodyHtml += '</tr>';
    });
  }

  htmlBodyContent = `
    <table class="pdf-table tariff-brochure-new-layout">
      <thead>${tableHeaderHtml}</thead>
      <tbody>${tableBodyHtml}</tbody>
    </table>`;

  return `
<html><head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
    .pdf-container { width: 210mm; min-height:297mm; margin:0 auto; padding: 10mm; box-sizing: border-box; background: white;}
    .pdf-main-title { font-size: 16px; text-align: left; margin-bottom: 8px; font-weight: bold; }
    .pdf-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9pt; }
    .pdf-table th, .pdf-table td { border: 0.5px solid #555; padding: 3px 4px; vertical-align: middle; }
    .tariff-brochure-new-layout .boat-model-header-empty { border-top: 1px solid white; border-left: 1px solid white; background-color: white!important;}
    .tariff-brochure-new-layout .tariff-header { font-weight: bold; font-size: 10pt; padding: 4px; }
    .tariff-brochure-new-layout .tariff-header div { margin-bottom: 2px; }
    .tariff-brochure-new-layout .date-range { font-size: 7.5pt; display: block; font-weight: normal; line-height: 1.1; }
    .tariff-brochure-new-layout .boat-model-cell-main { background-color: #D0D0D0; font-weight: bold; font-size: 10pt; padding: 4px 6px; border-top: 1px solid #000; border-bottom: 0.5px solid #555; }
    .tariff-brochure-new-layout .night-type-label { padding: 3px 6px 3px 8px; font-size: 8.5pt; background-color: #F0F0F0; border-right: 1px solid #555; }
    .tariff-brochure-new-layout .price-cell { padding: 3px 4px; font-size: 9pt; }
    .tariff-col-bg-light { background-color: #FFFFFF; }
    .tariff-col-bg-dark { background-color: #E8E8E8; }
    .pdf-footer { text-align: left; font-size: 8pt; color: #777; margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #eee; }
  </style>
</head><body><div class="pdf-container">
  <div class="pdf-header-container" style="border-bottom: none; margin-bottom: 5px;">
    <h1 class="pdf-main-title">TARIFAS BARCOS-CASA ${brochureYear}</h1>
  </div>
  ${htmlBodyContent}
  <div class="pdf-footer"></div>
</div></body></html>`;
}

function generateTariffsBrochurePdf(paramsWithLang) {
  const lang = paramsWithLang.lang || 'en';
  Logger.log(`generateTariffsBrochurePdf: Called for lang '${lang}'.`);
  try {
    const tariffsPricesData = getTariffsPricesData();
    if (tariffsPricesData.error) {
      return { success: false, error: `Failed to fetch tariffs/prices data: ${tariffsPricesData.error}` };
    }
    const rawTariffDefinitionsResult = getRawTariffDefinitions();
    if (!rawTariffDefinitionsResult.success) {
      return { success: false, error: `Failed to fetch tariff definitions: ${rawTariffDefinitionsResult.error}` };
    }

    const htmlContent = generateTariffsBrochurePdfHtml(tariffsPricesData.tariffsPrices, rawTariffDefinitionsResult.definitions, lang);
    const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `TariffsBrochure-${new Date().getFullYear()}-${new Date().toISOString().split('T')[0]}.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `AmieiraMarina_Tarifas_BarcosCasa_${new Date().getFullYear()}.pdf`;
    Logger.log("generateTariffsBrochurePdf: PDF generated: " + fileName);
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch (e) {
    Logger.log(`Error in generateTariffsBrochurePdf: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, error: `Server error generating tariffs brochure PDF: ${e.message}` };
  }
}

function generateExtrasListPdfHtml(extras, lang = 'en') {
  let itemsHtml = '';
  if (extras && extras.length > 0) {
    extras.forEach(extra => {
      let unitDisplay = extra.unit;
      if (extra.unit === 'per day') unitDisplay = _s('unit_per_day', lang);
      else if (extra.unit === 'per booking') unitDisplay = _s('unit_per_booking', lang);
      itemsHtml += `
        <tr>
          <td>${extra.extraName || 'N/A'}</td>
          <td class="text-right">${(extra.price || 0).toFixed(2)}</td>
          <td>${unitDisplay}</td>
        </tr>`;
    });
  } else {
    itemsHtml = `<tr><td colspan="3" class="no-data-message">${_s('report_none', lang)}</td></tr>`;
  }

  return `
<html><head><style>${PDF_COMMON_STYLES}</style></head><body><div class="pdf-container">
  <div class="pdf-header-container">
    <h1 class="pdf-main-title">${_s('extras_list_header', lang)}</h1>
  </div>
  <table class="pdf-table">
    <thead><tr>
      <th>${_s('extras_list_extra_name', lang)}</th>
      <th class="text-right">${_s('extras_list_price', lang)}</th>
      <th>${_s('extras_list_unit', lang)}</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="pdf-footer">${_s('extras_list_generated_on', lang)} ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}</div>
</div></body></html>`;
}

// --- NEW: Function to generate the Financial Report PDF ---
// --- NEW: Function to generate the Financial Report PDF ---
function generateFinancialReportPdf(reportParamsWithLang) {
    const lang = reportParamsWithLang.lang || 'pt';
    const { startDate, endDate } = reportParamsWithLang;

    Logger.log(`generateFinancialReportPdf: Called for lang '${lang}' from ${startDate} to ${endDate}`);
    try {
        if (!startDate || !endDate) {
            return { success: false, error: "Start and end dates are required." };
        }
        
        const filterStartDate = parseDateTimeToUTCDate(startDate, "00:00:00");
        const filterEndDate = parseDateTimeToUTCDate(endDate, "23:59:59");
        if (!filterStartDate || !filterEndDate) {
            return { success: false, error: `Invalid date format. Start: ${startDate}, End: ${endDate}` };
        }

        const reservationsData = getReservations();
        const travelsData = getDailyTravels();
        
        let allTransactions = [];
        // --- MODIFICATION: Define sources to exclude ---
        const excludedSources = ['NICOLS', 'Ancorado'];

        // Filter reservations by Reservation Date
        if (reservationsData.reservations) {
            reservationsData.reservations.forEach(res => {
                const resDate = parseDateTimeToUTCDate(res.reservationDate, "00:00:00");
                // --- MODIFICATION: Add filter conditions here ---
                if (resDate && resDate >= filterStartDate && resDate <= filterEndDate &&
                    res.status !== 'Pending' && 
                    res.status !== 'Cancelled' &&
                    !excludedSources.includes(res.reservationSource)) {
                    
                    allTransactions.push({
                        date: res.reservationDate,
                        type: _s('report_financial_type_boat', lang),
                        clientName: res.clientName,
                        amount: parseFloat(res.totalCost) || 0
                    });
                }
            });
        }

        // Filter daily travels by Booking Date
        if (travelsData.travels) {
            travelsData.travels.forEach(t => {
                const bookingDate = parseDateTimeToUTCDate(t.bookingDate, "00:00:00");
                 // --- MODIFICATION: Add status filter here ---
                if (bookingDate && bookingDate >= filterStartDate && bookingDate <= filterEndDate &&
                    t.status !== 'Pending' && t.status !== 'Cancelled') {
                     allTransactions.push({
                        date: t.bookingDate,
                        type: _s('report_financial_type_travel', lang),
                        clientName: t.clientName,
                        amount: parseFloat(t.totalCost) || 0
                    });
                }
            });
        }

        // Sort transactions by date
        allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        const htmlContent = generateFinancialReportPdfHtml(allTransactions, startDate, endDate, lang);
        const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `FinancialReport-${startDate}-to-${endDate}.html`).getAs(MimeType.PDF);
        const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
        const fileName = `Financial_Report_${startDate}_to_${endDate}.pdf`;
        Logger.log("generateFinancialReportPdf: PDF generated successfully: " + fileName);
        return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };

    } catch (e) {
        Logger.log(`Error in generateFinancialReportPdf: ${e.toString()} \nStack: ${e.stack}`);
        return { success: false, error: `Server error generating financial report: ${e.message}` };
    }
}

function generateFinancialReportPdfHtml(transactions, startDate, endDate, lang = 'pt') {
    let htmlBody = '';
    let grandTotal = 0;
    
    if (transactions.length === 0) {
        htmlBody = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #555;">${_s('report_financial_no_transactions', lang)}</td></tr>`;
    } else {
        const groupedByDate = transactions.reduce((acc, curr) => {
            const dateStr = formatDateForPdfDisplay(curr.date.split(' ')[0], lang);
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(curr);
            return acc;
        }, {});

        for (const date in groupedByDate) {
            let dailyTotal = 0;
            htmlBody += `<tr><td colspan="4" class="date-header">${date}</td></tr>`;
            
            groupedByDate[date].forEach(item => {
                const itemAmount = item.amount || 0;
                htmlBody += `
                    <tr class="item-row">
                        <td>${item.clientName}</td>
                        <td>${item.type}</td>
                        <td class="text-right">€ ${itemAmount.toFixed(2)}</td>
                    </tr>
                `;
                dailyTotal += itemAmount;
            });

            htmlBody += `
                <tr class="daily-total-row">
                    <td colspan="2" class="text-right"><strong>${_s('report_financial_daily_total', lang)}</strong></td>
                    <td class="text-right"><strong>€ ${dailyTotal.toFixed(2)}</strong></td>
                </tr>
            `;
            grandTotal += dailyTotal;
        }
    }

    const html = `
    <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; }
                .report-container { width: 100%; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 16pt; }
                .header p { margin: 5px 0 0; font-size: 11pt; color: #666; }
                .report-table { width: 100%; border-collapse: collapse; }
                .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; }
                .report-table th { background-color: #f2f2f2; text-align: left; }
                .text-right { text-align: right; }
                .date-header { background-color: #e9ecef; font-weight: bold; font-size: 11pt; }
                .daily-total-row td { border-top: 2px solid #333; }
                .grand-total-row td { background-color: #e9ecef; font-weight: bold; font-size: 12pt; border-top: 3px double #333; }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>${_s('report_financial_header', lang)}</h1>
                    <p>${_s('report_financial_period', lang)} ${formatDateForPdfDisplay(startDate, lang)} - ${formatDateForPdfDisplay(endDate, lang)}</p>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>${_s('report_travel_client', lang)}</th>
                            <th>${_s('report_financial_type', lang)}</th>
                            <th class="text-right">${_s('report_financial_amount', lang)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${htmlBody}
                    </tbody>
                    <tfoot>
                        <tr class="grand-total-row">
                            <td colspan="2" class="text-right"><strong>${_s('report_financial_grand_total', lang)}</strong></td>
                            <td class="text-right"><strong>€ ${grandTotal.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </body>
    </html>`;
    return html;
}

function generateExtrasListPdf(paramsWithLang) {
  const lang = paramsWithLang.lang || 'en';
  Logger.log(`generateExtrasListPdf: Called for lang '${lang}'.`);
  try {
    const extrasData = getExtrasData();
    if (extrasData.error) {
      return { success: false, error: `Failed to fetch extras data: ${extrasData.error}` };
    }
    const htmlContent = generateExtrasListPdfHtml(extrasData.extras, lang);
    const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `ExtrasList-${new Date().toISOString().split('T')[0]}.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `AmieiraMarina_Extras_${new Date().toISOString().split('T')[0]}.pdf`;
    Logger.log("generateExtrasListPdf: PDF generated: " + fileName);
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch (e) {
    Logger.log(`Error in generateExtrasListPdf: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, error: `Server error generating extras list PDF: ${e.message}` };
  }
}

// --- Payment Management ---
function addPayment(paymentData, bookingType) {
  Logger.log("addPayment: Called with " + JSON.stringify(paymentData));
  try {
    const { reservationId, paymentAmount, paymentDate, paymentMethod, notes } = paymentData;
    if (!reservationId || !paymentAmount || !paymentDate || !paymentMethod) {
      return { success: false, message: "Missing required payment data (ID, Amount, Date, Method)." };
    }
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dataToAppend = {
      [HEADERS[SHEET_NAMES.PAYMENTS][0]]: paymentId,
      [HEADERS[SHEET_NAMES.PAYMENTS][1]]: reservationId,
      [HEADERS[SHEET_NAMES.PAYMENTS][2]]: formatDateField_hoisted(paymentDate, 'paymentDate'),
      [HEADERS[SHEET_NAMES.PAYMENTS][3]]: parseFloat(paymentAmount) || 0,
      [HEADERS[SHEET_NAMES.PAYMENTS][4]]: paymentMethod,
      [HEADERS[SHEET_NAMES.PAYMENTS][5]]: notes || '',
      [HEADERS[SHEET_NAMES.PAYMENTS][6]]: getUserEmail(),
    };
    const appendResult = appendData(SHEET_NAMES.PAYMENTS, dataToAppend);
    if (appendResult.success) {
      _updateBookingPaymentStatus(reservationId, bookingType);
      return { success: true, message: "Payment added successfully.", paymentId: paymentId };
    } else {
      return { success: false, message: `Failed to add payment: ${appendResult.message}` };
    }
  } catch (e) {
    Logger.log(`Error in addPayment: ${e.toString()}`);
    return { success: false, message: `Server error adding payment: ${e.message}` };
  }
}

function getPaymentsForReservation(bookingId) {
  Logger.log(`getPaymentsForReservation: Called for ID: ${bookingId}`);
  try {
    if (!bookingId) {
      return { success: false, error: "Booking ID is required.", payments: [] };
    }
    const allPayments = getData(SHEET_NAMES.PAYMENTS);
    if (allPayments === null) {
        return { success: false, error: `Sheet "${SHEET_NAMES.PAYMENTS}" not found or inaccessible.`, payments: [] };
    }
    const reservationPayments = allPayments.filter(p => String(p[HEADERS[SHEET_NAMES.PAYMENTS][1]]) === String(bookingId))
      .map(p => ({
        paymentId: p[HEADERS[SHEET_NAMES.PAYMENTS][0]],
        reservationId: p[HEADERS[SHEET_NAMES.PAYMENTS][1]],
        paymentDate: formatDateField_hoisted(p[HEADERS[SHEET_NAMES.PAYMENTS][2]], 'payment date'),
        paymentAmount: parseFloat(p[HEADERS[SHEET_NAMES.PAYMENTS][3]]) || 0,
        paymentMethod: p[HEADERS[SHEET_NAMES.PAYMENTS][4]],
        notes: p[HEADERS[SHEET_NAMES.PAYMENTS][5]],
        recordedBy: p[HEADERS[SHEET_NAMES.PAYMENTS][6]]
      }));

    reservationPayments.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));

    Logger.log(`getPaymentsForReservation: Found ${reservationPayments.length} payments for ID ${bookingId}`);
    return { success: true, payments: reservationPayments };
  } catch (e) {
    Logger.log(`Error in getPaymentsForReservation: ${e.toString()}`);
    return { success: false, error: `Server error fetching payments: ${e.message}`, payments: [] };
  }
}

function deletePayment(paymentId, bookingId, bookingType) {
  Logger.log(`deletePayment: Called for Payment ID: ${paymentId}, Booking ID: ${bookingId}, Type: ${bookingType}`);
  try {
    if (!paymentId || !bookingId || !bookingType) {
      return { success: false, message: "Payment ID, Booking ID, and Booking Type are required for deletion." };
    }
    const deleteResult = deleteData(SHEET_NAMES.PAYMENTS, HEADERS[SHEET_NAMES.PAYMENTS][0], paymentId);
    if (deleteResult.success) {
      _updateBookingPaymentStatus(bookingId, bookingType);
      return { success: true, message: "Payment deleted successfully." };
    } else {
      return { success: false, message: `Failed to delete payment: ${deleteResult.message}` };
    }
  } catch (e) {
    Logger.log(`Error in deletePayment: ${e.toString()}`);
    return { success: false, message: `Server error deleting payment: ${e.message}` };
  }
}

function _updateBookingPaymentStatus(bookingId, bookingType) {
  Logger.log(`_updateBookingPaymentStatus: Updating for ID ${bookingId}, Type: ${bookingType}`);
  try {
    const paymentsResult = getPaymentsForReservation(bookingId);
    if (!paymentsResult.success) {
      Logger.log(`_updateBookingPaymentStatus: Could not get payments for ${bookingId}. Error: ${paymentsResult.error}`);
      return;
    }
    const totalPaid = paymentsResult.payments.reduce((sum, p) => sum + (parseFloat(p.paymentAmount) || 0), 0);
    
    let sheetName, headers, bookingData, idHeader, totalCostHeader, totalPaidHeader, amountDueHeader;

    if (bookingType === 'reservation') {
      sheetName = SHEET_NAMES.RESERVATIONS;
      idHeader = 'Reservation ID';
      totalCostHeader = 'Total Cost';
      totalPaidHeader = 'Total Paid';
      amountDueHeader = 'Amount Due';
    } else if (bookingType === 'travel') {
      sheetName = SHEET_NAMES.DAILY_TRAVELS;
      idHeader = 'Travel ID';
      totalCostHeader = 'Total Cost';
      totalPaidHeader = 'Total Paid';
      amountDueHeader = 'Amount Due';
    } else {
      Logger.log(`_updateBookingPaymentStatus: Invalid bookingType "${bookingType}".`);
      return;
    }
    
    bookingData = getData(sheetName);
    if (!bookingData) {
        Logger.log(`_updateBookingPaymentStatus: Could not get data from sheet "${sheetName}".`);
        return;
    }
    
    const bookingToUpdate = bookingData.find(b => String(b[idHeader]) === String(bookingId));

    if (!bookingToUpdate) {
      Logger.log(`_updateBookingPaymentStatus: Booking ${bookingId} not found in sheet ${sheetName}.`);
      return;
    }

    const totalCost = parseFloat(bookingToUpdate[totalCostHeader]) || 0;
    const amountDue = totalCost - totalPaid;

    const updatePayload = {
      [totalPaidHeader]: parseFloat(totalPaid.toFixed(2)),
      [amountDueHeader]: parseFloat(amountDue.toFixed(2)) < 0 ? 0 : parseFloat(amountDue.toFixed(2))
    };

    Logger.log(`_updateBookingPaymentStatus for ${bookingId}: TotalCost=${totalCost}, TotalPaid=${totalPaid}, AmountDue=${amountDue}. Payload: ${JSON.stringify(updatePayload)}`);
    const updateResult = updateData(sheetName, idHeader, bookingId, updatePayload);

    if (updateResult.success) {
      Logger.log(`_updateBookingPaymentStatus: Successfully updated payment status for ${bookingId}.`);
    } else {
      Logger.log(`_updateBookingPaymentStatus: Failed to update payment status for ${bookingId}. Error: ${updateResult.message}`);
    }
  } catch (e) {
    Logger.log(`CRITICAL Error in _updateBookingPaymentStatus for ${bookingId}: ${e.toString()} \nStack: ${e.stack}`);
  }
}


// --- REBUILT Daily Travel Subsystem Functions ---

// REBUILT: Calculates price for a daily travel booking
function calculateTravelPrice(params) {
    Logger.log("calculateTravelPrice (new): Called with " + JSON.stringify(params));
    try {
        const { tripName, adults, kids, seniors, selectedFoodOptions, discountPercentage, taxPercentage } = params;

        const tripOptionsResult = getDailyTripOptions();
        if (!tripOptionsResult.success) return { error: "Could not load trip pricing configuration." };
        const trip = tripOptionsResult.options.find(o => o.tripName === tripName);
        if (!trip) return { error: `Trip named "${tripName}" not found in pricing options.` };

        const foodOptionsResult = getFoodOptions();
        if (!foodOptionsResult.success) return { error: "Could not load food pricing configuration." };

        const numAdults = parseInt(adults) || 0;
        const numKids = parseInt(kids) || 0;
        const numSeniors = parseInt(seniors) || 0;

        const tripBaseCost = (numAdults * trip.pricePerAdult) + (numKids * trip.pricePerKid) + (numSeniors * trip.pricePerSenior);

        let foodCost = 0;
        if (selectedFoodOptions) {
            try {
                const parsedFoodOptions = JSON.parse(selectedFoodOptions);
                for (const foodName in parsedFoodOptions) {
                    const quantity = parseInt(parsedFoodOptions[foodName].quantity) || 0;
                    if (quantity > 0) {
                        const foodOption = foodOptionsResult.options.find(f => f.optionName === foodName);
                        if (foodOption) {
                            foodCost += quantity * foodOption.price;
                        }
                    }
                }
            } catch (e) { Logger.log("Error parsing selectedFoodOptions JSON in calculateTravelPrice: " + e.toString()); }
        }

        const subtotal = tripBaseCost + foodCost;
        const discountRate = (parseFloat(discountPercentage) || 0) / 100;
        const discountAmount = subtotal * discountRate;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxRate = (parseFloat(taxPercentage) || 0) / 100;
        const taxAmount = subtotalAfterDiscount * taxRate;
        const totalCost = subtotalAfterDiscount + taxAmount;

        const result = {
            success: true,
            tripBaseCost: parseFloat(tripBaseCost.toFixed(2)),
            foodCost: parseFloat(foodCost.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2))
        };
        Logger.log("calculateTravelPrice (new) result: " + JSON.stringify(result));
        return result;

    } catch (e) {
        Logger.log(`Error in calculateTravelPrice (new): ${e.toString()}`);
        return { error: `Server error calculating travel price: ${e.message}` };
    }
}

// REBUILT: Saves a new daily travel booking
function saveTravel(details) {
    Logger.log("saveTravel (new): Called with " + JSON.stringify(details));
    try {
        const travelId = `TRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const priceParams = {
            tripName: details.tripName,
            adults: details.adults,
            kids: details.kids,
            seniors: details.seniors,
            selectedFoodOptions: details.foodOptions, // This is expected to be a JSON string
            discountPercentage: details.discountPercentage,
            taxPercentage: details.taxPercentage
        };
        const priceResult = calculateTravelPrice(priceParams);
        if (priceResult.error) {
            return { success: false, message: `Price calculation error: ${priceResult.error}` };
        }

        const dataToSave = {
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][0]]: travelId,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][1]]: details.clientName,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][2]]: details.clientPhone,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][3]]: details.clientEmail,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][4]]: formatDateField_hoisted(details.travelDate, 'travelDate'),
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][5]]: details.travelTime,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][6]]: details.tripName,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][7]]: details.adults,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][8]]: details.kids,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][9]]: details.seniors,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][10]]: details.foodOptions, // Save the JSON string
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][11]]: priceResult.tripBaseCost,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][12]]: priceResult.foodCost,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][13]]: priceResult.subtotal,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][14]]: details.discountPercentage || 0,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][15]]: priceResult.discountAmount,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][16]]: details.taxPercentage || 0,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][17]]: priceResult.taxAmount,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][18]]: priceResult.totalCost,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][19]]: 0, // Total Paid initially
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][20]]: priceResult.totalCost, // Amount Due initially
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][21]]: 'Confirmed', // Status
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][22]]: details.notes,
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][23]]: getUserEmail(),
            [HEADERS[SHEET_NAMES.DAILY_TRAVELS][24]]: new Date()
        };
        
        const appendResult = appendData(SHEET_NAMES.DAILY_TRAVELS, dataToSave);
        if (appendResult.success) {
            return { success: true, message: 'Daily travel booking saved.', travelId: travelId };
        } else {
            return appendResult;
        }

    } catch (e) {
        Logger.log(`CRITICAL Error in saveTravel (new): ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

// NEW: Edits an existing daily travel booking
function editTravel(travelId, updatedDetails) {
    Logger.log(`editTravel: Called for ID ${travelId} with details: ${JSON.stringify(updatedDetails)}`);
    try {
        if (!travelId || !updatedDetails) {
            return { success: false, message: "Travel ID and updated details are required." };
        }

        // Recalculate price based on updated details
        const priceParams = {
            tripName: updatedDetails.tripName,
            adults: updatedDetails.adults,
            kids: updatedDetails.kids,
            seniors: updatedDetails.seniors,
            selectedFoodOptions: updatedDetails.foodOptions, // JSON string
            discountPercentage: updatedDetails.discountPercentage,
            taxPercentage: updatedDetails.taxPercentage
        };
        const priceResult = calculateTravelPrice(priceParams);
        if (priceResult.error) {
            return { success: false, message: `Price recalculation error: ${priceResult.error}` };
        }

        // Get existing payment details to preserve them
        const existingTravel = (getData(SHEET_NAMES.DAILY_TRAVELS) || []).find(t => t['Travel ID'] === travelId);
        const totalPaid = existingTravel ? (parseFloat(existingTravel['Total Paid']) || 0) : 0;
        const amountDue = priceResult.totalCost - totalPaid;

        const dataToUpdate = {
            'Client Name': updatedDetails.clientName,
            'Client Phone': updatedDetails.clientPhone,
            'Client Email': updatedDetails.clientEmail,
            'Travel Date': formatDateField_hoisted(updatedDetails.travelDate, 'travelDate'),
            'Travel Time': updatedDetails.travelTime,
            'Trip Name': updatedDetails.tripName,
            'Adults': updatedDetails.adults,
            'Kids': updatedDetails.kids,
            'Seniors': updatedDetails.seniors,
            'Food Options (JSON)': updatedDetails.foodOptions,
            'Trip Base Cost': priceResult.tripBaseCost,
            'Food Cost': priceResult.foodCost,
            'Subtotal': priceResult.subtotal,
            'Discount Percentage': updatedDetails.discountPercentage || 0,
            'Discount Amount': priceResult.discountAmount,
            'Tax Percentage': updatedDetails.taxPercentage || 0,
            'Tax Amount': priceResult.taxAmount,
            'Total Cost': priceResult.totalCost,
            'Total Paid': totalPaid,
            'Amount Due': amountDue < 0 ? 0 : amountDue,
            'Status': updatedDetails.status || 'Confirmed',
            'Notes': updatedDetails.notes
        };

        const updateResult = updateData(SHEET_NAMES.DAILY_TRAVELS, 'Travel ID', travelId, dataToUpdate);
        if (updateResult.success) {
            _updateBookingPaymentStatus(travelId, 'travel'); // Ensure payment status is correct
        }
        return updateResult;

    } catch (e) {
        Logger.log(`CRITICAL Error in editTravel: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}


// REBUILT: Fetches and maps daily travels from the sheet
function getDailyTravels() {
    Logger.log("getDailyTravels (new): Fetching all travel bookings.");
    const cache = CacheService.getScriptCache();
    const cacheKey = "PROCESSED_TRAVELS";
    const cached = BigCache.get(cache, cacheKey);
    if (cached) {
        Logger.log("getDailyTravels: Returning cached PROCESSED data.");
        return { success: true, travels: JSON.parse(cached) };
    }

    try {
        const rawTravels = getData(SHEET_NAMES.DAILY_TRAVELS);
         if (!Array.isArray(rawTravels)) {
            return { success: false, travels: [], error: `Could not fetch travels. Sheet might be missing or empty.` };
        }
        
        const travels = rawTravels.map(t => {
            return {
                travelId: t['Travel ID'],
                clientName: t['Client Name'],
                clientPhone: t['Client Phone'],
                clientEmail: t['Client Email'],
                travelDate: formatDateField_hoisted(t['Travel Date'], 'travelDate'),
                travelTime: formatTimeValue_hoisted(t['Travel Time'], 'travelTime'),
                tripName: t['Trip Name'],
                adults: t['Adults'],
                kids: t['Kids'],
                seniors: t['Seniors'],
                foodOptions: t['Food Options (JSON)'],
                tripBaseCost: t['Trip Base Cost'],
                foodCost: t['Food Cost'],
                subtotal: t['Subtotal'],
                discountPercentage: t['Discount Percentage'],
                discountAmount: t['Discount Amount'],
                taxPercentage: t['Tax Percentage'],
                taxAmount: t['Tax Amount'],
                totalCost: t['Total Cost'],
                totalPaid: t['Total Paid'],
                amountDue: t['Amount Due'],
                status: t['Status'],
                notes: t['Notes'],
                recordedBy: t['Recorded By'],
                bookingDate: formatDateField_hoisted(t['Booking Date'], 'bookingDate')
            };
        });

        BigCache.put(cache, cacheKey, travels, 600);
        Logger.log(`getDailyTravels (new): Successfully processed and cached ${travels.length} travels.`);
        return { success: true, travels: travels };
    } catch(e) {
        Logger.log(`Error in getDailyTravels (new): ${e.toString()}`);
        return { success: false, travels: [], error: e.message };
    }
}

// UPDATED: Deletes a travel booking and associated payments
function deleteTravel(travelId) {
    Logger.log(`deleteTravel: ID: ${travelId}`);
    try {
        if (!travelId) return { success: false, message: "Missing Travel ID." };
        
        const allPayments = getData(SHEET_NAMES.PAYMENTS) || [];
        const paymentsToDelete = allPayments.filter(p => String(p[HEADERS[SHEET_NAMES.PAYMENTS][1]]) === String(travelId));
        
        if (paymentsToDelete.length > 0) {
            const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PAYMENTS);
            const data = sheet.getDataRange().getValues();
            const bookingIdCol = data[0].indexOf(HEADERS[SHEET_NAMES.PAYMENTS][1]);
            // Iterate backwards to safely delete rows
            for (let i = data.length - 1; i > 0; i--) {
                if (String(data[i][bookingIdCol]) === String(travelId)) {
                    sheet.deleteRow(i + 1);
                    Logger.log(`Deleted payment row ${i+1} for travel ID ${travelId}`);
                }
            }
        }

        return deleteData(SHEET_NAMES.DAILY_TRAVELS, 'Travel ID', travelId);
    } catch (e) {
        Logger.log(`Error in deleteTravel: ${e.toString()}`);
        return { success: false, message: `Server error: ${e.message}` };
    }
}

// NEW: Generates PDF breakdown for a daily travel booking
function generateTravelInvoicePdf(detailsWithLang) {
  const lang = detailsWithLang.lang || 'en';
  const details = { ...detailsWithLang };
  delete details.lang;
  
  Logger.log("generateTravelInvoicePdf: Called with details: " + JSON.stringify(details));
  try {
      let itemsHtml = `
        <tr class="item"><td>${_s('travel_invoice_trip_base_cost', lang)}: ${details.tripName}</td><td class="text-right">€${(parseFloat(details.tripBaseCost) || 0).toFixed(2)}</td></tr>
        <tr class="item"><td>${_s('travel_invoice_food_cost', lang)}</td><td class="text-right">€${(parseFloat(details.foodCost) || 0).toFixed(2)}</td></tr>
      `;

      let totalsHtml = `
          <tr class="total"><td></td><td class="text-right"><strong>${_s('travel_invoice_subtotal', lang)}:</strong> €${(parseFloat(details.subtotal) || 0).toFixed(2)}</td></tr>
      `;
      if(details.discountAmount > 0) {
        totalsHtml += `<tr class="total"><td></td><td class="text-right">${_s('invoice_discount', lang)} (${details.discountPercentage}%): -€${(parseFloat(details.discountAmount) || 0).toFixed(2)}</td></tr>`;
      }
      if(details.taxAmount > 0) {
        totalsHtml += `<tr class="total"><td></td><td class="text-right">${_s('travel_invoice_tax', lang)} (${details.taxPercentage}%): €${(parseFloat(details.taxAmount) || 0).toFixed(2)}</td></tr>`;
      }
      totalsHtml += `
          <tr class="total grand-total"><td></td><td class="text-right"><strong>${_s('invoice_total_due', lang).replace(':', '')}:</strong> €${(parseFloat(details.totalCost) || 0).toFixed(2)}</td></tr>
          <tr class="total"><td></td><td class="text-right">${_s('payments_total_paid', lang)} €${(parseFloat(details.totalPaid) || 0).toFixed(2)}</td></tr>
          <tr class="total amount-due"><td></td><td class="text-right"><strong>${_s('invoice_total_due', lang)}</strong> €${(parseFloat(details.amountDue) || 0).toFixed(2)}</td></tr>
      `;


      const html = `
        <html>
          <head>
            <style>
              @page { size: A4; margin: 0; }
              body { font-family: Arial, sans-serif; margin: 0; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .invoice-box { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; border: none; box-shadow: none; font-size: 10pt; line-height: 1.4; box-sizing: border-box; background: white; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 7mm; padding-bottom: 5mm; border-bottom: 0.7mm solid #6b7280;}
              .client-details { margin-bottom: 7mm; } .client-details p { margin: 1mm 0; font-size: 10pt; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 7mm; }
              .items-table th, .items-table td { border-bottom: 0.3mm solid #eee; padding: 2mm 2.5mm; font-size: 10pt; }
              .items-table th { background-color: #D1D5DB; color: #1F2937; text-align: left; font-weight:bold; border-bottom: 0.5mm solid #bbb;}
              .items-table tr.item:last-child td { border-bottom: none; }
              .text-right { text-align: right; }
              .totals-table { width: 100%; margin-top: 5mm; }
              .totals-table td { padding: 1.5mm 2.5mm; }
              .totals-table tr.total td { border-top: 0.3mm solid #eee; }
              .totals-table tr.grand-total td, .totals-table tr.amount-due td { font-weight: bold; }
              .totals-table tr.grand-total td { font-size: 11pt; }
              .totals-table tr.amount-due td { font-size: 12pt; color: #c00; }

            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="header">
                  <div>
                      <h2 style="font-size: 16pt; font-weight: bold; color: #333; margin:0;">${_s('travel_invoice_header', lang)}</h2>
                      <p style="color: #555; margin: 1mm 0; font-size: 10pt;">AMIEIRA MARINA</p>
                  </div>
              </div>
              <div style="margin-bottom: 7mm; font-size: 9pt;">
                  <p><strong>${_s('travel_invoice_id', lang)}</strong> ${details.travelId}</p>
                  <p><strong>${_s('invoice_date_issued', lang)}</strong> ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy")}</p>
              </div>
              <div class="client-details">
                  <p><strong>${details.clientName}</strong></p>
                  <p><strong>${_s('travel_invoice_date', lang)}</strong> ${formatDateForPdfDisplay(details.travelDate)} ${_s('travel_invoice_at_time', lang)} ${details.travelTime}</p>
              </div>

              <table class="items-table">
                  <thead><tr>
                      <th>${_s('invoice_item_desc', lang)}</th>
                      <th class="text-right">${_s('invoice_item_total', lang)}</th>
                  </tr></thead>
                  <tbody>${itemsHtml}</tbody>
              </table>

              <table class="totals-table">
                  <tbody>${totalsHtml}</tbody>
              </table>
            </div>
          </body>
        </html>
      `;
    const pdfBlob = Utilities.newBlob(html, MimeType.HTML, `Travel-${details.travelId}.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `TravelBreakdown-${details.travelId}-${new Date().toISOString().split('T')[0]}.pdf`;
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch(e) {
    Logger.log(`Error in generateTravelInvoicePdf: ${e.toString()}`);
    return { success: false, error: e.message };
  }
}

/**
 * Fetches and processes all data from the Moorings sheet.
 * This function now dynamically calculates the payment status based on the current date.
 * @returns {object} An object containing the mooring data or an error.
 */
function getMooringsData() {
  Logger.log("getMooringsData: Fetching all mooring records.");
  try {
    const rawData = getData(SHEET_NAMES.MOORINGS);
    if (!Array.isArray(rawData)) {
      return { success: false, moorings: [], error: `Could not fetch mooring data.` };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const moorings = rawData.map(m => {
      const nextPaymentDateStr = formatDateField_hoisted(m['Next Payment Date'], 'nextPaymentDate');
      let paymentStatus = m['Payment Status']; // Keep original if no date
      
      if (nextPaymentDateStr) {
          const nextPaymentDate = new Date(nextPaymentDateStr);
          if (!isNaN(nextPaymentDate.getTime())) {
              if (nextPaymentDate < today) {
                  paymentStatus = 'Overdue';
              } else if (nextPaymentDate >= today && nextPaymentDate <= thirtyDaysFromNow) {
                  paymentStatus = 'Due';
              } else {
                  paymentStatus = 'Paid';
              }
          }
      }

      return {
        mooringId: m['Mooring ID'],
        clientName: m['Client Name'],
        clientPhone: m['Client Phone'],
        clientEmail: m['Client Email'],
        boatName: m['Boat Name'],
        boatLength: m['Boat Length'],
        place: m['Place'],
        paymentStatus: paymentStatus, // Use the dynamically calculated status
        insurancePaid: m['Insurance Paid'],
        nextPaymentDate: nextPaymentDateStr,
        value: m['Value'],
        notes: m['Notes'],
        recordedBy: m['Recorded By'],
        lastUpdated: m['Last Updated'] instanceof Date ? Utilities.formatDate(m['Last Updated'], Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : m['Last Updated']
      };
    });
    Logger.log(`getMooringsData: Successfully fetched and processed ${moorings.length} records.`);
    return { success: true, moorings: moorings };
  } catch(e) {
    Logger.log(`Error in getMooringsData: ${e.toString()}`);
    return { success: false, moorings: [], error: e.message };
  }
}


/**
 * Generates a PDF with a visual map and a data table of the moorings.
 * @param {object} paramsWithLang - Object containing the language preference.
 * @returns {object} Result object with base64 PDF data or an error.
 */
function generateMooringsMapPdf(paramsWithLang) {
  const lang = paramsWithLang.lang || 'en';
  Logger.log(`generateMooringsMapPdf: Called for lang '${lang}'.`);
  try {
    const mooringsDataResult = getMooringsData();
    if (!mooringsDataResult.success) {
      return { success: false, error: `Failed to fetch mooring data for PDF: ${mooringsDataResult.error}` };
    }
    // The landscape orientation is now handled within the HTML content itself.
    const htmlContent = generateMooringsPdfHtml_Map(mooringsDataResult.moorings, lang);
    const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `Moorings-Map-Report.html`).getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    const fileName = `AmieiraMarina_Moorings_Map_${new Date().toISOString().split('T')[0]}.pdf`;
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
  } catch (e) {
    Logger.log(`Error in generateMooringsMapPdf: ${e.toString()}`);
    return { success: false, error: `Server error generating mooring map PDF: ${e.message}` };
  }
}

/**
 * Generates a PDF with just a table view of the moorings data.
 * @param {object} paramsWithLang - Object containing the language preference.
 * @returns {object} Result object with base64 PDF data or an error.
 */
function generateMooringsTablePdf(paramsWithLang) {
    const lang = paramsWithLang.lang || 'en';
    Logger.log(`generateMooringsTablePdf: Called for lang '${lang}'.`);
    try {
        const mooringsDataResult = getMooringsData();
        if (!mooringsDataResult.success) {
            return { success: false, error: `Failed to fetch mooring data for PDF: ${mooringsDataResult.error}` };
        }
        // The landscape orientation is now handled within the HTML content itself.
        const htmlContent = generateMooringsPdfHtml_Table(mooringsDataResult.moorings, lang);
        const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `Moorings-Table-Report.html`).getAs(MimeType.PDF);
        const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
        const fileName = `AmieiraMarina_Moorings_Table_${new Date().toISOString().split('T')[0]}.pdf`;
        return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };
    } catch (e) {
        Logger.log(`Error in generateMooringsTablePdf: ${e.toString()}`);
        return { success: false, error: `Server error generating mooring table PDF: ${e.message}` };
    }
}


/**
 * [REVISED] Generates the HTML for the MAP VIEW moorings PDF.
 * This version replicates the application's flexbox-based layout and styling for a near-identical look.
 * @param {Array<object>} mooringsData The array of mooring records.
 * @param {string} lang The language for translations.
 * @returns {string} The complete HTML string for the PDF.
 */
function generateMooringsPdfHtml_Map(mooringsData, lang = 'en') {
  // --- Data Preparation ---
  const mooringMap = new Map(mooringsData.map(m => [m.place, m]));
  const companyBoats = [
      ['B.1', 'ALQUEVA'], ['B.2', 'CAMPINHO'], ['B.3', 'MOURAO'], ['B.4', 'MOURA'],
      ['B.5', 'AMIEIRA'], ['B.6', 'ESTRELA'], ['B.7', 'ALANDROAL'], ['B.8', 'REGUENGOS'],
      ['B.9', 'TERENA'], ['B.10', 'MONSARAZ']
  ];
  const pierB_Top = ['B.22', 'B.21', 'B.20', 'B.19', 'B.18', 'B.17', 'B.16', 'B.15', 'B.14', 'B.13', 'B.12', 'B.11'];
  const pierA_Top = ['A.23', 'A.24', 'A.25', 'A.26', 'A.27', 'A.28', 'A.29', 'A.30', 'A.31', 'A.32', 'A.33', 'A.34'];
  const pierA_Bottom = ['A.46', 'A.45', 'A.44', 'A.43', 'A.42', 'A.41', 'A.40', 'A.39', 'A.38', 'A.37', 'A.36', 'A.35'];

  // --- Helper function to generate a mooring spot DIV ---
  const createSpotDiv = (placeId, isCompanyBoat = false, companyBoatName = '') => {
    const data = mooringMap.get(placeId);
    let spotClass = 'mooring-spot';
    let clientName = '';

    if (isCompanyBoat) {
        spotClass += ' company-boat-spot';
        clientName = companyBoatName;
    } else if (data) {
        clientName = data.clientName || '---';
        switch (data.paymentStatus) {
            case 'Due': spotClass += ' status-due'; break;
            case 'Overdue': spotClass += ' status-overdue'; break;
            case 'Paid': spotClass += ' status-paid'; break;
            default: spotClass += ' status-available'; break;
        }
    } else {
        spotClass += ' status-available';
    }
    return `<div class="${spotClass}">
              <span class="place-id">${placeId}</span>
              <span class="client-name">${clientName}</span>
            </div>`;
  };
  
  // --- Helper function to generate a row of boat pairs ---
  const createPierRowHtml = (placesArray) => {
      let rowHtml = '<div class="pier-row">';
      for (let i = 0; i < placesArray.length; i += 2) {
          rowHtml += '<div class="pier-boat-pair">';
          rowHtml += createSpotDiv(placesArray[i]);
          rowHtml += createSpotDiv(placesArray[i+1]);
          rowHtml += '</div>';
          if (i + 2 < placesArray.length) {
              rowHtml += '<div class="pier-separator-horizontal"></div>';
          }
      }
      rowHtml += '</div>';
      return rowHtml;
  };
  
  // --- Build the HTML structure ---
  let companyBoatsHtml = '<div class="pier-row company-boat-row">';
    for (let i = 0; i < companyBoats.length; i += 2) {
        companyBoatsHtml += '<div class="pier-boat-pair">';
        companyBoatsHtml += createSpotDiv(companyBoats[i][0], true, companyBoats[i][1]);
        companyBoatsHtml += createSpotDiv(companyBoats[i+1][0], true, companyBoats[i+1][1]);
        companyBoatsHtml += '</div>';
        if (i + 2 < companyBoats.length) {
            companyBoatsHtml += '<div class="pier-separator-horizontal"></div>';
        }
    }
  companyBoatsHtml += '</div>';

  const pierB_Top_Html = createPierRowHtml(pierB_Top);
  const pierA_Top_Html = createPierRowHtml(pierA_Top);
  const pierA_Bottom_Html = createPierRowHtml(pierA_Bottom);

  // --- Final HTML with Inlined CSS ---
  return `
    <html>
      <head>
        <style>
          /* Page setup for Landscape PDF */
          @page { size: A4 landscape; margin: 1cm; }
          
          /* Base styles */
          body { font-family: Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          /* Main container for the map */
          .map-container { display: flex; flex-direction: column; align-items: center; gap: 0; width: 100%; }
          
          /* Pier row styling */
          .pier-row { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; width: 100%; gap: 8px; }
          .company-boat-row { justify-content: space-around; }
          
          /* Walkway styling */
          .pier-walkway-horizontal { height: 35px; width: 100%; background-color: #e7d8c3; border: 2px solid #d1bfa2; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem; color: #8c704d; margin: -8px 0; }
          
          /* Boat pair and separator styling */
          .pier-boat-pair { display: flex; flex: 1; min-width: 0; gap: 4px; }
          .pier-separator-horizontal { width: 12px; height: 70px; background-color: #d1bfa2; border: 1px solid #ab8f6f; border-radius: 6px; flex-shrink: 0; }
          
          /* Gap between piers */
          .pier-gap { height: 1.2rem; }
          
          /* Individual mooring spot styling */
          .mooring-spot { flex: 1; min-width: 0; height: 55px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2px; overflow: hidden; }
          .place-id { font-size: 0.6rem; font-weight: 500; color: #64748b; }
          .client-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95%; text-transform: uppercase; font-size: 0.7rem; }
          
          /* Status colors */
          .status-available { background-color: #f8fafc; color: #475569; border: 1px dashed #cbd5e1; }
          .status-paid { background-color: #f0fdf4; color: #166534; border: 1px solid #4ade80; }
          .status-due { background-color: #fefce8; color: #854d0e; border: 1px solid #facc15; }
          .status-overdue { background-color: #fef2f2; color: #991b1b; border: 1px solid #f87171; }
          .company-boat-spot { background-color: #e2e8f0; color: #334155; border: 1px solid #94a3b8; }

          /* Header and Footer */
          .pdf-header { text-align: center; margin-bottom: 20px; }
          .pdf-title { font-size: 22px; font-weight: bold; color: #1e293b; }
          .pdf-subtitle { font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div class="pdf-title">Mooring Status Map</div>
          <div class="pdf-subtitle">Generated on: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>
        <div class="map-container">
          ${companyBoatsHtml}
          <div class="pier-walkway-horizontal">B</div>
          ${pierB_Top_Html}
          <div class="pier-gap"></div>
          ${pierA_Top_Html}
          <div class="pier-walkway-horizontal">A</div>
          ${pierA_Bottom_Html}
        </div>
      </body>
    </html>
  `;
}

/**
 * [REVISED] Generates the HTML for the TABLE VIEW moorings PDF.
 * This version features an improved, professional design in landscape orientation.
 * @param {Array<object>} mooringsData The array of mooring records.
 * @param {string} lang The language for translations.
 * @returns {string} The complete HTML string for the PDF.
 */
function generateMooringsPdfHtml_Table(mooringsData, lang = 'en') {
  let tableRowsHtml = '';
  
  // Sort data by place for a structured report
  const sortedData = [...mooringsData].sort((a,b) => (a.place || '').localeCompare(b.place || ''));

  if (sortedData.length > 0) {
    sortedData.forEach(m => {
      let statusHtml = '';
      switch (m.paymentStatus) {
        case 'Paid':
          statusHtml = '<span class="status-pill status-paid">Paid</span>';
          break;
        case 'Due':
          statusHtml = '<span class="status-pill status-due">Due</span>';
          break;
        case 'Overdue':
          statusHtml = '<span class="status-pill status-overdue">Overdue</span>';
          break;
        default:
          statusHtml = `<span class="status-pill status-unknown">${m.paymentStatus || 'N/A'}</span>`;
      }

      tableRowsHtml += `
        <tr>
          <td>${m.place || ''}</td>
          <td>
            <div class="client-name">${m.clientName || ''}</div>
            <div class="client-contact">${m.clientPhone || ''}</div>
          </td>
          <td>
            <div class="boat-name">${m.boatName || ''}</div>
            <div class="boat-length">${m.boatLength ? m.boatLength + 'm' : ''}</div>
          </td>
          <td>${statusHtml}</td>
          <td>${m.insurancePaid || 'N/A'}</td>
          <td>${formatDateField_hoisted(m.nextPaymentDate, 'pdfDate') || 'N/A'}</td>
          <td class="text-right">€${(m.value || 0).toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    tableRowsHtml = '<tr><td colspan="7" class="no-data">No mooring data available.</td></tr>';
  }

  return `
    <html>
      <head>
        <style>
          /* Page setup for Landscape PDF */
          @page { size: A4 landscape; margin: 1.5cm; }
          
          /* Base styles */
          body { font-family: Arial, sans-serif; color: #334155; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          /* Header and Footer */
          .pdf-header { text-align: center; margin-bottom: 25px; }
          .pdf-title { font-size: 24px; font-weight: bold; color: #1e293b; }
          .pdf-subtitle { font-size: 12px; color: #64748b; }
          
          /* Table styling */
          .report-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .report-table th, .report-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          
          /* Table Header */
          .report-table thead tr { background-color: #f1f5f9; }
          .report-table th { font-weight: 600; color: #475569; text-align: left; text-transform: uppercase; font-size: 9pt; }
          
          /* Table Body */
          .report-table tbody tr:nth-child(even) { background-color: #f8fafc; }
          .report-table .client-name, .report-table .boat-name { font-weight: 500; }
          .report-table .client-contact, .report-table .boat-length { font-size: 9pt; color: #64748b; }
          
          /* Status Pills */
          .status-pill { padding: 3px 8px; border-radius: 12px; font-size: 9pt; font-weight: 500; }
          .status-paid { background-color: #dcfce7; color: #166534; }
          .status-due { background-color: #fef9c3; color: #854d0e; }
          .status-overdue { background-color: #fee2e2; color: #991b1b; }
          .status-unknown { background-color: #e2e8f0; color: #475569; }
          
          /* Utility classes */
          .text-right { text-align: right; }
          .no-data { text-align: center; padding: 20px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div class="pdf-title">Mooring Data Report</div>
          <div class="pdf-subtitle">Generated on: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Place</th>
              <th>Client</th>
              <th>Boat</th>
              <th>Payment Status</th>
              <th>Insurance</th>
              <th>Next Payment</th>
              <th class="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
}
  
// ... existing code ...
/**
 * [REVISED V8] Generates Stay Sheets using a Google Doc template.
 * This version programmatically forces an A4 Portrait orientation on all generated documents,
 * overriding the template's default settings to resolve the landscape issue.
 *
 * @param {object} params - The parameters for the function.
 * @param {string} params.startDate - The start date for filtering reservations (check-in date).
 * @param {string} params.endDate - The end date for filtering reservations (check-in date).
 * @param {string} [params.lang='pt'] - The language for date formatting.
 * @returns {object} A result object with base64 PDF data or an error message.
 */
function generateStaySheetsPdf(params) {
  // This ID was taken from your existing code. Ensure it is correct.
  const TEMPLATE_ID = '1RmpPpUc68gjODm1zPAfVXTNJjGSC6Vl8JS4sjo2qq8k'; 

  const { startDate, endDate, lang = 'pt' } = params;
  Logger.log(`generateStaySheetsPdf (V8): Called for date range ${startDate} to ${endDate}`);

  // --- 0. Pre-flight Checks ---
  if (TEMPLATE_ID === 'YOUR_TEMPLATE_ID_GOES_HERE' || !TEMPLATE_ID) {
    const errorMessage = "Template ID is not set in the script. Please add your Google Doc template ID.";
    Logger.log(errorMessage);
    return { success: false, error: errorMessage };
  }
  if (!startDate || !endDate) {
    return { success: false, error: "Start and end dates are required." };
  }

  try {
    // --- 1. Fetch and Filter Reservations ---
    const reservationsData = getReservations();
    if (reservationsData.error) {
      return { success: false, error: `Failed to fetch reservations: ${reservationsData.error}` };
    }

    const filterStartDate = _parseToDateObject(startDate);
    const filterEndDate = _parseToDateObject(endDate);
    const filterEndDateEndOfDay = new Date(filterEndDate);
    filterEndDateEndOfDay.setUTCHours(23, 59, 59, 999);

    const relevantReservations = reservationsData.reservations.filter(res => {
      if (!res.checkInDate || res.status === 'Cancelled' || res.status === 'Pending') return false;
      const resCiDate = _parseToDateObject(res.checkInDate);
      return resCiDate && resCiDate >= filterStartDate && resCiDate <= filterEndDateEndOfDay.getTime();
    }).sort((a,b) => _parseToDateObject(a.checkInDate) - _parseToDateObject(b.checkInDate));

    if (relevantReservations.length === 0) {
      return { success: false, error: "No check-ins found for the selected period." };
    }
    Logger.log(`Found ${relevantReservations.length} relevant reservations.`);

    const tempFiles = [];
    const tempFolder = DriveApp.getRootFolder(); // Temporary files are created in the root

    // --- 2. Create a Populated Doc for Each Reservation ---
    for (const res of relevantReservations) {
      try {
        const copyName = `Temp_StaySheet_${res.reservationId}_${Date.now()}`;
        const copyFile = DriveApp.getFileById(TEMPLATE_ID).makeCopy(copyName, tempFolder);
        const copyDoc = DocumentApp.openById(copyFile.getId());
        const body = copyDoc.getBody();

        // --- FIX V8: Force A4 Portrait orientation (595x842 points) ---
        body.setPageWidth(595);
        body.setPageHeight(842);
        
        // A. Replace simple text placeholders
        body.replaceText('{{CLIENT_NAME}}', res.clientName || '____________________');
        body.replaceText('{{BOAT_NAME}}', res.boatNameAuto || '____________________');
        body.replaceText('{{CHECK_IN_DATE}}', formatDateForPdfDisplay(res.checkInDate, lang));
        body.replaceText('{{CHECK_IN_TIME}}', res.checkInTime ? res.checkInTime.substring(0, 5).replace(':', ' : ') : '______ : ______');
        body.replaceText('{{CHECK_OUT_DATE}}', formatDateForPdfDisplay(res.checkOutDate, lang));
        body.replaceText('{{CHECK_OUT_TIME}}', res.checkOutTime ? res.checkOutTime.substring(0, 5).replace(':', ' : ') : '______ : ______');

        // B. Handle extras by editing the table directly
        const bookedExtras = res.extrasBooked && res.extrasBooked !== "{}" ? JSON.parse(res.extrasBooked) : {};
        const tables = body.getTables();
        tables.forEach(table => {
            if (table.getNumRows() > 1 && table.getCell(0, 0).getText().toUpperCase().trim() === 'EXTRAS') {
                for (let i = 1; i < table.getNumRows(); i++) {
                    const row = table.getRow(i);
                    const extraNameInDoc = row.getCell(0).getText().trim();
                    const bookedKey = Object.keys(bookedExtras).find(k => k.toLowerCase() === extraNameInDoc.toLowerCase());
                    if (bookedKey) {
                        const qty = bookedExtras[bookedKey].quantity || '';
                        row.getCell(1).setText(String(qty));
                    }
                }
            }
        });
        
        // C. Set narrow, standard margins. (0.5 inch = 36 points)
        body.setMarginTop(40);
        body.setMarginBottom(10);
        body.setMarginLeft(40);
        body.setMarginRight(10);

        // D. Remove any default spacing between paragraphs
        const paragraphs = body.getParagraphs();
        paragraphs.forEach(p => {
            p.setSpacingAfter(0);
            p.setSpacingBefore(0);
        });

        copyDoc.saveAndClose();
        tempFiles.push(copyFile);
        Logger.log(`Successfully created and populated temp doc for reservation ${res.reservationId}`);
      } catch (docError) {
         Logger.log(`ERROR processing reservation ${res.reservationId}: ${docError.toString()}`);
      }
    }
    
    if (tempFiles.length === 0) {
        return { success: false, error: "Could not generate any valid stay sheets. Check server logs for individual errors." };
    }

    // --- 3. Merge all Docs into one PDF ---
    let finalPdfBlob;
    if (tempFiles.length === 1) {
      finalPdfBlob = tempFiles[0].getAs(MimeType.PDF);
      Logger.log("Single document created, converting directly to PDF.");
    } else {
      Logger.log(`Merging ${tempFiles.length} documents into one PDF...`);
      const mergedDocName = `Merged_StaySheets_${startDate}_to_${endDate}`;
      const mergedDoc = DocumentApp.create(mergedDocName);
      const mergedBody = mergedDoc.getBody();
      
      mergedBody.clear();
      // --- FIX V8: Force A4 Portrait on final merged document ---
      mergedBody.setPageWidth(595);
      mergedBody.setPageHeight(842);
      mergedBody.setMarginTop(40);
      mergedBody.setMarginBottom(10);
      mergedBody.setMarginLeft(40);
      mergedBody.setMarginRight(10);

      for (let i = 0; i < tempFiles.length; i++) {
        const tempDoc = DocumentApp.openById(tempFiles[i].getId());
        const tempBody = tempDoc.getBody();
        for (let j = 0; j < tempBody.getNumChildren(); j++) {
          const element = tempBody.getChild(j).copy();
          const type = element.getType();
          
          if (type == DocumentApp.ElementType.PARAGRAPH) mergedBody.appendParagraph(element);
          else if (type == DocumentApp.ElementType.TABLE) mergedBody.appendTable(element);
          else if (type == DocumentApp.ElementType.LIST_ITEM) mergedBody.appendListItem(element);
          else if (type == DocumentApp.ElementType.HORIZONTAL_RULE) mergedBody.appendHorizontalRule();
        }
        
        if (i < tempFiles.length - 1) {
          mergedBody.appendPageBreak();
        }
      }
      mergedDoc.saveAndClose();
      finalPdfBlob = DriveApp.getFileById(mergedDoc.getId()).getAs(MimeType.PDF);
      DriveApp.getFileById(mergedDoc.getId()).setTrashed(true);
      Logger.log("Merging complete.");
    }

    // --- 4. Clean up temporary files and return the PDF ---
    Logger.log("Cleaning up temporary files...");
    tempFiles.forEach(file => file.setTrashed(true));
    
    const pdfBytesBase64 = Utilities.base64Encode(finalPdfBlob.getBytes());
    const fileName = `Fichas_Estadia_${startDate}_a_${endDate}.pdf`;
    Logger.log(`PDF generation successful. Filename: ${fileName}`);

    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };

  }  catch (e) {
    Logger.log(`CRITICAL Error in generateStaySheetsPdf (V7): ${e.toString()}\nStack: ${e.stack}`);
    return { success: false, error: `A critical server error occurred: ${e.message}. Please check the logs.` };
  }
}

/**
 * Generates a Stay Sheet PDF for a single, specific reservation.
 * @param {object} params - The parameters for the function.
 * @param {string} params.reservationId - The ID of the reservation to generate the sheet for.
 * @param {string} [params.lang='pt'] - The language for date formatting.
 * @returns {object} A result object with base64 PDF data or an error message.
 */
function generateSingleStaySheetPdf(params) {
  const TEMPLATE_ID = '1RmpPpUc68gjODm1zPAfVXTNJjGSC6Vl8JS4sjo2qq8k'; // Ensure this is the correct ID

  const { reservationId, lang = 'pt' } = params;
  Logger.log(`generateSingleStaySheetPdf: Called for reservation ID ${reservationId}`);

  if (!TEMPLATE_ID || TEMPLATE_ID === 'YOUR_TEMPLATE_ID_GOES_HERE') {
    return { success: false, error: "Template ID is not set in the script." };
  }
  if (!reservationId) {
    return { success: false, error: "Reservation ID is required." };
  }

  try {
    // 1. Fetch and find the specific reservation
    const reservationsData = getReservations();
    if (reservationsData.error) {
      return { success: false, error: `Failed to fetch reservations: ${reservationsData.error}` };
    }

    const reservation = reservationsData.reservations.find(r => r.reservationId === reservationId);

    if (!reservation) {
      return { success: false, error: `Reservation with ID ${reservationId} not found.` };
    }
    
    // 2. Status Check
    if (reservation.status === 'Cancelled' || reservation.status === 'Pending') {
      return { success: false, error: `Cannot generate a stay sheet for a ${reservation.status} reservation.` };
    }
    
    // 3. Create and Populate the Document
    const tempFile = DriveApp.getFileById(TEMPLATE_ID).makeCopy(`Temp_Single_StaySheet_${reservation.reservationId}`);
    const tempDoc = DocumentApp.openById(tempFile.getId());
    const body = tempDoc.getBody();

    // A. Replace placeholders
    body.replaceText('{{CLIENT_NAME}}', reservation.clientName || '____________________');
    body.replaceText('{{BOAT_NAME}}', reservation.boatNameAuto || '____________________');
    body.replaceText('{{CHECK_IN_DATE}}', formatDateForPdfDisplay(reservation.checkInDate, lang));
    body.replaceText('{{CHECK_IN_TIME}}', reservation.checkInTime ? reservation.checkInTime.substring(0, 5).replace(':', ' : ') : '______ : ______');
    body.replaceText('{{CHECK_OUT_DATE}}', formatDateForPdfDisplay(reservation.checkOutDate, lang));
    body.replaceText('{{CHECK_OUT_TIME}}', reservation.checkOutTime ? reservation.checkOutTime.substring(0, 5).replace(':', ' : ') : '______ : ______');

    // B. Handle extras table
    const bookedExtras = reservation.extrasBooked && reservation.extrasBooked !== "{}" ? JSON.parse(reservation.extrasBooked) : {};
    const tables = body.getTables();
    tables.forEach(table => {
        if (table.getNumRows() > 1 && table.getCell(0, 0).getText().toUpperCase().trim() === 'EXTRAS') {
            for (let i = 1; i < table.getNumRows(); i++) {
                const row = table.getRow(i);
                const extraNameInDoc = row.getCell(0).getText().trim();
                const bookedKey = Object.keys(bookedExtras).find(k => k.toLowerCase() === extraNameInDoc.toLowerCase());
                if (bookedKey) {
                    const qty = bookedExtras[bookedKey].quantity || '';
                    row.getCell(1).setText(String(qty));
                }
            }
        }
    });

    // C. Apply formatting
    body.setMarginTop(40);
    body.setMarginBottom(10);
    body.setMarginLeft(40);
    body.setMarginRight(10);
    const paragraphs = body.getParagraphs();
    paragraphs.forEach(p => {
        p.setSpacingAfter(0);
        p.setSpacingBefore(0);
    });

    tempDoc.saveAndClose();

    // 4. Convert to PDF and Clean up
    const pdfBlob = tempFile.getAs(MimeType.PDF);
    const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    tempFile.setTrashed(true);

    const fileName = `Ficha_Estadia_${reservation.clientName.replace(/ /g, '_')}_${reservation.checkInDate}.pdf`;
    
    return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };

  } catch (e) {
    Logger.log(`CRITICAL Error in generateSingleStaySheetPdf: ${e.toString()}\nStack: ${e.stack}`);
    return { success: false, error: `A critical server error occurred: ${e.message}.` };
  }
}

// --- NEW: Function to generate the Daily Activity Report PDF ---
function generateDailyActivityReportPdf(paramsWithLang) {
    const lang = 'pt'; // Force Portuguese as requested
    const { startDate, endDate } = paramsWithLang;
    Logger.log(`generateDailyActivityReportPdf: Called for lang '${lang}' from ${startDate} to ${endDate}`);

    try {
        if (!startDate || !endDate) {
            return { success: false, error: "Start and end dates are required." };
        }

        // FIX 1: Use robust UTC date parsing to prevent timezone shifts
        const filterStartDate = parseDateTimeToUTCDate(startDate, "00:00:00");
        const filterEndDate = parseDateTimeToUTCDate(endDate, "00:00:00");

        if (!filterStartDate || !filterEndDate || filterEndDate < filterStartDate) {
            return { success: false, error: `Invalid date format or range. Start: ${startDate}, End: ${endDate}` };
        }
        
        // Fetch all necessary data
        const reservationsData = getReservations();
        if (reservationsData.error) return { success: false, error: `Failed to fetch reservations: ${reservationsData.error}` };
        
        const travelsData = getDailyTravels();
        if (!travelsData.success) return { success: false, error: `Failed to fetch daily travels: ${travelsData.error}` };
        
        const restaurantData = getRestaurantReservations();
if (!restaurantData.success) {
    return { success: false, error: `Failed to fetch restaurant reservations: ${restaurantData.error}` };
}

        // Prepare data structure
        const dailyCounts = new Map();
        let currentDate = new Date(filterStartDate.getTime());

        while (currentDate.getTime() <= filterEndDate.getTime()) {
    const dateStr = Utilities.formatDate(currentDate, "UTC", "yyyy-MM-dd");
    dailyCounts.set(dateStr, {
        checkIn: 0,
        checkOut: 0,
        dailyTravel: 0,
        restaurantReservations: 0, // Add this line
        restaurantPeople: 0      // Add this line
    });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
}

        // Process reservations
        reservationsData.reservations.forEach(res => {
            if (res.status === 'Confirmed') { // Only process confirmed bookings
                // Check-Ins
                if (res.checkInDate) {
                    const checkInDateStr = formatDateField_hoisted(res.checkInDate, 'checkInDate');
                    if (dailyCounts.has(checkInDateStr)) {
                        dailyCounts.get(checkInDateStr).checkIn++;
                    }
                }
                // FIX 4: Check-Outs (already filtered by 'Confirmed' status)
                if (res.checkOutDate) {
                     const checkOutDateStr = formatDateField_hoisted(res.checkOutDate, 'checkOutDate');
                     if (dailyCounts.has(checkOutDateStr)) {
                        dailyCounts.get(checkOutDateStr).checkOut++;
                    }
                }
            }
        });

        // Process daily travels
        travelsData.travels.forEach(t => {
            if (t.travelDate && t.status === 'Confirmed') {
                 const travelDateStr = formatDateField_hoisted(t.travelDate, 'travelDate');
                 if (dailyCounts.has(travelDateStr)) {
                    dailyCounts.get(travelDateStr).dailyTravel++;
                }
            }
        });

        // Process restaurant reservations
restaurantData.reservations.forEach(r => {
    if (r.reservationDate && (r.status === 'Confirmed' || !r.status || r.status === '')) { 
         const resDateStr = formatDateField_hoisted(r.reservationDate, 'restaurantDate');
         if (dailyCounts.has(resDateStr)) {
            const dayData = dailyCounts.get(resDateStr);
            dayData.restaurantReservations++;
            dayData.restaurantPeople += (parseInt(r.numPeople) || 0);
        }
    }
});
        
        // Generate HTML and then PDF
        const htmlContent = generateDailyActivityReportHtml(dailyCounts, startDate, endDate, lang);
        const pdfBlob = Utilities.newBlob(htmlContent, MimeType.HTML, `DailyActivityReport-${startDate}-to-${endDate}.html`).getAs(MimeType.PDF);
        const pdfBytesBase64 = Utilities.base64Encode(pdfBlob.getBytes());
        const fileName = `Relatorio_Diario_${startDate}_a_${endDate}.pdf`;
        Logger.log("generateDailyActivityReportPdf: PDF generated successfully: " + fileName);
        return { success: true, pdfBase64: pdfBytesBase64, fileName: fileName };

    } catch (e) {
        Logger.log(`Error in generateDailyActivityReportPdf: ${e.toString()} \nStack: ${e.stack}`);
        return { success: false, error: `Server error generating daily activity report: ${e.message}` };
    }
}

function generateDailyActivityReportHtml(dailyData, startDate, endDate, lang = 'pt') {
    const dates = Array.from(dailyData.keys());
    
    // Use Portuguese day names
    const weekDays = {
        pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    };
    const dayNames = weekDays[lang] || weekDays.pt;

    let dateHeaderHtml = '';
    let dayHeaderHtml = '';
    dates.forEach((dateStr, index) => {
        const dateObj = parseDateTimeToUTCDate(dateStr, "00:00:00");
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const colBgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';
        dateHeaderHtml += `<th class="date-header ${colBgClass}">${day}-${month}</th>`;
        dayHeaderHtml += `<th class="day-header ${colBgClass}">${dayNames[dateObj.getUTCDay()]}</th>`;
    });
    
    // Use Portuguese labels
    const rowLabels = {
      checkIn: 'Check-In',
      checkOut: 'Check-Out',
      dailyTravel: 'Passeios',
      restaurant: 'Restaurante'
    };

    const createRow = (label, dataKey) => {
        let rowHtml = `<tr><td class="row-label">${label}</td>`;
        dates.forEach((dateStr, index) => {
            const count = dailyData.get(dateStr)[dataKey] || 0;
            const colBgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';
            const displayValue = count > 0 ? count : '-';
            const cellClass = count > 0 ? 'data-cell' : 'data-cell zero';
            rowHtml += `<td class="${cellClass} ${colBgClass}">${displayValue}</td>`;
        });
        rowHtml += `</tr>`;
        return rowHtml;
    };
    
    const createEmptyRow = (label, height = 30) => {
        let rowHtml = `<tr><td class="row-label">${label}</td>`;
        dates.forEach((dateStr, index) => {
            const colBgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';
            rowHtml += `<td class="empty-cell ${colBgClass}" style="height: ${height}px;">&nbsp;</td>`;
        });
        rowHtml += `</tr>`;
        return rowHtml;
    };

    const checkInRow = createRow(rowLabels.checkIn, 'checkIn');
    const checkOutRow = createRow(rowLabels.checkOut, 'checkOut');
    const dailyTravelRow = createRow(rowLabels.dailyTravel, 'dailyTravel');
    let restaurantRow = `<tr><td class="row-label">${rowLabels.restaurant}</td>`;
dates.forEach((dateStr, index) => {
    const dayCount = dailyData.get(dateStr);
    const resCount = dayCount.restaurantReservations || 0;
    const peopleCount = dayCount.restaurantPeople || 0;
    const colBgClass = index % 2 === 0 ? 'bg-even' : 'bg-odd';
    const displayValue = resCount > 0 ? `${resCount} (${peopleCount})` : '-';
    const cellClass = resCount > 0 ? 'data-cell' : 'data-cell zero';
    restaurantRow += `<td class="${cellClass} ${colBgClass}">${displayValue}</td>`;
});
restaurantRow += `</tr>`;
    
    let emptyRows = '';
    for(let i=1; i<=5; i++){
        emptyRows += createEmptyRow('', 25);
    }

    const reportTitle = "Relatório de Atividade Diária";
    const reportPeriod = `${formatDateForPdfDisplay(startDate, lang)} a ${formatDateForPdfDisplay(endDate, lang)}`;

    // [REVISED] Professional design with better CSS and zero-value handling
    return `
    <html>
      <head>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body { 
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; 
            font-size: 10pt; 
            color: #333; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .report-container {
              border: 1px solid #dee2e6;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .report-header { 
            text-align: left; 
            padding: 15px 20px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #0d6efd;
            position: relative;
            min-height: 50px;
          }
          .report-header h1 { 
            font-size: 18pt; 
            margin: 0; 
            color: #0d6efd; 
            font-weight: 600;
          }
          .report-header p { 
            font-size: 11pt; 
            margin: 5px 0 0; 
            color: #6c757d; 
          }
          .report-table { 
            width: 100%; 
            border-collapse: collapse; 
            table-layout: fixed; 
          }
          .report-table th, .report-table td { 
            border: 1px solid #dee2e6; 
            text-align: center; 
            padding: 8px 4px; 
            vertical-align: middle;
          }
          .report-table thead th { 
            background-color: #e9ecef; 
            color: #495057; 
            font-weight: 600;
            border-bottom: 2px solid #adb5bd;
          }
          .row-label { 
            text-align: left; 
            font-weight: bold; 
            padding-left: 10px; 
            width: 130px; 
            background-color: #f8f9fa;
            color: #212529;
            border-right: 2px solid #adb5bd;
          }
          .date-header { 
            font-size: 11pt; 
            font-weight: bold; 
            padding: 8px 2px; 
          }
          .day-header { 
            font-size: 9pt; 
            font-weight: normal; 
            color: #6c757d; 
          }
          .data-cell { 
            font-size: 14pt; 
            font-weight: 700; 
            color: #0d6efd; 
            font-family: 'Consolas', 'Menlo', monospace;
          }
          .data-cell.zero {
            color: #adb5bd;
            font-weight: normal;
            font-size: 14pt;
          }
          .empty-cell { 
            height: 35px; 
            border-top: 1px dotted #ced4da;
            border-bottom: 1px dotted #ced4da;
          }
          .bg-even { background-color: #ffffff; }
          .bg-odd { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="report-container">
            <div class="report-header">
                <h1>${reportTitle}</h1>
                <p>${reportPeriod}</p>
            </div>
            <table class="report-table">
              <thead>
                <tr>
                  <th class="row-label" style="border: none; background: none;"></th>
                  ${dateHeaderHtml}
                </tr>
                <tr>
                  <th class="row-label" style="border: none; background: none;"></th>
                  ${dayHeaderHtml}
                </tr>
              </thead>
              <tbody>
                ${checkInRow}
                ${checkOutRow}
                ${dailyTravelRow}
                ${restaurantRow}
                ${emptyRows}
              </tbody>
            </table>
        </div>
      </body>
    </html>`;
}

/**
 * Reschedule a reservation (for drag-and-drop)
 */
function rescheduleReservation(reservationId, newCheckInDate, newCheckInTime, newCheckOutDate, newCheckOutTime, newBoatId) {
    Logger.log(`rescheduleReservation: ID=${reservationId}, NewDates=${newCheckInDate} to ${newCheckOutDate}, NewBoat=${newBoatId}`);
    try {
        const reservationsResult = getReservations();
        if (reservationsResult.error) return { success: false, message: reservationsResult.error };
        
        const existingRes = reservationsResult.reservations.find(r => r.reservationId === reservationId);
        if (!existingRes) return { success: false, message: 'Reservation not found' };

        // Merge existing data with new dates/boat
        const updatedDetails = {
            ...existingRes,
            checkInDate: newCheckInDate,
            checkInTime: newCheckInTime,
            checkOutDate: newCheckOutDate,
            checkOutTime: newCheckOutTime,
            boatUniqueId: newBoatId || existingRes.boatUniqueId
        };

        // Reuse the main saveReservation logic to handle price recalculation and spreadsheet update
        return saveReservation(updatedDetails, reservationId);
    } catch (e) {
        Logger.log('Error in rescheduleReservation: ' + e.toString());
        return { success: false, message: `Server error during reschedule: ${e.message}` };
    }
}

/**
 * Generate compact Excel-style PDF for filtered reservations
 * @param {Object} exportData - Contains filtered reservations and filter info
 * @returns {Object} - PDF as base64 and filename
 */
function generateFilteredReservationsPdf(exportData) {
  try {
    const reservations = exportData.reservations || [];
    const filters = exportData.filters || {};
    
    if (reservations.length === 0) {
      return { success: false, error: 'No reservations to export' };
    }
    
    // Create new document
    const doc = DocumentApp.create('Reservations_' + new Date().getTime());
    const body = doc.getBody();
    const docId = doc.getId();
    
    // ========================================
    // PORTRAIT - SMALL MARGINS
    // ========================================
    body.setPageHeight(841.9);
    body.setPageWidth(595.3);
    body.setMarginTop(20);
    body.setMarginBottom(20);
    body.setMarginLeft(20);
    body.setMarginRight(20);
    
    // ========================================
    // HEADER WITH COLOR
    // ========================================
    const headerTable = body.appendTable([[
      'AMIEIRA MARINA',
      new Date().toLocaleDateString('en-GB')
    ]]);
    
    headerTable.setBorderWidth(0);
    headerTable.setColumnWidth(0, 380);
    headerTable.setColumnWidth(1, 175);
    
    const brandCell = headerTable.getRow(0).getCell(0);
    brandCell.setBackgroundColor('#1e40af');
    brandCell.setPaddingTop(8);
    brandCell.setPaddingBottom(8);
    brandCell.setPaddingLeft(12);
    brandCell.getChild(0).asParagraph()
      .setFontSize(9)
      .setBold(true)
      .setForegroundColor('#ffffff');
    
    const dateCell = headerTable.getRow(0).getCell(1);
    dateCell.setBackgroundColor('#1e40af');
    dateCell.setPaddingTop(8);
    dateCell.setPaddingBottom(8);
    dateCell.setPaddingRight(12);
    dateCell.getChild(0).asParagraph()
      .setFontSize(9)
      .setBold(true)
      .setForegroundColor('#ffffff')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    
    // ========================================
    // FILTERS (if any)
    // ========================================
    const filterParts = [];
    if (filters.search) filterParts.push('"' + filters.search + '"');
    if (filters.status) filterParts.push(filters.status);
    if (filters.source) filterParts.push(filters.source);
    if (filters.dateFrom) filterParts.push('From: ' + filters.dateFrom);
    if (filters.dateTo) filterParts.push('To: ' + filters.dateTo);
    if (filters.paymentStatus) filterParts.push(filters.paymentStatus);
    
    if (filterParts.length > 0) {
      const filterTable = body.appendTable([['Filters: ' + filterParts.join(' • ')]]);
      filterTable.setBorderWidth(0);
      const filterCell = filterTable.getRow(0).getCell(0);
      filterCell.setBackgroundColor('#fef3c7');
      filterCell.setPaddingTop(5);
      filterCell.setPaddingBottom(5);
      filterCell.setPaddingLeft(10);
      filterCell.getChild(0).asParagraph()
        .setFontSize(8)
        .setBold(true)
        .setForegroundColor('#92400e');
    }
    
    body.appendParagraph(' ').setSpacingAfter(3);
    
    // ========================================
    // MAIN TABLE - EXCEL STYLE
    // ========================================
    const tableData = [];
    
    // Headers
    tableData.push([
      'Client Name',
      'Boat Name',
      'Check-In',
      'Check-Out',
      'Total',
      'Status',
      'Source'
    ]);
    
    // Data rows
    reservations.forEach(function(res) {
      // Format dates with time in one line
      const checkIn = (res.checkInDate || '') + (res.checkInTime ? ' ' + res.checkInTime : '');
      const checkOut = (res.checkOutDate || '') + (res.checkOutTime ? ' ' + res.checkOutTime : '');
      
      tableData.push([
        res.clientName || '',
        res.boatNameAuto || '',
        checkIn,
        checkOut,
        '€' + (res.totalCost || 0).toFixed(2),
        res.status || '',
        res.reservationSource || ''
      ]);
    });
    
    const table = body.appendTable(tableData);
    
    // Column widths
    table.setColumnWidth(0, 120);  // Client Name
    table.setColumnWidth(1, 110);  // Boat Name
    table.setColumnWidth(2, 85);   // Check-in
    table.setColumnWidth(3, 85);   // Check-out
    table.setColumnWidth(4, 55);   // Total
    table.setColumnWidth(5, 55);   // Status
    table.setColumnWidth(6, 45);   // Source
    
    // Table border
    table.setBorderWidth(1);
    table.setBorderColor('#94a3b8');
    
    // ========================================
    // HEADER ROW - PROFESSIONAL COLOR
    // ========================================
    const headerRow = table.getRow(0);
    for (let i = 0; i < headerRow.getNumCells(); i++) {
      const cell = headerRow.getCell(i);
      cell.setBackgroundColor('#334155');
      cell.setPaddingTop(5);
      cell.setPaddingBottom(5);
      cell.setPaddingLeft(4);
      cell.setPaddingRight(4);
      
      cell.getChild(0).asParagraph()
        .setFontSize(8)
        .setBold(true)
        .setForegroundColor('#ffffff')
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
    
    // ========================================
    // DATA ROWS - HIGH CONTRAST ALTERNATING
    // ========================================
    for (let i = 1; i < table.getNumRows(); i++) {
      const row = table.getRow(i);
      const res = reservations[i - 1];
      
      // High contrast alternating rows
      const bgColor = i % 2 === 0 ? '#e2e8f0' : '#ffffff';
      
      for (let j = 0; j < row.getNumCells(); j++) {
        const cell = row.getCell(j);
        cell.setBackgroundColor(bgColor);
        cell.setPaddingTop(4);
        cell.setPaddingBottom(4);
        cell.setPaddingLeft(4);
        cell.setPaddingRight(4);
        
        const para = cell.getChild(0).asParagraph();
        para.setFontSize(8);
        para.setForegroundColor('#1e293b');
        para.setLineSpacing(1);
        
        // Column-specific styling
        if (j === 0) { // Client Name
          para.setBold(true);
          para.setForegroundColor('#0f172a');
        } 
        else if (j === 1) { // Boat Name
          para.setBold(true);
          para.setForegroundColor('#1e40af');
        }
        else if (j === 2 || j === 3) { // Check-in/out
          para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        }
        else if (j === 4) { // Total
          para.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
          para.setBold(true);
          para.setForegroundColor('#0f172a');
        } 
        else if (j === 5) { // Status - NO BACKGROUND COLOR
          para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          para.setBold(true);
          para.setForegroundColor('#0f172a');
        } 
        else if (j === 6) { // Source
          para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          para.setBold(true);
          para.setFontSize(7);
          
          const source = res.reservationSource || '';
          if (source === 'AMIEIRA') {
            para.setForegroundColor('#2563eb');
          } else if (source === 'NICOLS') {
            para.setForegroundColor('#9333ea');
          } else if (source === 'Ancorado') {
            para.setForegroundColor('#0891b2');
          } else if (source === 'Diaria') {
            para.setForegroundColor('#16a34a');
          } else {
            para.setForegroundColor('#64748b');
          }
        }
      }
    }
    
    // ========================================
    // FOOTER BAR
    // ========================================
    body.appendParagraph(' ').setSpacingAfter(3);
    
    const footerTable = body.appendTable([[
      reservations.length + ' records',
      'Generated: ' + new Date().toLocaleString('en-GB')
    ]]);
    
    footerTable.setBorderWidth(0);
    footerTable.setColumnWidth(0, 277);
    footerTable.setColumnWidth(1, 278);
    
    footerTable.getRow(0).getCell(0).setBackgroundColor('#f1f5f9');
    footerTable.getRow(0).getCell(0).setPaddingTop(5);
    footerTable.getRow(0).getCell(0).setPaddingBottom(5);
    footerTable.getRow(0).getCell(0).setPaddingLeft(10);
    footerTable.getRow(0).getCell(0).getChild(0).asParagraph()
      .setFontSize(7)
      .setBold(true)
      .setForegroundColor('#475569');
    
    footerTable.getRow(0).getCell(1).setBackgroundColor('#f1f5f9');
    footerTable.getRow(0).getCell(1).setPaddingTop(5);
    footerTable.getRow(0).getCell(1).setPaddingBottom(5);
    footerTable.getRow(0).getCell(1).setPaddingRight(10);
    footerTable.getRow(0).getCell(1).getChild(0).asParagraph()
      .setFontSize(7)
      .setBold(true)
      .setForegroundColor('#475569')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    
    // ========================================
    // SAVE & CONVERT
    // ========================================
    doc.saveAndClose();
    
    const docFile = DriveApp.getFileById(docId);
    const pdfBlob = docFile.getAs('application/pdf');
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = 'Reservations_' + timestamp + '.pdf';
    
    DriveApp.getFileById(docId).setTrashed(true);
    
    return {
      success: true,
      pdfBase64: base64,
      fileName: fileName
    };
    
  } catch (error) {
    Logger.log('PDF Error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

function doGet() {
  try {
    var template = HtmlService.createTemplateFromFile('Index');
    var html = template.evaluate()
        .setTitle('AMIEIRA MARINA')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    
    return html;
  } catch (e) {
    Logger.log('Error in doGet: ' + e.toString());
    
    // Return a simple error page
    return HtmlService.createHtmlOutput(
      '<h1>Error loading application</h1>' +
      '<p>Please contact support.</p>' +
      '<p>Details: ' + e.toString() + '</p>'
    );
  }
}





function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}
