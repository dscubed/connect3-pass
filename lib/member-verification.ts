import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export interface MemberHash {
    hash: string;
    salt: string;
}

export async function hashMemberData(name: string, cardNumber: string): Promise<MemberHash> {
    const salt = randomBytes(16).toString("hex");
    // Name is stored as "last, first" and case insensitive -> lowercase
    const input = `${name.toLowerCase().trim()}${cardNumber.trim()}`;
    const derivedKey = (await scryptAsync(input, salt, 64)) as Buffer;
    
    return {
        hash: derivedKey.toString("hex"),
        salt: salt
    };
}

export async function verifyMemberHash(name: string, cardNumber: string, storedHash: string, storedSalt: string): Promise<boolean> {
    const input = `${name.toLowerCase().trim()}${cardNumber.trim()}`;
    const keyBuffer = Buffer.from(storedHash, "hex");
    const derivedKey = (await scryptAsync(input, storedSalt, 64)) as Buffer;
    
    return timingSafeEqual(keyBuffer, derivedKey);
}
