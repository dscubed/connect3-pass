import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export interface MemberHash {
    hash: string;
}

export async function hashMemberData(name: string, studentId: string, clubName: string): Promise<MemberHash> {
    // Use club's identifier as salt
    const salt = clubName;
    // Name is stored as "last, first" and case insensitive -> lowercase
    const input = `${name.toLowerCase().trim()}${studentId.trim()}`;
    const derivedKey = (await scryptAsync(input, salt, 16)) as Buffer;
    
    return {
        hash: derivedKey.toString("hex")
    };
}

export async function verifyMemberHash(name: string, studentId: string, clubName: string, storedHash: string): Promise<boolean> {
    const input = `${name.toLowerCase().trim()}${studentId.trim()}`;
    const keyBuffer = Buffer.from(storedHash, "hex");
    const derivedKey = (await scryptAsync(input, clubName, 16)) as Buffer;
    
    // Prevent timingSafeEqual error if lengths mismatch (e.g. comparing vs old long hash)
    if (keyBuffer.length !== derivedKey.length) {
        return false;
    }

    return timingSafeEqual(keyBuffer, derivedKey);
}
