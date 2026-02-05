import { GoogleAuth } from "google-auth-library";

// Common Auth Helper
async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

const BASE_URL = "https://walletobjects.googleapis.com/walletobjects/v1";

// --- CRUD ---

// LIST
export async function listGenericClasses(issuerId: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/genericClass?issuerId=${issuerId}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error(`List failed: ${response.statusText}`);
  return await response.json();
}

// GET
export async function getGenericClass(classId: string) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/genericClass/${classId}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Get failed: ${response.statusText}`);
  return await response.json();
}

// CREATE / UPDATE
export async function createOrUpdateGenericClass(classId: string, resourceBody: any) {
  const token = await getAccessToken();
  
  // Ensure ID matches
  resourceBody.id = classId;

  // Try POST (Create)
  let response = await fetch(`${BASE_URL}/genericClass`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resourceBody),
  });

  // If 409, Try PUT (Update)
  if (response.status === 409) {
    console.log(`Class ${classId} exists, updating...`);
    response = await fetch(`${BASE_URL}/genericClass/${classId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resourceBody),
    });
  }

  if (!response.ok) {
     const err = await response.text();
     throw new Error(`Operation failed: ${err}`);
  }
  
  return await response.json();
}

// DELETE
export async function deleteGenericClass(classId: string) {
  // NOTE: Google Wallet API currently does not support deleting Classes via REST API.
  // This function will fail with 404/405 from Google.
  // We keep the structure but throw a descriptive error to save the developer time.
  console.warn("Attempted to delete class", classId);
  throw new Error("Google Wallet API does not support deleting Classes. You must archive them or reuse the ID.");
}

// --- Legacy Wrapper for existing code compatibility ---
export async function createGenericClass(issuerId: string, classIdSuffix: string, classTemplate: any) {
    const fullClassId = `${issuerId}.${classIdSuffix}`;
    
    const resource = {
        ...classTemplate,
        id: fullClassId,
    };

    return await createOrUpdateGenericClass(fullClassId, resource);
}
