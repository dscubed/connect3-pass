import { NextRequest, NextResponse } from "next/server";
import { listGenericClasses, createOrUpdateGenericClass, deleteGenericClass } from "@/lib/google-class-creator";

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
        const issuerId = process.env.GOOGLE_ISSUER_ID;
        if (!issuerId) {
            return NextResponse.json({ error: "Missing GOOGLE_ISSUER_ID" }, { status: 500 });
        }

        const data = await listGenericClasses(issuerId);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
        const body = await req.json();
        const { id, json } = body;

        // Validation
        if (!id || !json) {
            return NextResponse.json({ error: "Missing 'id' or 'json' body fields" }, { status: 400 });
        }

        let parsedJson;
        try {
            parsedJson = JSON.parse(json);
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
        }
        
        // Ensure the ID in the JSON matches the target ID (or force it)
        const result = await createOrUpdateGenericClass(id, parsedJson);
        
        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing 'id' query parameter" }, { status: 400 });
        }

        await deleteGenericClass(id);
        return NextResponse.json({ success: true, message: `Class ${id} deleted` });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
