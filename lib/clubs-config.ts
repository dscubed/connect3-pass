export interface ClubDefinition {
    id: string; // Unique identifier for logic/slugs
    displayName: string; // Text shown in dropdown
    googleClassIdSuffix: string; // Suffix appended to Issuer ID
    logoUrl?: string; // URL for the club logo
    memberTableColumns: {
        nameColumn: string;
        studentIdColumn: string;
    };
    nameFormat: string; // e.g., "{last}, {first}"
    benefits: string[]; // List of benefits for display
}

export const CLUBS_CONFIG: Record<string, ClubDefinition> = {
    "data-science-student-society": {
        id: "data-science-student-society",
        displayName: "Data Science Student Society",
        googleClassIdSuffix: "club-pass-v1",
        logoUrl: "https://c3-pass-assets.vercel.app/clubs/dscubed-logo.png",
        memberTableColumns: {
            nameColumn: "Name",
            studentIdColumn: "Card Number"
        },
        nameFormat: "{last}, {first}",
        benefits: [
            "Carte Crepes - 10%",
            "Professors Walk Cafe - 10%",
            "Gilbert - 10% on coffee",
        ],
    },
};

// Helper to get list for UI
export const getClubOptions = () => Object.values(CLUBS_CONFIG).map(c => c.displayName);

// Helper to find config by ID or display name
export const getClubConfig = (identifier: string) => {
    return Object.values(CLUBS_CONFIG).find(c => c.id === identifier || c.displayName === identifier) || CLUBS_CONFIG["data-science-student-society"];
};
