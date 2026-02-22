import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();
app.use('*', logger(console.log));
app.use('*', cors());

// Initialize Supabase Client (Service Role for Admin Tasks)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'make-6c4f77a7-photos';

// Ensure bucket exists on startup
async function initBucket() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing buckets:", error);
      return;
    }
    
    const exists = buckets.find((b) => b.name === BUCKET_NAME);
    if (!exists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
      });
      if (createError) console.error("Error creating bucket:", createError);
    } else {
      console.log(`Bucket ${BUCKET_NAME} already exists.`);
    }
  } catch (e) {
    console.error("Bucket init exception:", e);
  }
}

// Run initialization
initBucket();

// Routes prefix
const BASE_PATH = '/make-server-6c4f77a7';

// Health Check
app.get(`${BASE_PATH}/health`, (c) => c.text('OK'));

// Upload Endpoint
app.post(`${BASE_PATH}/upload`, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error("Upload error:", error);
      return c.json({ error: error.message }, 500);
    }

    // Create a signed URL valid for 1 hour (3600s)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    if (signError) {
      return c.json({ error: signError.message }, 500);
    }

    return c.json({ 
      success: true, 
      path: filePath, 
      url: signedData.signedUrl 
    });

  } catch (e) {
    console.error("Upload exception:", e);
    return c.json({ error: e.message }, 500);
  }
});

// Booking Endpoint
app.post(`${BASE_PATH}/book`, async (c) => {
  try {
    const { placeId, placeName, date, userId } = await c.req.json();
    
    if (!placeId || !userId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const bookingId = `booking:${userId}:${Date.now()}`;
    const bookingData = {
      id: bookingId,
      userId,
      placeId,
      placeName,
      date,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    await kv.set(bookingId, bookingData);

    return c.json({ success: true, booking: bookingData });
  } catch (e) {
    console.error("Booking exception:", e);
    return c.json({ error: e.message }, 500);
  }
});

// Sign Up Endpoint
app.post(`${BASE_PATH}/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    console.log(`Creating user: ${email}`);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || 'PolyJarvis User' },
      email_confirm: true
    });

    if (error) {
      console.log(`Create user error for ${email}: ${error.message} (code: ${(error as any).code || 'unknown'})`);
      
      // Handle "email already exists" gracefully
      const errorCode = (error as any).code || '';
      const isEmailExists = errorCode === 'email_exists' || error.message?.includes('already been registered');
      
      if (isEmailExists) {
        return c.json({ 
          error: "An account with this email already exists. Please sign in instead.", 
          code: "email_exists" 
        }, 409);
      }
      
      return c.json({ error: error.message }, 400);
    }

    // Confirm user email explicitly to ensure immediate login capability
    if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.admin.updateUserById(data.user.id, {
            email_confirm: true
        });
    }

    return c.json({ success: true, user: data.user });
  } catch (e) {
    console.error("Sign up exception:", e);
    return c.json({ error: e.message }, 500);
  }
});

// Canvas Proxy Endpoint
app.post(`${BASE_PATH}/canvas/proxy`, async (c) => {
    try {
        const { token, domain, endpoint } = await c.req.json();

        if (!token || !endpoint) {
            return c.json({ error: "Missing token or endpoint" }, 400);
        }

        const canvasDomain = domain || "canvas.calpoly.edu";
        // Security check: only allow canvas domains or safe domains
        if (!canvasDomain.includes("canvas") && !canvasDomain.includes("instructure")) {
             return c.json({ error: "Invalid Canvas domain" }, 400);
        }

        const url = `https://${canvasDomain}/api/v1${endpoint}`;
        console.log(`Proxying to Canvas: ${url}`);

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Canvas API Error (${response.status}): ${errText}`);
            return c.json({ error: `Canvas API Error: ${response.status}`, details: errText }, response.status);
        }

        const data = await response.json();
        return c.json(data);

    } catch (e) {
        console.error("Canvas Proxy Exception:", e);
        return c.json({ error: e.message }, 500);
    }
});

// Start Server
Deno.serve(app.fetch);