-- Fix duplicate resolution numbers
-- This script identifies and fixes any duplicate resolution numbers

-- First, let's see if there are any duplicates
SELECT resolution_number, COUNT(*) as count
FROM public.resolutions 
GROUP BY resolution_number 
HAVING COUNT(*) > 1;

-- If there are duplicates, we'll update them with unique numbers
-- This creates a temporary function to fix duplicates
CREATE OR REPLACE FUNCTION fix_duplicate_resolution_numbers()
RETURNS void AS $$
DECLARE
    duplicate_record RECORD;
    new_number TEXT;
    year_part TEXT;
    max_num INTEGER;
BEGIN
    -- Loop through all duplicate resolution numbers
    FOR duplicate_record IN 
        SELECT resolution_number, array_agg(id ORDER BY created_at) as ids
        FROM public.resolutions 
        GROUP BY resolution_number 
        HAVING COUNT(*) > 1
    LOOP
        -- Extract year from the resolution number
        year_part := substring(duplicate_record.resolution_number from 'RES-(\d{4})-');
        
        -- Get the maximum number for this year
        SELECT COALESCE(MAX(CAST(substring(resolution_number from 'RES-\d{4}-(\d+)') AS INTEGER)), 0)
        INTO max_num
        FROM public.resolutions 
        WHERE resolution_number LIKE 'RES-' || year_part || '-%';
        
        -- Update all but the first record (keep the oldest one)
        FOR i IN 2..array_length(duplicate_record.ids, 1) LOOP
            max_num := max_num + 1;
            new_number := 'RES-' || year_part || '-' || lpad(max_num::text, 3, '0');
            
            UPDATE public.resolutions 
            SET resolution_number = new_number,
                updated_at = NOW()
            WHERE id = duplicate_record.ids[i];
            
            RAISE NOTICE 'Updated resolution % to %', duplicate_record.ids[i], new_number;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix duplicates
SELECT fix_duplicate_resolution_numbers();

-- Drop the temporary function
DROP FUNCTION fix_duplicate_resolution_numbers();

-- Verify no duplicates remain
SELECT resolution_number, COUNT(*) as count
FROM public.resolutions 
GROUP BY resolution_number 
HAVING COUNT(*) > 1;

-- If the above query returns no rows, all duplicates have been fixed