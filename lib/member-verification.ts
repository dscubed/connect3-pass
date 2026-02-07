import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export interface MemberHash {
    hash: string;
}

export async function hashMemberData(name: string, cardNumber: string, clubName: string): Promise<MemberHash> {
    // Use club's identifier as salt
    const salt = clubName;
    // Name is stored as "last, first" and case insensitive -> lowercase
    const input = `${name.toLowerCase().trim()}${cardNumber.trim()}`;
    const derivedKey = (await scryptAsync(input, salt, 64)) as Buffer;
    
    return {
        hash: derivedKey.toString("hex")
    };
}

export async function verifyMemberHash(name: string, cardNumber: string, clubName: string, storedHash: string): Promise<boolean> {
    const input = `${name.toLowerCase().trim()}${cardNumber.trim()}`;
    const keyBuffer = Buffer.from(storedHash, "hex");
    const derivedKey = (await scryptAsync(input, clubName, 64)) as Buffer;
    
    return timingSafeEqual(keyBuffer, derivedKey);
}
