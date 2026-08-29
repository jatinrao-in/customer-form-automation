function parseRow(rawRowText) {
    const columns = rawRowText.split(/[\t\n]+/).map(c => c.trim()).filter(Boolean);
    const errors = [];

    // Helpers
    const ukPostcodeRegex = /[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}/i;
    
    // --- Determine column indices by pattern or fallback to default index ---
    
    // Email (contains @)
    const emailStr = columns.find(c => c.includes('@'));
    
    // Date (DD/MM/YYYY)
    const dateStr = columns.find(c => /\d{2}\/\d{2}\/\d{4}/.test(c));
    
    // YES flag
    const yesFlagStr = columns.find(c => c === 'YES' || c === 'NO');
    
    // Phone (mostly digits, at least 10)
    const phoneStr = columns.find(c => /^[\d\s+()]+$/.test(c) && c.replace(/\D/g, '').length >= 10);
    
    // Postcode (matches UK postcode exactly or closely)
    const postcodeStr = columns.find(c => ukPostcodeRegex.test(c) && c.length <= 10);
    
    // Address (contains commas and is relatively long)
    const addressIndex = columns.findIndex(c => c.includes(',') && c.length > 20);
    const addressStr = addressIndex !== -1 ? columns[addressIndex] : null;
    
    // Product string (contains ' x ' and '+')
    const productStr = columns.find(c => c.includes(' x ') && (c.includes('+') || c.match(/LONGI|DMEGC|TESLA|DYNESS|GROWATT/i)));
    
    // Name (The name column is usually before the address, or it's the very first column)
    let nameStr = addressIndex > 0 ? columns[addressIndex - 1] : null;
    if (!nameStr && columns.length > 0) {
        if (columns[0].includes(' ') && columns[0].length < 40) {
            nameStr = columns[0];
        }
    }


    // --- Extract and format fields ---

    // 3.1 Forename & Surname
    let forename = null;
    let surname = null;
    if (nameStr) {
        const nameWords = nameStr.split(/\s+/).filter(Boolean);
        if (nameWords.length < 2) {
            errors.push("Cannot determine forename/surname");
        } else {
            forename = nameWords[0];
            surname = nameWords[1];
        }
    } else {
        errors.push("Cannot determine forename/surname");
    }

    // 3.2 Installation Address
    const installationAddress = addressStr || null;

    // 3.3 Installation Address Postcode
    let postcode = postcodeStr || null;
    if (!postcode && installationAddress) {
        const match = installationAddress.match(ukPostcodeRegex);
        if (match) {
            postcode = match[0];
        }
    }

    // 3.4 Customer Email Address
    const email = emailStr || null;
    if (email && !email.includes('@')) {
        errors.push("Invalid email format");
    }

    // 3.5 Customer UK Landline/Mobile Number
    let phone = null;
    if (phoneStr) {
        const rawPhone = phoneStr.replace(/\D/g, '');
        if (rawPhone.length === 10) {
            phone = "0" + rawPhone;
        } else if (rawPhone.length === 12 && rawPhone.startsWith("44")) {
            phone = rawPhone;
        } else {
            errors.push("Unrecognized phone format");
        }
    } else {
        errors.push("Unrecognized phone format");
    }

    // 3.6 "Same as Installation Address" checkbox
    const sameAsInstallationAddress = (yesFlagStr === 'YES');

    // 3.7 Your Contract Reference
    let contractReference = null;
    if (surname && postcode) {
        contractReference = `${surname} ${postcode}`;
    }

    // 3.8 Installation Value & 3.11 Deposit Value
    // Find columns that look like amounts (with or without £) and > 100
    const currencyVals = columns
        .filter(c => /^(?:£)?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/.test(c) || /^(?:£)?\d+(?:\.\d{2})?$/.test(c))
        .map(c => parseFloat(c.replace(/[£,]/g, '')))
        .filter(n => !isNaN(n) && n > 100 && n < 1000000); // Filter out phone numbers (>1M)

    let installationValue = null;
    let depositValue = null;

    if (currencyVals.length > 0) {
        installationValue = currencyVals[0];
        // User specified deposit is the 3rd value
        if (currencyVals.length >= 3) {
            depositValue = currencyVals[2];
        } else if (currencyVals.length === 2) {
            depositValue = currencyVals[1];
        } else {
            depositValue = installationValue * 0.25; // fallback
        }
    }

    // 3.9 Contract Signed Date
    const contractSignedDate = dateStr || null;

    // 3.10 Deposit Payment Method
    const depositPaymentMethod = "FIRST_OPTION";

    // 3.12, 3.14, 3.15 Home Improvement, Manufacturer, Quantity
    let manufacturerName = null;
    let homeImprovementInstalled = null;
    let quantity = null;

    if (productStr) {
        const segments = productStr.split('+').map(s => s.trim());
        const solarBrands = ["LONGI", "DMEGC"];
        const batteryBrands = ["TESLA", "DYNESS", "GROWATT"];

        for (const brand of solarBrands) {
            if (productStr.toUpperCase().includes(brand)) {
                manufacturerName = brand;
                homeImprovementInstalled = "Solar PV with Battery Storage";
                break;
            }
        }

        if (!manufacturerName) {
            for (const brand of batteryBrands) {
                if (productStr.toUpperCase().includes(brand)) {
                    manufacturerName = brand;
                    homeImprovementInstalled = "Battery Storage";
                    break;
                }
            }
        }

        if (!manufacturerName) {
            errors.push("Cannot determine Home Improvement type — manual review needed");
        } else {
            const matchingSegment = segments.find(s => s.toUpperCase().includes(manufacturerName));
            if (matchingSegment) {
                const qtyMatch = matchingSegment.match(/^\s*(\d+)\s*x/i);
                if (qtyMatch) {
                    quantity = parseInt(qtyMatch[1], 10);
                }
            }
        }
    } else {
        errors.push("Cannot determine Home Improvement type — manual review needed");
    }

    // 3.13 Guarantee Length
    const guaranteeLength = "2 years";

    return {
        forename,
        surname,
        installationAddress,
        postcode,
        email,
        phone,
        sameAsInstallationAddress,
        contractReference,
        installationValue,
        contractSignedDate,
        depositPaymentMethod,
        depositValue,
        homeImprovementInstalled,
        guaranteeLength,
        manufacturerName,
        quantity,
        parseErrors: errors
    };
}

module.exports = { parseRow };
