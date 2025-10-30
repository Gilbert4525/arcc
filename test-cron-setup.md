# 🧪 Test Your Cron Job Setup

## After Deployment, Follow These Steps:

### **1. Check Vercel Dashboard**
1. Go to your Vercel project dashboard
2. Click on **Functions** tab
3. You should see `/api/cron/process-voting-notifications` listed
4. Check if there are any errors

### **2. Manual Test**
Visit your admin dashboard:
```
https://your-domain.com/admin/voting-emails
```

Click **"Test Voting Notifications"** button to verify the endpoint works.

### **3. Check Cron Logs**
In Vercel dashboard:
1. Go to **Functions** tab
2. Click on your cron function
3. Check the **Logs** to see if it's running every 5 minutes

### **4. Full End-to-End Test**
1. Create a test resolution
2. Add some votes to complete it
3. Wait 5 minutes
4. Check `/admin/voting-emails` dashboard
5. You should see the email was sent!

### **5. Troubleshooting**

**If cron isn't running:**
- Check `vercel.json` is in your root directory
- Verify deployment was successful
- Check Vercel function logs for errors

**If emails aren't sending:**
- Visit `/admin/voting-emails`
- Click "Process Pending Emails" manually
- Check for any error messages

**Need immediate processing?**
- Use the manual "Process Pending Emails" button
- No need to wait for cron

## ✅ Success Indicators

- Vercel dashboard shows the cron function
- Function logs show it runs every 5 minutes
- `/admin/voting-emails` shows recent activity
- Test emails are sent successfully

## 🆘 Get Help

If something isn't working:
1. Check Vercel function logs first
2. Try manual processing via admin dashboard
3. Verify all environment variables are set
4. Check that your domain is working properly