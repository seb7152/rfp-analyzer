# Authentication and Organization Testing Guide

## ✅ Status: Registration Backend WORKING

The registration system is now fully functional. Here's how to test it:

## Quick Test via Browser

### 1. Test Registration

- Go to: `http://localhost:3001/register`
- Fill in the form:
  - Full Name: "Jean Dupont"
  - Email: "jean@example.com" (use unique email each time)
  - Password: "SecurePassword123" (min 8 chars)
  - Organization: "My First Company"
- Click "Créer mon compte"

**Expected**: Redirect to `/dashboard` with navbar showing your organization

### 2. Test Dashboard

- You should see:
  - Navbar with user name and theme toggle
  - Organization switcher dropdown (currently showing "My First Company")
  - Main dashboard content with user info

### 3. Test Organization Switching

- Click the organization dropdown
- You should see "My First Company" as your only org
- Note: You can create new orgs later via the "Create Organization" button

### 4. Test Logout

- Click user menu (top right)
- Click "Se déconnecter"
- You should be redirected to `/login`

## Manual API Testing (for development)

If you need to test without the UI:

```bash
# 1. Create auth user
curl -X POST https://ixxmjmxfzipxmlwmqods.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "data": {"full_name": "Test User"}
  }'

# Extract user.id and access_token from response

# 2. Complete registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_ABOVE",
    "email": "test@example.com",
    "fullName": "Test User",
    "organizationName": "Test Organization"
  }'
```

## Known Issues / Recent Fixes

### Fixed: RLS Policies

- ✅ Users can INSERT their own profile during registration
- ✅ Users can SELECT their own profile after login
- ✅ Organizations can be created during registration
- ✅ User-organization links can be created during registration

### Current Limitations

- Organizations table has RLS disabled (temporary)
- Will need to refine RLS policies for production security
- Need to test: multi-organization features, member invitations, role-based access

## Next Steps

1. **UI Testing** (PRIORITY)
   - Test complete registration flow in browser
   - Verify navbar renders correctly
   - Test organization switching
   - Test logout

2. **Phase 4 Implementation**
   - View and navigate requirements hierarchy
   - Create RFP analyzer features

3. **RLS Refinement**
   - Re-enable RLS on organizations with proper policies
   - Implement admin-only features with RLS

## Database State

Current test data:

- Multiple test users created during development
- Test organizations created
- All properly linked with user-organization relationships

Feel free to create new test accounts - the system is ready!
