const http = require('http');

const PORT = 5000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Helper utility to make HTTP requests and return parsed responses
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://google.com'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // Keep raw data if not JSON
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log('\n=============================================');
  console.log('   RUNNING API ENDPOINT FUNCTIONAL TESTS');
  console.log('=============================================');

  let testCount = 0;
  let passedCount = 0;

  const assert = (condition, message) => {
    testCount++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  };

  try {
    // --- TEST 1: POST /shorten with standard URL (Success) ---
    console.log('\n[Test 1] Shortening valid URL...');
    const res1 = await makeRequest('POST', '/shorten', {
      originalUrl: 'https://www.google.com'
    });
    assert(res1.statusCode === 201, `Status code is 201 Created (got ${res1.statusCode})`);
    assert(res1.data.shortCode !== undefined, 'shortCode is generated');
    const generatedCode = res1.data.shortCode;
    assert(res1.data.shortUrl.includes(generatedCode), `shortUrl contains generated shortCode (got ${res1.data.shortUrl})`);

    // --- TEST 2: POST /shorten with invalid URL protocol (Failure) ---
    console.log('\n[Test 2] Shortening with illegal protocol...');
    const res2 = await makeRequest('POST', '/shorten', {
      originalUrl: 'ftp://files.example.com'
    });
    assert(res2.statusCode === 400, `Rejected ftp protocol with 400 Bad Request (got ${res2.statusCode})`);
    assert(res2.data.error === 'Validation Error', 'Correct error type returned');

    // --- TEST 3: POST /shorten with malformed URL (Failure) ---
    console.log('\n[Test 3] Shortening with malformed URL string...');
    const res3 = await makeRequest('POST', '/shorten', {
      originalUrl: 'not-a-valid-url'
    });
    assert(res3.statusCode === 400, `Rejected malformed URL with 400 (got ${res3.statusCode})`);

    // --- TEST 4: POST /shorten with Custom Alias (Success) ---
    console.log('\n[Test 4] Shortening with valid Custom Alias...');
    const uniqueAlias = `alias-${Math.floor(Math.random() * 1000000)}`;
    const res4 = await makeRequest('POST', '/shorten', {
      originalUrl: 'https://github.com',
      customAlias: uniqueAlias
    });
    assert(res4.statusCode === 201, `Status code is 201 Created (got ${res4.statusCode})`);
    assert(res4.data.shortCode === uniqueAlias, `shortCode matches custom alias (got ${res4.data.shortCode})`);

    // --- TEST 5: POST /shorten with Reserved Alias (Failure) ---
    console.log('\n[Test 5] Shortening with Reserved Alias...');
    const res5 = await makeRequest('POST', '/shorten', {
      originalUrl: 'https://github.com',
      customAlias: 'admin'
    });
    assert(res5.statusCode === 400, `Rejected reserved alias 'admin' with 400 (got ${res5.statusCode})`);

    // --- TEST 6: POST /shorten with Overly Long Alias (Failure) ---
    console.log('\n[Test 6] Shortening with custom alias > 20 characters...');
    const res6 = await makeRequest('POST', '/shorten', {
      originalUrl: 'https://github.com',
      customAlias: 'this-alias-is-way-too-long-for-system-validation'
    });
    assert(res6.statusCode === 400, `Rejected excessively long custom alias with 400 (got ${res6.statusCode})`);

    // --- TEST 7: GET /:code Redirection ---
    console.log(`\n[Test 7] Accessing redirection for code: ${generatedCode}...`);
    const res7 = await makeRequest('GET', `/${generatedCode}`);
    // A 302 Found redirect status code is expected
    assert(res7.statusCode === 302, `Redirects successfully with 302 Found (got ${res7.statusCode})`);
    assert(res7.headers.location === 'https://www.google.com/', `Redirects to correct originalUrl (got ${res7.headers.location})`);

    // --- TEST 8: GET /analytics/:code Dashboard Metrics ---
    // Let's delay slightly to allow the background non-blocking async click tracker to write to MongoDB
    console.log('\nWaiting 1 second for async background click tracker...');
    await new Promise(r => setTimeout(r, 1000));

    console.log(`[Test 8] Fetching analytics for code: ${generatedCode}...`);
    const res8 = await makeRequest('GET', `/analytics/${generatedCode}`);
    assert(res8.statusCode === 200, `Status code is 200 OK (got ${res8.statusCode})`);
    assert(res8.data.totalClicks === 1, `totalClicks counter registered 1 click (got ${res8.data.totalClicks})`);
    assert(res8.data.analytics.clicksPerDay.length === 7, `clicksPerDay timeline contains exactly 7 calendar elements (got ${res8.data.analytics.clicksPerDay.length})`);
    assert(res8.data.analytics.topCountries[0].country === 'Localhost', `Client location parsed successfully (got ${res8.data.analytics.topCountries[0].country})`);
    assert(res8.data.analytics.topBrowsers[0].browser === 'Chrome', `Client browser parsed successfully (got ${res8.data.analytics.topBrowsers[0].browser})`);

    console.log('\n=============================================');
    console.log(`   TEST RUN COMPLETED: ${passedCount} / ${testCount} PASSED`);
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Critical Test Script Failure:', error.message);
  }
}

// Delay briefly to allow main server model registration to complete fully
setTimeout(runTests, 1500);
