'use client';

import { useState, useEffect } from 'react';
import { notFound } from "next/navigation";
import { CLUBS_CONFIG } from '@/lib/clubs-config';
import { uploadMembers } from './actions';

export default function MembersPage() {
    if (process.env.NODE_ENV !== "development") {
        notFound();
    }
    const [selectedClub, setSelectedClub] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (Object.keys(CLUBS_CONFIG).length > 0) {
            setSelectedClub(Object.keys(CLUBS_CONFIG)[0]);
        }
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedClub) return;

        setLoading(true);
        setStatus("Uploading...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("clubId", selectedClub);

        try {
            const result = await uploadMembers(formData);
            setStatus(`Success! Uploaded ${result.count} members for ${CLUBS_CONFIG[selectedClub].displayName}.`);
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50 text-black">
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6">Upload Club Members</h1>
                
                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Club</label>
                        <select 
                            value={selectedClub} 
                            onChange={(e) => setSelectedClub(e.target.value)}
                            className="w-full border rounded p-2"
                        >
                            {Object.values(CLUBS_CONFIG).map((club) => (
                                <option key={club.id} value={club.id}>
                                    {club.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Member CSV</label>
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full border rounded p-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {selectedClub && CLUBS_CONFIG[selectedClub] 
                                ? `Must contain '${CLUBS_CONFIG[selectedClub].memberTableColumns?.nameColumn || "Name"}' and '${CLUBS_CONFIG[selectedClub].memberTableColumns?.studentIdColumn || "Card Number"}' columns`
                                : "Must contain required columns"
                            }
                        </p>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !file}
                        className="w-full bg-blue-600 text-white rounded p-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Uploading...' : 'Upload Data'}
                    </button>
                </form>

                {status && (
                    <div className={`mt-4 p-3 rounded ${status.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
