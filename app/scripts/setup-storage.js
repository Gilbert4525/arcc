// Supabase Storage Setup Script
// This script sets up the storage bucket for document uploads

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('🗄️ Setting up Supabase storage...\n');

  try {
    // Check if documents bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      return;
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');

    if (documentsBucket) {
      console.log('✅ Documents bucket already exists');
    } else {
      console.log('📁 Creating documents bucket...');
      
      const { data: bucket, error: createError } = await supabase.storage.createBucket('documents', {
        public: false, // Keep documents private by default
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'audio/mp3',
          'audio/wav',
          'audio/m4a'
        ],
        fileSizeLimit: 52428800, // 50MB in bytes
      });

      if (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        return;
      }

      console.log('✅ Documents bucket created successfully');
    }

    // Set up storage policies (RLS for storage)
    console.log('\n🔐 Setting up storage policies...');

    // Note: Storage policies need to be set up in the Supabase dashboard
    // or via SQL. This is just informational.
    console.log('📋 Manual steps required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage > Policies');
    console.log('3. Add the following policies for the "documents" bucket:');
    console.log('   - SELECT: Allow authenticated users to view documents');
    console.log('   - INSERT: Allow authenticated users to upload documents');
    console.log('   - UPDATE: Allow users to update their own documents');
    console.log('   - DELETE: Allow users to delete their own documents or admins to delete any');

    // Test upload (optional)
    console.log('\n🧪 Testing upload functionality...');
    
    const testFile = new Blob(['Hello, World!'], { type: 'text/plain' });
    const testPath = `test/test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testPath, testFile);

    if (uploadError) {
      console.log('⚠️  Upload test failed (this might be due to RLS policies):', uploadError.message);
      console.log('   This is expected if storage policies are not set up yet.');
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      await supabase.storage.from('documents').remove([testPath]);
      console.log('🧹 Test file cleaned up');
    }

    console.log('\n🎉 Storage setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up storage policies in Supabase dashboard');
    console.log('2. Test file uploads through your application');

  } catch (error) {
    console.error('❌ Storage setup failed:', error.message);
  }
}

setupStorage();
