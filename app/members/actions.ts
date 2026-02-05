'use server';

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashMemberData, MemberHash } from "@/lib/member-verification";
import { getClubConfig } from "@/lib/clubs-config";
import Papa from "papaparse";
import { headers } from "next/headers";

export async function uploadMembers(formData: FormData) {
    const host = headers().get("host");
    if (!host || (!host.includes("localhost") && !host.includes("127.0.0.1"))) {
        throw new Error("This feature is only available on localhost.");
    }

    const file = formData.get("file") as File;
    const clubId = formData.get("clubId") as string;

    if (!file || !clubId) {
        throw new Error("Missing file or club ID");
    }

    const clubConfig = getClubConfig(clubId);
    if (!clubConfig) {
        throw new Error("Invalid club configuration");
    }

    const nameCol = clubConfig.memberTableColumns?.nameColumn || "Name";
    const cardCol = clubConfig.memberTableColumns?.cardNumberColumn || "Card Number";

    const text = await file.text();
    
    // Parse CSV
    const { data, errors } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.toLowerCase().trim().replace(/[\s_]+/g, "") // normalize headers
    });

    if (errors.length > 0) {
        throw new Error(`CSV Parsing Error: ${errors[0].message}`);
    }

    const processedData: MemberHash[] = [];

    // Helper to normalize config column names to match CSV headers
    const normalizeHeader = (h: string) => h.toLowerCase().trim().replace(/[\s_]+/g, "");
    const nameKey = normalizeHeader(nameCol);
    const cardKey = normalizeHeader(cardCol);

    // Process each row
    for (const row of (data as any[])) {
        const nameRaw = row[nameKey];
        const cardRaw = row[cardKey];

        if (nameRaw && cardRaw) {
            // Clean inputs
            // hashMemberData handles lowercasing for name compatibility
            const cleanName = String(nameRaw).trim(); // "Doe, John"
            const cleanCard = String(cardRaw).trim();
            
            const hashed = await hashMemberData(cleanName, cleanCard);
            processedData.push(hashed);
        }
    }

    if (processedData.length === 0) {
        throw new Error(`No valid records found. Ensure CSV has '${nameCol}' and '${cardCol}' columns.`);
    }

    // Upload to Supabase Storage
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error("SUPABASE_STORAGE_BUCKET env var is not set");
    }

    const fileName = `${clubId}-members.json`;
    const fileContent = JSON.stringify(processedData);

    const { error } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, fileContent, {
            contentType: 'application/json',
            upsert: true
        });

    if (error) {
        console.error("Supabase Upload Error:", error);
        throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    return { success: true, count: processedData.length };
}
