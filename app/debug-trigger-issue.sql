-- DEBUG: Let's check if the trigger actually exists and is working
-- Run these queries one by one to diagnose the real issue

-- Step 1: Check if the trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_minutes_voting_results';

-- Step 2: Check if the trigger exists on the table
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'minutes_votes';

-- Step 3: Check the actual trigger definition
SELECT pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'trigger_update_minutes_voting_results';

-- Step 4: Test if we can manually call the trigger function
-- (This will help us see if there are errors in the function itself)
SELECT update_minutes_voting_results();