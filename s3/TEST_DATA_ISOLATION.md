# Testing Data Isolation - Quick Guide

## 🧪 How to Test the Fix

### Test 1: Basic Isolation (Same Browser, Different Users)

1. **User A:**
   ```
   1. Open browser (Chrome)
   2. Go to http://localhost:3000
   3. Login as User A (e.g., usera@test.com)
   4. Upload resume "Resume_A.pdf"
   5. Check dashboard - should show Resume_A data
   6. Note the Resume Score (e.g., 85%)
   7. Logout
   ```

2. **User B:**
   ```
   1. Same browser (Chrome)
   2. Login as User B (e.g., userb@test.com)
   3. Check dashboard - should show "No resumes uploaded"
   4. Should NOT see Resume_A data or 85% score
   5. Upload resume "Resume_B.pdf"
   6. Check dashboard - should show only Resume_B data
   7. Note different Resume Score (e.g., 72%)
   ```

3. **Verify:**
   ```
   ✅ User B does NOT see User A's resume
   ✅ User B does NOT see 85% score
   ✅ Dashboard is empty until User B uploads
   ✅ Each user sees only their own data
   ```

---

### Test 2: Browser Console Check

**Open browser console (F12) and run:**

```javascript
// Check what's in localStorage
console.log('All localStorage keys:', Object.keys(localStorage));

// Check for user-specific keys
const keys = Object.keys(localStorage);
const resumeKeys = keys.filter(k => k.includes('resumeAnalysis'));
console.log('Resume keys found:', resumeKeys);

// Should see format: resumeAnalysis_<userId>
// Example: resumeAnalysis_6746f2e8a1b2c3d4e5f6g7h8
```

**Expected Output:**
```
All localStorage keys: [
  "authToken",
  "resumeAnalysis_6746f2e8a1b2c3d4e5f6g7h8",
  "resumeScore_6746f2e8a1b2c3d4e5f6g7h8",
  "aiAnalysis_6746f2e8a1b2c3d4e5f6g7h8",
  "analysisTimestamp_6746f2e8a1b2c3d4e5f6g7h8"
]
```

---

### Test 3: Network Tab Verification

1. **Open DevTools → Network Tab**
2. **Login as User A**
3. **Navigate to Dashboard**
4. **Look for API call:** `/api/resume/history`
5. **Check Response:**
   ```json
   {
     "resumes": [
       {
         "_id": "...",
         "userId": "USER_A_ID",  ← Should match User A
         "fileName": "Resume_A.pdf",
         "analysis": { ... }
       }
     ]
   }
   ```

6. **Login as User B** (same browser)
7. **Navigate to Dashboard**
8. **Check `/api/resume/history` Response:**
   ```json
   {
     "resumes": [
       {
         "_id": "...",
         "userId": "USER_B_ID",  ← Should match User B (different ID)
         "fileName": "Resume_B.pdf",
         "analysis": { ... }
       }
     ]
   }
   ```

**Verify:**
- ✅ Different userId in responses
- ✅ Different resumes returned
- ✅ No overlap in data

---

### Test 4: Database Verification

**Connect to MongoDB and check:**

```javascript
// MongoDB Query
db.resumes.find({ userId: ObjectId("USER_A_ID") });
// Should return only User A's resumes

db.resumes.find({ userId: ObjectId("USER_B_ID") });
// Should return only User B's resumes

// Verify no shared documents
db.resumes.find({ 
  userId: { $in: [ObjectId("USER_A_ID"), ObjectId("USER_B_ID")] } 
});
// Each document should have only one userId
```

---

### Test 5: Stats Accuracy

**User A Dashboard Should Show:**
- Resume Score: Actual score from User A's resume
- Resumes Uploaded: Count of User A's uploads
- Skills Identified: Skills from User A's resume
- Last Analysis: Date User A uploaded

**User B Dashboard Should Show:**
- Resume Score: Actual score from User B's resume (different from A)
- Resumes Uploaded: Count of User B's uploads (independent from A)
- Skills Identified: Skills from User B's resume (different from A)
- Last Analysis: Date User B uploaded (different from A)

---

### Test 6: Recent Activities

**User A sees:**
```
✅ Resume "Resume_A.pdf" analyzed
✅ Score: 85%
✅ Time: 2 hours ago
```

**User B sees:**
```
✅ Resume "Resume_B.pdf" analyzed
✅ Score: 72%
✅ Time: 10 minutes ago
```

**User B should NOT see:**
```
❌ Resume "Resume_A.pdf" analyzed
❌ Score: 85%
```

---

## 🔍 Quick Debug Checklist

If data is still shared between users:

### Check 1: User Object
```javascript
// In DashboardHome.js, add console.log
console.log('Current user:', user);
console.log('User ID:', user?.id || user?._id);
```

Expected output:
```
Current user: { id: "6746f2e8a1b2c3d4e5f6g7h8", name: "User A", email: "usera@test.com" }
User ID: 6746f2e8a1b2c3d4e5f6g7h8
```

### Check 2: localStorage Keys
```javascript
// Run in browser console
Object.keys(localStorage)
  .filter(k => k.includes('resume'))
  .forEach(k => console.log(k, '→', localStorage.getItem(k).substring(0, 50)));
```

Should show user-specific keys like:
```
resumeAnalysis_6746f2e8... → {"skills":["JavaScript","React"],...
resumeScore_6746f2e8... → 85
```

### Check 3: API Response
```javascript
// In DashboardHome.js fetchResumeData, add:
console.log('API Response:', data);
console.log('Resumes count:', data.resumes?.length);
console.log('User IDs:', data.resumes?.map(r => r.userId));
```

All userId values should be the same (current user's ID)

### Check 4: Token Verification
```javascript
// Decode JWT token
const token = localStorage.getItem('authToken');
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const payload = JSON.parse(atob(base64));
console.log('Token payload:', payload);
console.log('User ID from token:', payload.userId);
```

Should match the current logged-in user

---

## 🚨 Red Flags (Issues to Look For)

1. **User B sees User A's resume name** in Recent Activities
2. **Resume score doesn't change** when different users log in
3. **Skills list is identical** for all users
4. **localStorage keys don't include userId** (just "resumeAnalysis")
5. **API returns resumes with different userId values**
6. **Dashboard shows data immediately** for new user (before upload)

---

## ✅ Success Indicators

1. **Empty Dashboard:** New users see "Upload your first resume"
2. **Unique Data:** Each user sees different scores/skills
3. **Proper Keys:** localStorage has `resumeAnalysis_${userId}` format
4. **API Filtering:** Backend returns only user's own resumes
5. **Real Stats:** Numbers match actual uploaded resumes
6. **No Cross-Contamination:** User B never sees User A's data

---

## 📱 Test Scenarios Summary

| Scenario | User A Action | User B Action | Expected Result |
|----------|--------------|---------------|-----------------|
| 1 | Upload Resume_A | No action | B sees empty dashboard |
| 2 | Upload Resume_A (85%) | Upload Resume_B (72%) | A sees 85%, B sees 72% |
| 3 | Logout | Login | B does NOT see A's data |
| 4 | 5 skills found | 3 skills found | A sees 5, B sees 3 |
| 5 | Resume uploaded | No upload | B's counter is 0 |

---

## 🔧 Troubleshooting

### Problem: User B sees User A's data

**Solution:**
1. Check localStorage keys include userId
2. Clear browser cache
3. Logout and login again
4. Check console for errors
5. Verify backend API response

### Problem: Dashboard shows old data

**Solution:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear localStorage
3. Re-upload resume
4. Check if API is returning correct data

### Problem: Stats don't update

**Solution:**
1. Check fetchResumeData() is called on mount
2. Verify updateStats() receives correct data
3. Check user prop is passed to DashboardHome
4. Inspect network tab for API calls

---

## 📞 Report Issues

If problems persist, provide:
1. Browser console screenshot
2. Network tab showing API calls
3. localStorage contents
4. Current user information
5. Steps to reproduce

---

**Test Status:** ⏳ PENDING
**Next Action:** 🧪 Run tests with 2+ user accounts
**Expected Duration:** 10-15 minutes per test scenario
