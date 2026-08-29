async function fillNapitForm(page, data, workCompletionDate) {
  // Telegram Bot integration
  const sendTelegram = async (status, message) => {
      let token = '8578634897:AAEp0b9vY2Skr31HpmTzZ1XgH_nlXp2hxLo';
      let chatId = '8341692819';
      
      try {
          const fs = require('fs');
          const path = require('path');
          const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json')));
          if (settings.telegramBotToken) token = settings.telegramBotToken;
          if (settings.telegramChatId) chatId = settings.telegramChatId;
      } catch(e) {}
      
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      
      const text = `${status === 'success' ? '✅' : '❌'} *NAPIT Registration ${status === 'success' ? 'Completed' : 'Failed'}*\n` +
                   `📅 *Date:* ${dateStr}\n` +
                   `👤 *Customer:* ${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}\n` +
                   `📍 *Postcode:* ${data.postcode || ''}\n` +
                   `🔖 *Work Date:* ${workCompletionDate || ''}\n` +
                   `💰 *Value:* £${data.installationValue || ''}\n\n` +
                   `📝 *Status:* ${message}`;
                   
      try {
          await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
          });
      } catch(e) {
          console.error("Telegram send failed", e);
      }
  };

  try {
      await page.goto('https://www.napitonline.com/login', { waitUntil: 'networkidle' });
      console.log("Navigated to NAPIT, checking if login is required...");

      try {
          // Check for login fields
          const loginOrForm = await Promise.race([
              page.waitForSelector('input[name*="username" i], input[name*="email" i], input[type="text"]', { timeout: 10000, state: 'visible' }).then(() => 'login'),
              page.waitForSelector('text=Notifications', { timeout: 10000, state: 'visible' }).then(() => 'form')
          ]);

          if (loginOrForm === 'login') {
              console.log("NAPIT Login page detected. Auto-logging in...");
              const userInputs = await page.$$('input[type="text"], input[type="email"]');
              const passInputs = await page.$$('input[type="password"]');
              
              if (userInputs.length > 0 && passInputs.length > 0) {
                  await userInputs[0].fill('68268');
                  await passInputs[0].fill('Cr68268');
                  
                  const loginBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
                  await loginBtn.click();
                  
                  console.log("NAPIT Login button clicked, waiting for redirect...");
                  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
              }
          }
      } catch (err) {
          console.log("NAPIT Login check timed out. Proceeding...", err.message);
      }

      console.log("Navigating to NAPIT Notifications...");
      await page.goto('https://www.napitonline.com/notifications', { waitUntil: 'networkidle' });

      // Click + ADD button
      console.log("Clicking + ADD button...");
      try {
          await page.locator('button:has-text("ADD")').first().click({ timeout: 10000 });
      } catch(e) {
          await page.locator('text=ADD').first().click();
      }

      console.log("Filling Notification Details...");
      // Work Completion Date
      if (workCompletionDate) {
          await page.fill('input[placeholder*="Date" i], input[name*="date" i]', workCompletionDate);
          await page.keyboard.press('Tab'); // Trigger any validation
      }

      // Your Reference (Surname Postcode)
      const ref = `${data.surname || ''} ${data.postcode || ''}`.trim();
      if (ref) {
          await page.fill('input[placeholder*="Reference" i], label:has-text("Reference") >> xpath=following::input[1]', ref);
      }

      // Contract value
      if (data.installationValue) {
          const valStr = String(data.installationValue).replace(/£|,/g, '');
          try {
              await page.fill('input[placeholder*="Contract value" i], label:has-text("Contract value") >> xpath=following::input[1]', valStr);
          } catch(e) {}
      }

      // Contact Tel. Number
      if (data.phone) {
          let phoneStr = data.phone.trim();
          if (phoneStr.length === 10 && !phoneStr.startsWith('0') && !phoneStr.startsWith('44')) {
              phoneStr = '0' + phoneStr;
          }
          try {
              await page.fill('input[placeholder*="Contact Tel" i], label:has-text("Contact Tel") >> xpath=following::input[1]', phoneStr);
          } catch(e) {}
      }

      // Click Next
      console.log("Clicking Next >");
      await page.locator('button:has-text("Next")').first().click();
      await page.waitForTimeout(2000);

      console.log("Filling Installation Address...");
      
      // Title, First Name, Last Name
      try {
          // Depending on if Title is a select or custom dropdown
          const titleLocator = page.locator('select, [aria-label*="Title" i]').first();
          if (await titleLocator.isVisible()) {
              await titleLocator.selectOption({ label: 'Mr' }).catch(() => {});
          }
      } catch(e) {}
      
      if (data.forename) {
          await page.fill('input[placeholder*="First Name" i], label:has-text("First Name") >> xpath=following::input[1]', data.forename);
      }
      if (data.surname) {
          await page.fill('input[placeholder*="Last Name" i], label:has-text("Last Name") >> xpath=following::input[1]', data.surname);
      }

      // Postcode & Address Lookup
      if (data.postcode) {
          try {
              const postcodeBox = page.locator('input[placeholder*="Postcode" i], label:has-text("Postcode") >> xpath=following::input[1]');
              await postcodeBox.fill(data.postcode);
              await page.waitForTimeout(1000);

              const addressSearch = page.locator('input[placeholder*="Start typing to find address" i]');
              if (await addressSearch.isVisible()) {
                  await addressSearch.fill(data.postcode);
                  await page.waitForTimeout(2000); // Wait for API
                  
                  // Try to find the exact first line, or just click the first address option
                  let clicked = false;
                  if (data.installationAddress) {
                      const firstLine = data.installationAddress.split(',')[0].trim();
                      try {
                          await page.locator(`text=${firstLine}`).first().click({ timeout: 2000 });
                          clicked = true;
                      } catch(e) {}
                  }
                  
                  if (!clicked) {
                      // Fallback: click the first dropdown option that appears
                      try {
                          await page.locator('.address-lookup-results div, .dropdown-item').first().click({ timeout: 2000 });
                      } catch(e) {
                          await page.keyboard.press('ArrowDown');
                          await page.keyboard.press('Enter');
                      }
                  }
              }
          } catch(e) {
              console.log("Address lookup failed", e.message);
          }
      }

      // Customers Email Address
      if (data.email) {
          try {
              await page.fill('input[placeholder*="Email" i], label:has-text("Email") >> xpath=following::input[1]', data.email);
          } catch(e) {}
      }

      console.log("NAPIT Form Phase 1 completed successfully. Halting execution as requested.");
      
      // We are stopping here for now as requested.
      await sendTelegram('success', 'NAPIT Phase 1 filled successfully. Script paused at Step 2.');
      
      if (global.saveHistory) {
          global.saveHistory({
              status: 'success',
              customer: `${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}`.trim(),
              postcode: data.postcode,
              contract: 'NAPIT-' + ref
          });
      }

  } catch(globalErr) {
      console.error("Fatal Error during NAPIT automation:", globalErr);
      await sendTelegram('failed', `Error: ${globalErr.message}`);
      if (global.saveHistory) {
          global.saveHistory({
              status: 'failed',
              customer: `${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}`.trim(),
              postcode: data.postcode,
              contract: 'NAPIT',
              error: globalErr.message
          });
      }
      throw globalErr;
  }
}

module.exports = { fillNapitForm };
