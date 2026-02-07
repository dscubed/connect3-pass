"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Fredoka } from "next/font/google";
import { toPng } from 'html-to-image';
import { CLUBS_CONFIG, getClubConfig } from "@/lib/clubs-config";

const fredoka = Fredoka({ subsets: ["latin"] });

export default function Home() {
  const searchParams = useSearchParams();
  const clubParam = searchParams.get("club");
  
  // Use the query param if it exists and matches a club, otherwise default to empty
  const defaultClubId = (clubParam && getClubConfig(clubParam)?.id === clubParam) ? clubParam : "";
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [clubId, setClubId] = useState(defaultClubId);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedMemberId, setGeneratedMemberId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [googlePassUrl, setGooglePassUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedClubConfig = getClubConfig(clubId);

  const updatePreview = useCallback(async () => {
    if (cardRef.current) {
        try {
            // Generating the image with a virtual width of 500px as requested
            const dataUrl = await toPng(cardRef.current, { 
                width: 380,
            });
            setPreviewUrl(dataUrl);
        } catch (err) {
            console.error("Preview generation failed", err);
        }
    }
  }, []);

  // Preload images to ensure they are available for html-to-image
  useEffect(() => {
    const imageUrls = [
      "https://c3-pass-assets.vercel.app/web-wallet/background.png",
      "https://c3-pass-assets.vercel.app/web-wallet/characters.png"
    ];
    
    Promise.all(imageUrls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.src = url;
            img.crossOrigin = "anonymous";
            img.onload = resolve;
            img.onerror = resolve; // Continue even if one fails
        });
    })).then(() => {
        updatePreview();
    });
  }, [updatePreview]);

  // Update preview when relevant data changes
  useEffect(() => {
    // Small timeout to allow DOM updates to propagate before capturing
    const timer = setTimeout(() => {
        updatePreview();
    }, 100);
    return () => clearTimeout(timer);
  }, [firstName, lastName, clubId, generatedMemberId, updatePreview]);

  // Helper to format name for preview and submission
  const getVerificationName = () => {
      const format = selectedClubConfig?.nameFormat || "{last}, {first}";
      return format
        .replace("{last}", lastName)
        .replace("{first}", firstName);
  };

  const handleDownloadImage = async () => {
    if (cardRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'membership-card.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setMessage("Failed to download image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) {
      setMessage("Error: Please select a club.");
      return;
    }

    e.stopPropagation();
    console.log("Form submitted via JS");

    setLoading(true);
    setMessage("Verifying info and generating pass...");

    try {
      const res = await fetch("/api/issue-pass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            firstName, 
            lastName, 
            studentId, 
            club: clubId 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.memberId) {
            setGeneratedMemberId(data.memberId);
        }
        // In a real scenario, we might redirect or show download buttons
        if (data.googlePassUrl) {
            setGooglePassUrl(data.googlePassUrl);
        }
        if (data.applePassData) {
            // Logic to trigger download of .pkpass
            const blob = new Blob([new Uint8Array(data.applePassData.data)], { type: 'application/vnd.apple.pkpass' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'membership.pkpass';
            a.click();
        }
        setMessage("Passes issued successfully!");
      } else {
        setMessage(`${data.error || "Failed to issue pass"}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center bg-white sm:bg-gray-100 ${fredoka.className} text-base`}>
      <div className="max-w-md w-full items-center justify-center lg:flex sm:border sm:rounded-xl p-4 m-4 bg-white sm:shadow-xl">
        <div className="w-full">
          <h1 className="text-xl font-medium text-center text-brand-purple">Get Your Membership Pass</h1>
          
          <div className="mb-6 flex flex-col items-center space-y-4">
             {/* Card Preview - Hidden Source */}
             <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
                <div ref={cardRef} className="relative w-[380px] max-w-full aspect-[18/25] rounded-2xl shadow-xl flex flex-col items-center gap-4 overflow-hidden text-white p-3 select-none">
                    {/* Background Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="https://c3-pass-assets.vercel.app/web-wallet/background.png"
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ zIndex: -1 }}
                        crossOrigin="anonymous"
                    />

                    {/* Header */}
                    <div className="flex gap-2 items-center w-full">
                        {clubId ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                src={selectedClubConfig.logoUrl} 
                                alt={selectedClubConfig.displayName} 
                                className="w-8 h-8 object-contain rounded-full"
                                crossOrigin="anonymous"
                                />
                                <span className="truncate line-clamp-1 text-shadow-lg" style={{
                                textShadow: '0 0 5px rgba(0,0,0,0.3)',
                                }}>{selectedClubConfig.displayName}</span>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 bg-white rounded-full transition-all" />
                                <span className="truncate line-clamp-1 text-shadow-lg" style={{
                                textShadow: '0 0 5px rgba(0,0,0,0.3)',
                                }}>Select a club</span>
                            </>
                        )}
                    </div>

                    {/* Hero image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src="https://c3-pass-assets.vercel.app/web-wallet/characters.png" 
                      alt="Characters"
                      className="w-64 h-auto object-contain"
                      crossOrigin="anonymous"
                    />

                    {/* Member Info */}
                    <div className="flex justify-between w-full">
                        <div>
                            <div>Name</div>
                            <div className="text-lg font-medium tracking-wider">{ (firstName || lastName) ? `${firstName} ${lastName}`.trim() : "------- ---"}</div>
                        </div>
                        <div className="text-right">
                            <div>Member ID</div>
                            <div className="text-lg font-medium tracking-wider">
                              {generatedMemberId 
                                  ? generatedMemberId.substring(0, 8).toUpperCase() 
                                  : "--------"}
                            </div>
                        </div>
                    </div>

                    {/* Club/Sponsor Area */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 pr-4 flex gap-4 items-center w-max max-w-full">
                        <QRCode
                            size={256}
                            style={{ height: "auto" }}
                            value={generatedMemberId || "preview"}
                            viewBox={`0 0 256 256`}
                            className="w-28 h-28 p-2 bg-white rounded-md"
                        />
                        <div className="min-w-0 flex-1 w-full">
                            <p className="font-medium">Benefits</p>
                            {selectedClubConfig.benefits.map((benefit, idx) => (
                              <span key={idx} className="line-clamp-1 truncate">{benefit}</span>
                            ))}
                        </div>
                    </div>

                    <p className="opacity-50 text-sm text-center mt-auto">Powered by Connect3</p>
                </div>
             </div>

             {/* Visible Preview (PNG) */}
             <div className="w-[500px] max-w-full aspect-[18/25] flex items-center justify-center rounded-2xl shadow-xl overflow-hidden bg-gray-100">
                {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={previewUrl} 
                        alt="Membership Card Preview" 
                        className="w-full h-full object-contain" 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <span className="loading-spinner mb-2"></span>
                        Loading Preview...
                    </div>
                )}
             </div>
             
             {generatedMemberId && (
                <div className="flex flex-col items-center gap-3 mt-4 w-full">
                     {googlePassUrl && (
                        <a 
                            href={googlePassUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src="/google-wallet-button.png" 
                                alt="Add to Google Wallet" 
                                className="h-8 w-auto"
                            />
                        </a>
                     )}
                 
                     <button 
                        type="button"
                        onClick={() => {
                            // Use existing functionality but perhaps with the already generated URL or ref
                            handleDownloadImage();
                        }}
                        className="text-indigo-600 hover:text-indigo-800 underline text-sm"
                     >
                        Download Card as Image
                     </button>
                </div>
             )}
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex space-x-4">
                <div className="flex-1">
                <label htmlFor="firstName" className="block text-sm text-gray-700">First Name</label>
                <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    placeholder="John"
                />
                </div>
                <div className="flex-1">
                <label htmlFor="lastName" className="block text-sm text-gray-700">Last Name</label>
                <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    placeholder="Doe"
                />
                </div>
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm text-gray-700">Student ID</label>
              <input
                type="text"
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                placeholder="12345678"
              />
            </div>

            <div>
              <label htmlFor="club" className="block text-sm text-gray-700">Student Club</label>
              <select
                id="club"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              >
                <option value="">Select a club...</option>
                {Object.values(CLUBS_CONFIG).map((c) => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? "Verifying..." : "Get Membership Pass"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-center p-2 rounded ${
              message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") 
                ? "bg-red-100 text-red-700" 
                : message.toLowerCase().includes("success") 
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
            }`} style={{whiteSpace: 'pre-wrap'}}>
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
