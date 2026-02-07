import { PKPass } from "passkit-generator";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { getClubConfig } from "@/lib/clubs-config";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashMemberData, MemberHash } from "@/lib/member-verification";

// Placeholder verification function
export async function verifyStudent(name: string, cardNumber: string, club: string): Promise<boolean> {
    console.log(`Verifying ${name}, ${cardNumber} for ${club}`);
    
    // Quick format check
    // Ensure case insensitivity for name match as per requirement
    const cleanName = String(name).trim(); // Keep case for display/hashing logic handling inside verifyMemberHash? 
    // Wait, verifyMemberHash forces lowercase on name. So passing raw is fine. nothing to do here other than trim.
    const cleanCard = String(cardNumber).trim();
    
    if (!cleanName || !cleanCard || !club) return false;

    // Fetch members file from Supabase
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET;
    if (!bucketName) {
        console.error("SUPABASE_STORAGE_BUCKET not set");
        return false;
    }
    
    const fileName = `${club}-members.json`;
    console.log(`Fetching ${fileName} from bucket ${bucketName}`);
    
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .download(fileName);
            
        if (error) {
            console.warn(`Could not fetch members list for ${club}:`, error.message);
            console.warn(`Details: bucket=${bucketName}, file=${fileName}`);
            // If file doesn't exist, nobody is a member
            return false;
        }
        
        const text = await data.text();
        const members: MemberHash[] = JSON.parse(text);
        
        console.log(`Loaded ${members.length} members. Checking against: [${cleanName}, ${cleanCard}]`);
        
        // Check membership
        // Compute hash once using club ID as salt
        const computed = await hashMemberData(cleanName, cleanCard, club);
        
        // Check if hash exists in the list
        const isMember = members.some(m => m.hash === computed.hash);
        console.log(`Verification result: ${isMember}`);
        return isMember;
        
    } catch (e) {
        console.error("Error during verification:", e);
        return false;
    }
}

export interface PassData {
    name: string;
    studentId: string;
    club: string;
    memberId: string;
}

// Apple Wallet Pass Generator
async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch image: ${url}`);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.warn("Error fetching image for pass", url, e);
        return null;
    }
}

export async function generateApplePass(data: PassData): Promise<Buffer> {
    try {
        console.log("Generating Apple Pass for", data);
        const clubConfig = getClubConfig(data.club);

        // Env Vars for Apple Wallet
        // Ensure multiline keys are handled correctly
        const formatKey = (key: string | undefined) => key ? key.replace(/\\n/g, '\n') : undefined;
        
        const signerCert = formatKey(process.env.APPLE_WALLET_SIGNER_CERT);
        const signerKey = formatKey(process.env.APPLE_WALLET_PRIVATE_KEY);
        const wwdr = formatKey(process.env.APPLE_WALLET_WWDR_CERT);
        const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID;
        const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID;

        // If missing keys, return mock data to prevent runtime crash during development
        if (!signerCert || !signerKey || !wwdr || !passTypeIdentifier || !teamIdentifier) {
            console.warn("Missing Apple Wallet configuration (Certificates/IDs). Returning mock buffer.");
            return Buffer.from("Mock Apple Pass Data - Config Missing");
        }

        // Initialize PKPass
        const pass: any = new PKPass(
            {}, // No template directory
            {
                signerCert,
                signerKey,
                wwdr,
            }
        );

        pass.type = "storeCard"; // Use storeCard layout
        pass.passTypeIdentifier = passTypeIdentifier;
        pass.teamIdentifier = teamIdentifier;
        pass.serialNumber = data.memberId;
        
        pass.organizationName = clubConfig.displayName;
        pass.description = `Membership Pass for ${clubConfig.displayName}`;
        pass.logoText = clubConfig.displayName;
        
        // Colors (match Google Wallet purple theme slightly or club specific?)
        // Google Wallet BG is #dbd5ff (RGB: 219, 213, 255)
        // Let's use that for background
        pass.backgroundColor = "rgb(219, 213, 255)";
        pass.foregroundColor = "rgb(0, 0, 0)";
        pass.labelColor = "rgb(60, 60, 60)";

        // Fields
        // Header / Primary
        pass.primaryFields.add({
            key: "name",
            label: "Name",
            value: data.name
        });

        // Secondary
        pass.secondaryFields.add({
            key: "memberId",
            label: "Member ID",
            value: data.memberId.substring(0, 8).toUpperCase()
        });

        pass.secondaryFields.add({
            key: "validYear",
            label: "Valid Until",
            value: new Date().getFullYear().toString()
        });

        // Barcode
        pass.barcodes = [
            {
                format: "PKBarcodeFormatQR",
                message: data.memberId,
                messageEncoding: "iso-8859-1",
                altText: data.memberId
            }
        ];

        // Images
        // Logo
        if (clubConfig.logoUrl) {
            const logoBuffer = await fetchImageAsBuffer(clubConfig.logoUrl);
            if (logoBuffer) {
                pass.addBuffer("logo.png", logoBuffer);
                pass.addBuffer("logo@2x.png", logoBuffer); // Reusing same resolution for now
                pass.addBuffer("icon.png", logoBuffer);
                pass.addBuffer("icon@2x.png", logoBuffer);
            }
        }

        // Strip/Footer Image
        // Use the Google Wallet footer as strip image
        const footerUrl = "https://c3-pass-assets.vercel.app/google-wallet/footer-v2.png";
        const stripBuffer = await fetchImageAsBuffer(footerUrl);
        if (stripBuffer) {
            pass.addBuffer("strip.png", stripBuffer);
            pass.addBuffer("strip@2x.png", stripBuffer);
        }

        const buffer = await pass.asBuffer();
        return buffer;

    } catch (e) {
        console.error("Error generating Apple pass", e);
        // Return a dummy buffer on error to not block the response? 
        // Or rethrow.
        throw e;
    }
}

// Google Wallet Pass Generator
export async function generateGooglePass(data: PassData): Promise<string> {
    try {
        // Google Wallet uses JWT and REST API
        // 1. Create a GenericClass (once)
        // 2. Create a GenericObject (per user)
        // 3. Create a JWT link
        
        console.log("Generating Google Pass for", data);
        const clubConfig = getClubConfig(data.club);

        // Define the Google Wallet Generic Object
        // Template based on user provided JSON
        const payload = {
            iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "service-account@google.com",
            aud: "google",
            typ: "savetowallet",
            iat: Math.floor(Date.now() / 1000),
            origins: [],
            payload: {
                genericObjects: [
                    {
                        id: `${process.env.GOOGLE_ISSUER_ID}.${data.memberId}`,
                        classId: `${process.env.GOOGLE_ISSUER_ID}.${clubConfig.googleClassIdSuffix}`,
                        logo: {
                            sourceUri: {
                                uri: clubConfig.logoUrl
                            },
                            contentDescription: {
                                defaultValue: {
                                    language: "en-US",
                                    value: "Club Logo"
                                }
                            }
                        },
                        cardTitle: {
                            defaultValue: {
                                language: "en-US",
                                value: clubConfig.displayName
                            }
                        },
                        subheader: {
                            defaultValue: {
                                language: "en-US",
                                value: "Name"
                            }
                        },
                        header: {
                            defaultValue: {
                                language: "en-US",
                                value: data.name
                            }
                        },
                        textModulesData: [
                            {
                                id: "member_id",
                                header: "Member ID",
                                body: data.memberId.substring(0, 8).toUpperCase()
                            },
                            {
                                id: "valid_for",
                                header: "Valid Until",
                                body: new Date().getFullYear().toString()
                            }
                        ],
                        barcode: {
                            type: "QR_CODE",
                            value: data.memberId,
                            alternateText: clubConfig.displayName
                        },
                        hexBackgroundColor: "#dbd5ff",
                        heroImage: {
                            sourceUri: {
                                uri: "https://c3-pass-assets.vercel.app/google-wallet/footer-v2.png"
                            },
                            contentDescription: {
                                defaultValue: {
                                    language: "en-US",
                                    value: "Footer Image"
                                }
                            }
                        }
                    }
                ]
            }
        };

        // Sign the JWT with your Service Account Private Key
        // Ensure GOOGLE_PRIVATE_KEY in .env.local handles newlines correctly (e.g. use \n)
        const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
        
        if (!privateKey) {
             console.warn("Missing GOOGLE_PRIVATE_KEY, returning mock URL");
             return "https://pay.google.com/gp/v/save/mock_token_setup_env_vars";
        }

        const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
        
        return saveUrl;
    } catch (e) {
        console.error("Error generating Google pass", e);
        throw e;
    }
}
