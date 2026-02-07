import { NextRequest, NextResponse } from "next/server";
import { verifyStudent, generateApplePass, generateGooglePass, PassData } from "@/lib/pass-generator";
import { getClubConfig } from "@/lib/clubs-config";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { firstName, lastName, studentId, club } = body;

        if (!firstName || !lastName || !studentId || !club) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const clubConfig = getClubConfig(club);
        if (!clubConfig) {
            return NextResponse.json({ error: "Invalid club" }, { status: 400 });
        }

        const nameFormat = clubConfig.nameFormat || "{last}, {first}";
        const verificationName = nameFormat
            .replace("{last}", lastName)
            .replace("{first}", firstName);

        const isValid = await verifyStudent(verificationName, studentId, club);

        if (!isValid) {
            return NextResponse.json({ error: "Verification failed. Invalid Name or Student ID." }, { status: 403 });
        }

        const memberId = uuidv4(); // Generate a unique member ID
        // In a real app, you might look up the user's name from the DB
        
        const displayName = `${firstName} ${lastName}`;

        const passData: PassData = {
            name: displayName, 
            studentId: studentId,
            club,
            memberId
        };

        // Generate passes
        // For Apple Wallet, we typically send back the file content to be downloaded
        // For Google Wallet, we send back a URL to save the pass
        
        // Since we can't easily return two different file types in one JSON response for immediate download without client-side handling,
        // we will return the Google URL and the Apple Pass as a base64 string or similar structure 
        // that the client can handle.
        
        const googlePassUrl = await generateGooglePass(passData);
        
        let applePassData;
        if (process.env.APPLE_WALLET_SIGNER_CERT && 
            process.env.APPLE_WALLET_PRIVATE_KEY && 
            process.env.APPLE_WALLET_WWDR_CERT && 
            process.env.APPLE_WALLET_PASS_TYPE_ID && 
            process.env.APPLE_WALLET_TEAM_ID) {
            try {
                const applePassBuffer = await generateApplePass(passData);
                applePassData = applePassBuffer.toJSON();
            } catch (e) {
                console.error("Failed to generate Apple Pass:", e);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Passes generated successfully",
            googlePassUrl: googlePassUrl,
            applePassData: applePassData,
            memberId: memberId
        });

    } catch (error) {
        console.error("Error in issue-pass:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
