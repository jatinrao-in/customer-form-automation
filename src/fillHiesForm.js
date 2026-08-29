async function fillHiesForm(page, data) {
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
      
      const text = `${status === 'success' ? '✅' : '❌'} *HIES Registration ${status === 'success' ? 'Completed' : 'Failed'}*\n` +
                   `📅 *Date:* ${dateStr}\n` +
                   `👤 *Customer:* ${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}\n` +
                   `📍 *Postcode:* ${data.postcode || ''}\n` +
                   `🔖 *Contract:* ${data.contractReference || ''}\n` +
                   `💰 *Value:* £${data.installationValue || ''}\n\n` +
                   `📝 *Status:* ${message}`;
                   
      try {
          await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  chat_id: chatId,
                  text: text,
                  parse_mode: 'Markdown'
              })
          });
      } catch(e) {
          console.error("Telegram send failed", e);
      }
  };

  try {
      await page.goto('https://schemes.org.uk/installer/registrations/newguarantee', { waitUntil: 'networkidle' });
      console.log("Navigated, checking if login is required...");

      try {
          // Wait up to 10 seconds to see if a password field appears OR if the form appears
          const loginOrForm = await Promise.race([
              page.waitForSelector('input[type="password"]', { timeout: 10000, state: 'visible' }).then(() => 'login'),
              page.waitForSelector('text=Able to Pay/Consumer Funded', { timeout: 10000, state: 'visible' }).then(() => 'form'),
              page.waitForSelector('text="Able to Pay"', { timeout: 10000, state: 'visible' }).then(() => 'form')
          ]);

          if (loginOrForm === 'login') {
              console.log("Login page detected. Auto-logging in...");
              const emailInput = page.locator('input[type="email"], input[name*="user" i], input[name*="email" i]').first();
              const passInput = page.locator('input[type="password"]').first();
              
              await emailInput.fill('ishita@evergreenpoweruk.com');
              await passInput.fill('Epukfoam@2025');
              
              // Find and click the login button
              const loginBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
              await loginBtn.click();
              
              console.log("Login button clicked, waiting for redirect...");
              await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log("Navigation wait timeout, continuing..."));
              
              if (!page.url().includes('newguarantee')) {
                  console.log("Not on guarantee page, navigating...");
                  await page.goto('https://schemes.org.uk/installer/registrations/newguarantee', { waitUntil: 'networkidle' });
              }
              console.log("Logged in successfully! Ready to fill the form.");
          } else {
              console.log("Already on the form page. No login needed.");
          }
      } catch (err) {
          console.log("Login check timed out. Proceeding to form...", err.message);
      }

      console.log("Attempting to fill the form...");

      // Step 1: select funding type
      try {
          await page.click('text=Able to Pay/Consumer Funded', { timeout: 5000 });
      } catch (err) {
          console.log("Could not find 'Able to Pay' button.");
      }

      // Helper for custom dropdowns (Div-based select boxes)
      async function selectCustom(placeholder, optionText, useArrowDown = false) {
          try {
              try {
                  await page.locator(`text="${placeholder}"`).first().click({ timeout: 2500, force: true });
              } catch(e) {
                  await page.locator(`[placeholder="${placeholder}"]`).first().click({ timeout: 2500, force: true });
              }
              await page.waitForTimeout(1000); // Wait longer for menu animation
              
              if (useArrowDown) {
                  await page.keyboard.press('ArrowDown');
                  await page.waitForTimeout(200);
                  await page.keyboard.press('Enter');
              } else {
                  await page.locator(`text="${optionText}"`).first().click({ timeout: 2500, force: true });
              }
          } catch (e) {
              console.log(`Failed to select custom dropdown: ${placeholder}`, e.message);
          }
      }

      // Title - Always Mr
      await selectCustom('Select Title', 'Mr');

      if (data.forename) await page.fill('[placeholder="Forename"], input[name*="forename" i]', data.forename);
      if (data.surname) await page.fill('[placeholder="Surname"], input[name*="surname" i]', data.surname);

      // Postcode with Loqate Auto-complete
      if (data.postcode) {
          try {
              const postcodeBox = page.locator('text=Installation Address Postcode').locator('xpath=following::input[1]');
              await postcodeBox.fill(data.postcode);
              await page.waitForTimeout(2500); // Wait for Loqate API
              
              let clicked = false;
              if (data.installationAddress) {
                  const firstLine = data.installationAddress.split(',')[0].trim();
                  try {
                      await page.locator(`text=${firstLine}`).first().click({ timeout: 2000 });
                      clicked = true;
                  } catch(e) {}
              }
              
              if (!clicked) {
                  // MANUALLY ENTER ADDRESS
                  try {
                      await page.locator('text="Enter installation address manually"').first().click({ timeout: 2000 });
                      await page.waitForTimeout(500);
                      
                      const addressParts = data.installationAddress.split(',').map(s => s.trim());
                      
                      if (addressParts.length > 0) {
                          await page.locator('text=1st Line Address >> xpath=following::input[1]').first().fill(addressParts[0]);
                      }
                      if (addressParts.length === 2) {
                          await page.locator('text=Town >> xpath=following::input[1]').first().fill(addressParts[1]);
                      } else if (addressParts.length === 3) {
                          await page.locator('text=Town >> xpath=following::input[1]').first().fill(addressParts[1]);
                          await page.locator('text=County >> xpath=following::input[1]').first().fill(addressParts[2]);
                      } else if (addressParts.length > 3) {
                          await page.locator('text=2nd Line Address >> xpath=following::input[1]').first().fill(addressParts[1]);
                          await page.locator('text=Town >> xpath=following::input[1]').first().fill(addressParts[2]);
                          await page.locator('text=County >> xpath=following::input[1]').first().fill(addressParts[3]);
                      }
                      
                      await page.locator('text=Postcode* >> xpath=following::input[1]').first().fill(data.postcode);
                  } catch(manualErr) {}
              }
          } catch (e) {}
      }

      if (data.email) await page.fill('[placeholder="Email Address"], input[name*="email" i], input[type="email"]', data.email);
      if (data.phone) await page.fill('[placeholder*="Mobile Number"], input[name*="phone" i], [placeholder*="Landline"]', data.phone);

      if (data.sameAsInstallationAddress === false) {
         try {
             const toggle = await page.$('input[type="checkbox"][name*="sameAs"]');
             if (toggle) {
                 const isChecked = await toggle.isChecked();
                 if (isChecked) await toggle.uncheck();
             }
         } catch (e) {}
      }

      if (data.contractReference) {
          try {
              await page.fill('text=Your Contract Reference >> xpath=following::input[1]', data.contractReference);
          } catch (e) {
              await page.fill('input[name*="contract" i], [placeholder*="Contract Reference" i]', data.contractReference);
          }
      }
      
      if (data.installationValue) {
          const valStr = String(data.installationValue).replace(/£|,/g, '');
          try {
              await page.fill('text=Installation Value >> xpath=following::input[1]', valStr);
          } catch (e) {
              await page.fill('[placeholder*="Installation Value" i], input[name*="installationValue" i]', valStr);
          }
      }

      // Contract Signed Date - Proper Date Paste
      if (data.contractSignedDate) {
          try {
              const dateSelector = 'text=Contract Signed Date >> xpath=following::input[1]';
              const inputType = await page.getAttribute(dateSelector, 'type');
              if (inputType === 'date') {
                  const parts = data.contractSignedDate.split('/');
                  if (parts.length === 3) {
                      await page.fill(dateSelector, `${parts[2]}-${parts[1]}-${parts[0]}`); 
                  }
              } else {
                  await page.locator(dateSelector).clear();
                  await page.locator(dateSelector).pressSequentially(data.contractSignedDate, { delay: 50 });
              }
          } catch(e) {}
      }

      // Deposit Payment Method - Always 1st Option
      await selectCustom('Select Deposit Payment Method', null, true);

      if (data.depositValue) {
          const depValStr = String(data.depositValue).replace(/£|,/g, '');
          try {
              await page.fill('text=Deposit Value >> xpath=following::input[1]', depValStr);
          } catch(e) {
              await page.fill('[placeholder*="Deposit Value" i], input[name*="depositValue" i]', depValStr);
          }
      }

      // Home Improvement Installed
      if (data.homeImprovementInstalled) {
          await selectCustom('Select Home Improvement', data.homeImprovementInstalled);
          
          // Die-hard fix: Wait for the MCS SweetAlert popup and click "No"
          try {
              const noButton = page.getByRole('button', { name: 'No', exact: true });
              await noButton.waitFor({ state: 'visible', timeout: 3500 });
              await noButton.click({ force: true });
              await page.waitForTimeout(1500);
          } catch(e) {
              try {
                  const altNoButton = page.locator('button:has-text("No")').last();
                  if (await altNoButton.isVisible({ timeout: 1000 })) {
                      await altNoButton.click({ force: true });
                      await page.waitForTimeout(1500);
                  }
              } catch(err) {}
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
      }

      // Guarantee Length - Always 2 Years
      await selectCustom('Select Guarantee Length', null, true);

      if (data.manufacturerName) {
          try {
              await page.fill('text=Manufacturer Name >> xpath=following::input[1]', data.manufacturerName);
          } catch (e) {}
      }

      if (data.quantity) {
          try {
              await page.fill('text=Quantity >> xpath=following::input[1]', String(data.quantity));
          } catch (e) {}
      }

      console.log('Form filled. Adding product and submitting...');

      // 1. Click Add Product
      try {
          const addBtn = page.getByRole('button', { name: /Add Product/i }).first();
          await addBtn.click({ force: true, timeout: 5000 });
          await page.waitForTimeout(3000); // Wait 3 full seconds for table to update
      } catch(e) {
          console.log('Failed to click Add Product', e.message);
          try {
              await page.locator('text=/Add Product/i').last().click({ force: true, timeout: 2000 });
              await page.waitForTimeout(3000);
          } catch(err) {}
      }

      // 2. Click Submit Registration
      try {
          const submitBtn = page.getByRole('button', { name: /Submit Registration/i }).first();
          await submitBtn.click({ force: true, timeout: 5000 });
          
          console.log("Submit clicked. Waiting for Success Popup...");
          // Use regex to ignore any hidden whitespace or case issues
          const successMsg = page.locator('text=/Registration Successfully Completed/i').first();
          await successMsg.waitFor({ state: 'visible', timeout: 60000 });
          console.log("Success popup detected!");
          
      } catch(e) {
          console.log('Failed to detect success popup or click submit', e.message);
          try {
              const fs = require('fs');
              const path = require('path');
              const screenshotPath = path.join(__dirname, '../public/error.png');
              await page.screenshot({ path: screenshotPath, fullPage: true });
              console.log("Screenshot saved! Open /error.png in your browser to see what went wrong.");
          } catch (err) {
              console.log("Could not save screenshot:", err.message);
          }
          throw new Error("Submission failed. Check /error.png for details.");
      }

      // 3. Send Success Telegram Message
      await sendTelegram('success', 'Registration submitted successfully.');
      if (global.saveHistory) {
          global.saveHistory({
              status: 'success',
              customer: `${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}`.trim(),
              postcode: data.postcode,
              contract: data.contractReference
          });
      }

      // 4. Navigate back to a clean form page for the next customer
      console.log("Navigating back to fresh form page...");
      await page.goto('https://schemes.org.uk/installer/registrations/newguarantee', { waitUntil: 'networkidle' });
      console.log("Automation finished perfectly!");

  } catch(globalErr) {
      console.error("Fatal Error during automation:", globalErr);
      await sendTelegram('failed', `Error: ${globalErr.message}`);
      if (global.saveHistory) {
          global.saveHistory({
              status: 'failed',
              customer: `${data.title || 'Mr'} ${data.forename || ''} ${data.surname || ''}`.trim(),
              postcode: data.postcode,
              contract: data.contractReference,
              error: globalErr.message
          });
      }
  }
}

module.exports = { fillHiesForm };
