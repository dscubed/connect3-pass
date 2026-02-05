"use client";

import { useState, useEffect } from "react";

export default function AdminClassesPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [jsonInput, setJsonInput] = useState("");
    const [classIdSuffix, setClassIdSuffix] = useState("connect3-generic-new");
    const [message, setMessage] = useState("");
    const [issuerId, setIssuerId] = useState("");

    // Initial Template for convenience
    const DEFAULT_TEMPLATE = {
      "id": "ISSUER_ID.CLASS_ID_SUFFIX",
      "classTemplateInfo": {
        "cardTemplateOverride": {
          "cardRowTemplateInfos": [
            {
              "twoItems": {
                "startItem": { "firstValue": { "fields": [{ "fieldPath": "object.textModulesData['member_id']" }] } },
                "endItem": { "firstValue": { "fields": [{ "fieldPath": "object.textModulesData['valid_for']" }] } }
              }
            }
          ]
        }
      },
      "logo": {
        "sourceUri": { "uri": "https://c3-pass-assets.vercel.app/clubs/dscubed-logo.png" },
        "contentDescription": { "defaultValue": { "language": "en-US", "value": "Club Logo" } }
      },
      "cardTitle": { "defaultValue": { "language": "en-US", "value": "New Membership" } },
      "header": { "defaultValue": { "language": "en-US", "value": "Club Name" } },
      "textModulesData": [
          { "id": "member_id", "header": "Member ID", "body": "0000" },
          { "id": "valid_for", "header": "Valid Until", "body": "2025" }
      ],
      "reviewStatus": "UNDER_REVIEW"
    };

    useEffect(() => {
        setJsonInput(JSON.stringify(DEFAULT_TEMPLATE, null, 2));
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/classes");
            const data = await res.json();
            if (data.resources) {
                setClasses(data.resources);
            }
        } catch (e) {
            console.error("Failed to fetch classes", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setMessage("Saving...");
        
        // We assume the user wants the FULL ID constructed in the backend or frontend?
        // The simple way: We ask user for Suffix, we construct Full ID, and we enforce it in JSON.
        
        // Fetch Issuer ID from existing class or assume user knows it?
        // Let's assume we can get it from the list or just pass suffix to backend logic?
        // Actually, the API route expects { id: "full_id", json: "..." }
        
        // We need the Issuer ID. Since we can't easily get it client side without exposing it,
        // we'll rely on the existing classes list to find a prefix, or handle it blindly.
        // Let's grab prefix from the first class found, or expect user to provide Full ID if empty list.
        
        let fullId = classIdSuffix;
        if (!fullId.includes(".")) {
            // Try to find prefix
            if (classes.length > 0) {
                 const prefix = classes[0].id.split(".")[0];
                 fullId = `${prefix}.${classIdSuffix}`;
            } else {
                setMessage("Error: Cannot determine Issuer ID (no existing classes). Please enter full ID '123.suffix'");
                return;
            }
        }

        try {
            // Update the ID inside the JSON to match
            const jsonObj = JSON.parse(jsonInput);
            jsonObj.id = fullId;
            const finalJson = JSON.stringify(jsonObj);

            const res = await fetch("/api/admin/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: fullId,
                    json: finalJson
                })
            });
            const result = await res.json();
            
            if (result.success) {
                setMessage(`Success! Class ${fullId} saved.`);
                fetchClasses();
            } else {
                setMessage(`Error: ${result.error}`);
            }
        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        }
    };

    const handleDelete = async (classId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete ${classId}? \nNote: You cannot delete a class if passes have been issued for it.`)) {
            return;
        }

        setMessage(`Deleting ${classId}...`);
        try {
            const res = await fetch(`/api/admin/classes?id=${classId}`, {
                method: "DELETE",
            });
            const result = await res.json();
            
            if (result.success) {
                setMessage(`Deleted ${classId}`);
                fetchClasses();
                // Clear editor if deleted class was selected
                if (classIdSuffix === classId) {
                     setJsonInput(JSON.stringify(DEFAULT_TEMPLATE, null, 2));
                     setClassIdSuffix(""); 
                }
            } else {
                setMessage(`Error deleting: ${result.error}`);
            }
        } catch (err: any) {
            setMessage(`Delete failed: ${err.message}`);
        }
    };

    const loadClassIntoEditor = (cls: any) => {
        setJsonInput(JSON.stringify(cls, null, 2));
        setClassIdSuffix(cls.id); // Load full ID
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-mono text-sm">
            <h1 className="text-3xl font-bold mb-8 text-indigo-700">Google Wallet Class Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Col: List */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">Existing Classes</h2>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <ul className="space-y-2">
                            {classes.map((cls: any) => (
                                <li key={cls.id} className="border p-3 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center" onClick={() => loadClassIntoEditor(cls)}>
                                    <span className="font-bold text-gray-700 truncate mr-2" title={cls.id}>{cls.id}</span>
                                    <div className="flex space-x-2 shrink-0">
                                        <button className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded hover:bg-indigo-200">Edit</button>
                                        <button 
                                            className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded cursor-not-allowed"
                                            title="Google API does not support deletion"
                                            onClick={(e) => { e.stopPropagation(); alert("Google Wallet API does not support deleting classes."); }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {classes.length === 0 && <p className="text-gray-500">No classes found.</p>}
                        </ul>
                    )}
                </div>

                {/* Right Col: Editor */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">Create / Edit Class</h2>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">Class ID (Full or Suffix)</label>
                        <input 
                            type="text" 
                            className="w-full border p-2 rounded font-mono"
                            value={classIdSuffix}
                            onChange={(e) => setClassIdSuffix(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">If existing classes found, you can just type 'mysuffix', otherwise type 'ISSUERID.mysuffix'</p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">JSON Body</label>
                        <textarea 
                            className="w-full h-96 border p-2 rounded font-mono text-xs"
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <button 
                            onClick={handleCreate}
                            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-bold"
                        >
                            Save Class
                        </button>
                        {message && <span className={`text-xs ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>{message}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
