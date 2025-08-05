// Test Resend API directly
const https = require('https');

const data = JSON.stringify({
  from: 'noreply@resend.dev',
  to: 'test@example.com',
  subject: 'Arc Board Management - Test Email',
  html: '<h1>Test Email</h1><p>This is a test email from your Arc Board Management System!</p>',
  text: 'Test Email - This is a test email from your Arc Board Management System!'
});

const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer re_WjEQQiqA_7CdHd5BqWD5UkLDvjqCiqGU6',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', body);
    
    if (res.statusCode === 200) {
      console.log('✅ Resend API is working correctly!');
    } else {
      console.log('❌ Resend API error');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(data);
req.end();

console.log('Testing Resend API...');