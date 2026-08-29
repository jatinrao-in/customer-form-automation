const { parseRow } = require('./src/parseRow');

const rawRowText = "25/08/2026\tEPS5456\tBrad Hogan WCM 27/08\t14 Newmarket Street, Bicester, Oxfordshire, OX26 1EL\tOX26 1EL\t7588526492\tbradhogan1989@gmail.com\t\tYES\t\t\t\t\t\tSammy\tGoogle Ads\t\t13 x 535w LONGI + 2 x 5kW Growatt Battery + 1 x 6kW Growatt Battery + 1 x 7kW Ohme HomePro + Bird Guard\t\t\t\t\t£9,100.00\t\t£9,100.00\t\t£2,275.00\t£4,550.00\t£2,275.00";

const parsed = parseRow(rawRowText);
console.log(JSON.stringify(parsed, null, 2));
