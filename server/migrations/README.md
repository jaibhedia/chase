# Database Migration: Add is_public Column

## Issue
The backend is trying to use an `is_public` column that doesn't exist in the `game_rooms` table.

## Error Message
```
Could not find the 'is_public' column of 'game_rooms' in the schema cache
```

## Solution
Run the migration SQL in Supabase to add the missing column.

## Steps to Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the contents of `migrations/add_is_public_column.sql`
5. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or run the specific migration
psql -h your-db-host -U postgres -d postgres -f migrations/add_is_public_column.sql
```

## What This Migration Does
1. ✅ Adds `is_public` column (BOOLEAN, default: true)
2. ✅ Creates an index for faster public room queries
3. ✅ Updates existing rooms to be public by default
4. ✅ Adds documentation comment

## Verification
After running the migration, check that:
```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'game_rooms' AND column_name = 'is_public';

-- Should return:
-- column_name | data_type | column_default
-- is_public   | boolean   | true
```

## After Migration
Once the migration is complete:
1. The backend will work without errors
2. Public rooms feature will be fully functional
3. All new rooms will be public by default (can be changed)
4. Existing rooms will be marked as public

## Rollback (if needed)
```sql
-- Remove the column if something goes wrong
ALTER TABLE game_rooms DROP COLUMN IF EXISTS is_public;
DROP INDEX IF EXISTS idx_game_rooms_is_public;
```
