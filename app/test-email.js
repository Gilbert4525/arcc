// Simple test script to verify email functionality
const fetch = require('node-fetch');

async function testEmail() {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_WjEQQiqA_7CdHd5BqWD5UkLDvjqCiqGU6',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@resend.dev',
        to: 'test@example.com',
        subject: 'Arc Board Management - Test Email',
        html: '<h1>Test Email</h1><p>This is a test email from your Arc Board Management System!</p>',
        text: 'Test Email - This is a test email from your Arc Board Management System!',
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.ok) {
      console.log('✅ Email API is working correctly!');
    } else {
      console.log('❌ Email API error:', result);
    }
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

testEmail();