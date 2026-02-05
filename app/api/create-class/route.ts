import { NextRequest, NextResponse } from "next/server";
import { createGenericClass } from "@/lib/google-class-creator";
import data from "@/data.json";

export async function GET(req: NextRequest) {
    try {
        const issuerId = process.env.GOOGLE_ISSUER_ID;
        if (!issuerId) {
            return NextResponse.json({ error: "Missing GOOGLE_ISSUER_ID env var" }, { status: 500 });
        }

        // Define your desired class suffix here
        const classSuffix = "connect3-generic-v1"; // Or read from query param

        const result = await createGenericClass(issuerId, classSuffix, data as any);

        return NextResponse.json({
            success: true,
            message: "Class created/updated successfully",
            data: result
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
