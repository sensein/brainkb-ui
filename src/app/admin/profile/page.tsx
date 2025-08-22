"use client";
import {useState, useEffect, useCallback} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";

// Role constants
const ROLES = {
    SUBMITTER: "Submitter",
    ANNOTATOR: "Annotator",
    MAPPER: "Mapper",
    CURATOR: "Curator",
    REVIEWER: "Reviewer",
    VALIDATOR: "Validator",
    CONFLICT_RESOLVER: "Conflict Resolver",
    KNOWLEDGE_CONTRIBUTOR: "Knowledge Contributor",
    EVIDENCE_TRACER: "Evidence Tracer",
    PROVENANCE_TRACKER: "Provenance Tracker",
    MODERATOR: "Moderator",
    AMBASSADOR: "Ambassador"
} as const;

// Validation functions
const validateEmail = (email: string): string => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
};

const validateORCID = (orcid: string): string => {
    if (!orcid) return "ORCID ID is required";
    // ORCID format: XXXX-XXXX-XXXX-XXXX (16 digits with hyphens)
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;
    if (!orcidRegex.test(orcid)) return "Please enter a valid ORCID ID (format: XXXX-XXXX-XXXX-XXXX)";
    return "";
};

const validateWebsite = (url: string): string => {
    if (!url) return ""; // Website is optional
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        if (!urlObj.protocol.startsWith('http')) return "Please enter a valid URL";
        return "";
    } catch {
        return "Please enter a valid URL";
    }
};

const validateLinkedIn = (linkedin: string): string => {
    if (!linkedin) return ""; // LinkedIn is optional
    // LinkedIn profile URL format
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-]+\/?$/;
    if (!linkedinRegex.test(linkedin)) return "Please enter a valid LinkedIn profile URL";
    return "";
};

const validateGitHub = (github: string): string => {
    if (!github) return ""; // GitHub is optional
    // GitHub username format (alphanumeric and hyphens)
    const githubRegex = /^[a-zA-Z0-9-]+$/;
    if (!githubRegex.test(github)) return "Please enter a valid GitHub username";
    return "";
};

const validateGoogleScholar = (scholar: string): string => {
    if (!scholar) return ""; // Google Scholar is optional
    // Google Scholar ID format (alphanumeric)
    const scholarRegex = /^[a-zA-Z0-9_-]+$/;
    if (!scholarRegex.test(scholar)) return "Please enter a valid Google Scholar ID";
    return "";
};

export default function Profile() {
    const {data: session} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!session || !session.user) {
            router.push("/login");
        }
    }, [session, router]);

    const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea (North)", "Korea (South)", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
    ];
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("activity");
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const tabs = [
        {id: "activity", label: "Activity"},
        {id: "evidenceItems", label: "Evidence Items"},
        {id: "assertions", label: "Assertions"},
        {id: "sourceSuggestions", label: "Source Suggestions"},
    ];


    // Define the new profile data structure
    const [profileData, setProfileData] = useState({
        name: session?.user?.name || "",
        name_prefix: "",
        name_suffix: "",
        email: session?.user?.email || "",
        image: session?.user?.image || "",
        orcid_id: (session?.user as any)?.id || "", // ORCID ID is stored as user.id when authenticated via ORCID
        github: "",
        linkedin: "",
        google_scholar: "",
        website: "",
        conflict_of_interest_statement: "",
        biography: "",
        countries: [
            {
                country: "",
                is_primary: true
            }
        ],
        organizations: [
            {
                organization: "",
                position: "",
                department: "",
                is_primary: true,
                start_date: new Date().toISOString().split('T')[0],
                end_date: null
            }
        ],
        education: [
            {
                degree: "",
                field_of_study: "",
                institution: "",
                graduation_year: new Date().getFullYear(),
                is_primary: true
            }
        ],
        expertise_areas: [
            {
                expertise_area: "",
                level: "",
                years_experience: 1
            }
        ],
        roles: [
            {
                role: "Curator",
                is_active: true
            }
        ]
    });

    console.log("Initial profileData state:", profileData);


    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!session?.user) return;

            try {
                const queryParams = new URLSearchParams({
                    email: session.user.email ?? "",
                    orcid_id: (session.user as any)?.id ?? "",
                });

                const response = await fetch(`/api/user-profile?${queryParams.toString()}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    console.error("Failed to fetch user profile:", await response.text());
                    return;
                }

                const { data } = await response.json();
                
                // Debug logging for organizations data
                console.log("Raw API response data:", data);
                if (data.organizations) {
                    console.log("Organizations data:", data.organizations);
                    data.organizations.forEach((org: any, index: number) => {
                        console.log(`Organization ${index}:`, {
                            name: org.organization,
                            start_date: org.start_date,
                            end_date: org.end_date,
                            start_date_type: typeof org.start_date,
                            end_date_type: typeof org.end_date
                        });
                    });
                }
                
                setProfileData((prev) => ({
                  ...prev,
                  ...data,
                }));
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        fetchUserProfile();
    }, [session]);

    // Debug logging for profileData changes
    useEffect(() => {
        console.log("profileData state updated:", profileData);
        if (profileData.organizations) {
            console.log("Current organizations in state:", profileData.organizations);
        }
    }, [profileData]);


    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
        };
    }, [validationTimeout]);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Helper function to format dates for input fields
    const formatDateForInput = (dateValue: any): string => {
        if (!dateValue) return "";
        
        // If it's already a string in YYYY-MM-DD format, return as is
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        
        // If it's a Date object or timestamp, convert to YYYY-MM-DD
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return "";
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error("Error formatting date:", dateValue, error);
            return "";
        }
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({type, message});
    };

    // Helper function to ensure organizations data is properly initialized
    const ensureOrganizationsData = () => {
        if (!profileData.organizations || profileData.organizations.length === 0) {
            console.log("No organizations found, initializing with default");
            setProfileData(prev => ({
                ...prev,
                organizations: [{
                    organization: "",
                    position: "",
                    department: "",
                    is_primary: true,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: null
                }]
            }));
        } else {
            console.log("Organizations found, ensuring date formatting");
            const updatedOrgs = profileData.organizations.map(org => ({
                ...org,
                start_date: org.start_date || new Date().toISOString().split('T')[0],
                end_date: org.end_date || null
            }));
            setProfileData(prev => ({
                ...prev,
                organizations: updatedOrgs
            }));
        }
    };

    const handleEditToggle = () => {
        console.log("Opening edit modal with current profileData:", profileData);
        if (profileData.organizations) {
            console.log("Organizations data when opening modal:", profileData.organizations);
            profileData.organizations.forEach((org: any, index: number) => {
                console.log(`Modal Organization ${index}:`, {
                    name: org.organization,
                    start_date: org.start_date,
                    end_date: org.end_date,
                    start_date_type: typeof org.start_date,
                    end_date_type: typeof org.end_date
                });
            });
        }
        
        // Ensure organizations data is properly initialized
        ensureOrganizationsData();
        
        setIsEditing(!isEditing);
        setErrors({}); // Clear errors when toggling edit mode
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setProfileData((prevData) => ({...prevData, [name]: value}));

        // Clear previous timeout
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }

        // Set new timeout for debounced validation
        const timeout = setTimeout(() => {
            let errorMessage = "";

            switch (name) {
                case "name":
                    if (!value.trim()) {
                        errorMessage = "Name is required";
                    }
                    break;
                case "email":
                    errorMessage = validateEmail(value);
                    break;
                case "orcidID":
                    errorMessage = validateORCID(value);
                    break;
                case "websiteURL":
                    errorMessage = validateWebsite(value);
                    break;
                case "linkedInID":
                    errorMessage = validateLinkedIn(value);
                    break;
                case "githubID":
                    errorMessage = validateGitHub(value);
                    break;
                case "googlescholarID":
                    errorMessage = validateGoogleScholar(value);
                    break;
                case "role":
                    if (!value.trim()) {
                        errorMessage = "Role is required";
                    }
                    break;
                case "areaOfExpertise":
                    if (!value.trim()) {
                        errorMessage = "Area of expertise is required";
                    }
                    break;
                case "organization":
                    if (!value.trim()) {
                        errorMessage = "Organization is required";
                    }
                    break;
                case "country":
                    if (!value.trim() || value === "N/A") {
                        errorMessage = "Please select a country";
                    }
                    break;
                case "biography":
                    if (!value.trim()) {
                        errorMessage = "Biography is required";
                    }
                    break;
                case "conflict_of_interest":
                    if (!value.trim()) {
                        errorMessage = "Conflict of interest statement is required";
                    }
                    break;
            }

            setErrors(prev => ({...prev, [name]: errorMessage}));
        }, 300); // 300ms delay for better performance

        setValidationTimeout(timeout);
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        // Validate required fields
        if (!profileData.name.trim()) {
            newErrors.name = "Name is required";
        }

        const emailError = validateEmail(profileData.email);
        if (emailError) newErrors.email = emailError;

        const orcidError = validateORCID(profileData.orcid_id);
        if (orcidError) newErrors.orcid_id = orcidError;

        if (!profileData.biography.trim()) {
            newErrors.biography = "Biography is required";
        }

        if (!profileData.conflict_of_interest_statement.trim()) {
            newErrors.conflict_of_interest_statement = "Conflict of interest statement is required";
        }

        // Validate arrays
        if (profileData.countries.length === 0) {
            newErrors.countries = "At least one country is required";
        }

        if (profileData.organizations.length === 0) {
            newErrors.organizations = "At least one organization is required";
        }

        if (profileData.education.length === 0) {
            newErrors.education = "At least one education entry is required";
        }

        if (profileData.expertise_areas.length === 0) {
            newErrors.expertise_areas = "At least one expertise area is required";
        }

        if (profileData.roles.length === 0) {
            newErrors.roles = "At least one role is required";
        }

        // Validate optional fields
        const websiteError = validateWebsite(profileData.website);
        if (websiteError) newErrors.website = websiteError;

        const linkedinError = validateLinkedIn(profileData.linkedin);
        if (linkedinError) newErrors.linkedin = linkedinError;

        const githubError = validateGitHub(profileData.github);
        if (githubError) newErrors.github = githubError;

        const scholarError = validateGoogleScholar(profileData.google_scholar);
        if (scholarError) newErrors.google_scholar = scholarError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    if (!session) {
        //until push back to login show loading
        return <p>Loading...</p>;
    }


    const handleSave = async () => {
        if (validateForm()) {
            try {
                // Clean the data before sending - remove any non-serializable properties
                const cleanProfileData = {
                    ...profileData,
                    // Ensure dates are properly formatted as strings
                    organizations: profileData.organizations.map(org => ({
                        ...org,
                        start_date: org.start_date,
                        end_date: org.end_date
                    })),
                    // Ensure numbers are properly typed
                    education: profileData.education.map(edu => ({
                        ...edu,
                        graduation_year: Number(edu.graduation_year)
                    })),
                    expertise_areas: profileData.expertise_areas.map(exp => ({
                        ...exp,
                        years_experience: Number(exp.years_experience)
                    }))
                };


                const response = await fetch("/api/user-profile", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(cleanProfileData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("API Error Response:", errorText);
                    throw new Error(`Failed to save profile: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                console.log("Profile saved successfully:", result);

                // Show success notification
                showNotification('success', 'Profile saved successfully!');

                // Reset editing state
                setIsEditing(false);
                setErrors({});
            } catch (error) {
                console.error("Error saving profile:", error);
                const errorMessage = error instanceof Error ? error.message : "Failed to save profile. Please try again.";
                showNotification('error', errorMessage);
                setErrors({save: errorMessage});
            }
        }
    };

    return (
        <div className="flex flex-col lg:flex-row max-w-6xl mx-auto p-4">
            {/* Notification Toast */}
            {notification && (
                <div
                    className={`fixed top-4 right-4 z-[10000] p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
                        notification.type === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {notification.type === 'success' ? (
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"/>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                          clipRule="evenodd"/>
                                </svg>
                            )}
                            <span className="font-medium">{notification.message}</span>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-4 text-white hover:text-gray-200 focus:outline-none"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            {/* Sidebar */}
            <aside className="lg:w-1/3 w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6 lg:mb-0">
                <div className="text-center">
                    <img
                        src={profileData.image}
                        alt="Profile"
                        className="w-32 h-32 mx-auto rounded-full mb-4"
                    />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {profileData.name_prefix} {profileData.name} {profileData.name_suffix}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profileData.roles.find(r => r.is_active)?.role || "No active role"}
                    </p>
                    {profileData.orcid_id && (
                        ""
                    )}
                    <div className="flex justify-center mt-5 space-x-4">
                        <div className="relative group">
                            <a
                                href={profileData.website}
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 mr-1"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M10.9 2.01h2.2v1.99h-2.2v-1.99zm-.455 4h3.91l2.356 16.99h-8.622l2.356-16.99zm13.555-2.01v20h-20v-20h20zm-1.49 2h-17.02v16h17.02v-16z"
                                    />
                                </svg>
                                Website
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                Visit <span className="text-white">{profileData.website}</span>
                            </div>


                        </div>
                        <div className="relative group">
                            <a
                                href={`https://orcid.org/${profileData.orcid_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 mr-1"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.514 0-10-4.486-10-10s4.486-10 10-10 10 4.486 10 10-4.486 10-10 10zm-.435-18c-4.545 0-8.235 3.691-8.235 8.235s3.69 8.235 8.235 8.235c4.545 0 8.235-3.691 8.235-8.235s-3.69-8.235-8.235-8.235zm0 15c-3.74 0-6.765-3.025-6.765-6.765s3.025-6.765 6.765-6.765 6.765 3.025 6.765 6.765-3.025 6.765-6.765 6.765zm1.1-10.615l1.445 2.69 2.955.465-2.14 2.085.63 2.915-2.67-1.435-2.67 1.435.63-2.915-2.14-2.085 2.955-.465 1.445-2.69z"
                                    />
                                </svg>
                                ORCID
                                {profileData.orcid_id && (
                                    ""
                                )}
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                {profileData.orcid_id ? `View ORCID profile (${profileData.orcid_id})` : 'No ORCID linked'}
                            </div>
                        </div>
                        <div className="relative group">
                            <a

                                href="mailto:{profileData.email}"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 mr-1"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M20 4h-16c-1.104 0-2 .896-2 2v12c0 1.104.896 2 2 2h16c1.104 0 2-.896 2-2v-12c0-1.104-.896-2-2-2zm-1.2 3.5-6.8 4.5-6.8-4.5h13.6zm.2 10.5h-14v-8l7 4.615 7-4.615v8z"
                                    />
                                </svg>
                                Email
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                Send an email to <span className="text-white">{profileData.email}</span>
                            </div>
                        </div>
                    </div>

                    {/*social links linkedin github*/}
                    <div className="flex justify-center mt-4 space-x-4">
                        <div className="relative group">
                            <a
                                href={profileData.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 20h-3v-9h3v9zm-1.5-10.268c-.966 0-1.75-.797-1.75-1.782s.784-1.782 1.75-1.782 1.75.797 1.75 1.782-.784 1.782-1.75 1.782zm13.5 10.268h-3v-4.5c0-2.486-3-2.296-3 0v4.5h-3v-9h3v1.267c1.396-2.586 6-2.777 6 2.477v5.256z"/>
                                </svg>
                                LinkedIn
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                Visit LinkedIn Profile {profileData.linkedin}
                            </div>
                        </div>
                        {/*github*/}
                        <div className="relative group">
                            <a
                                href={`https://github.com/${profileData.github}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 mr-1"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.207 11.385.6.111.793-.261.793-.58v-2.152c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.091-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.071 1.836 2.809 1.305 3.494.998.108-.775.418-1.305.762-1.605-2.665-.304-5.466-1.333-5.466-5.93 0-1.31.469-2.381 1.235-3.221-.123-.303-.535-1.523.117-3.176 0 0 1.007-.323 3.301 1.23.956-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.004.404 2.292-1.553 3.298-1.23 3.298-1.23.653 1.653.241 2.873.118 3.176.768.84 1.235 1.911 1.235 3.221 0 4.606-2.803 5.624-5.475 5.921.43.37.824 1.096.824 2.212v3.285c0 .322.192.694.799.576C20.565 21.795 24 17.298 24 12c0-6.628-5.372-12-12-12z"
                                    />
                                </svg>
                                GitHub
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                View GitHub {`https://github.com/${profileData.github}`}
                            </div>
                        </div>
                        {/*github end*/}
                        <div className="relative group">
                            <a
                                href={`https://scholar.google.com/citations?user=${profileData.google_scholar}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                Google Scholar
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                View Google Scholar
                                Profile {`https://scholar.google.com/citations?user=${profileData.google_scholar}`}
                            </div>
                        </div>

                    </div>


                    <button
                        onClick={handleEditToggle}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Edit Profile
                    </button>
                </div>

            </aside>

            {/* Main Content */}
            <section className="lg:w-3/4 w-full bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
                {/* Biography */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                        Biography
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {profileData.biography}
                    </p>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Areas of Expertise
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {profileData.expertise_areas.map((expertise, index) => (
                                <div key={index} className="mb-1">
                                    <span className="font-medium">{expertise.expertise_area}</span>
                                    <span
                                        className="text-gray-500"> - {expertise.level} ({expertise.years_experience} years)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Countries
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {profileData.countries.map((country, index) => (
                                <div key={index} className="mb-1">
                                    <span className="font-medium">{country.country}</span>
                                    {country.is_primary && <span className="text-blue-500 ml-2">(Primary)</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Organizations
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {profileData.organizations.map((org, index) => (
                                <div key={index} className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                    <div className="font-medium">{org.organization}</div>
                                    <div className="text-gray-500">{org.position} - {org.department}</div>
                                    <div className="text-xs text-gray-400">
                                        {formatDateForInput(org.start_date)} - {org.end_date ? formatDateForInput(org.end_date) : 'Present'}
                                        {org.is_primary && <span className="text-blue-500 ml-2">(Primary)</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Education Section */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Education
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {profileData.education.map((edu, index) => (
                                    <div key={index} className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        <div className="font-medium">{edu.degree} in {edu.field_of_study}</div>
                                        <div className="text-gray-500">{edu.institution}</div>
                                        <div className="text-xs text-gray-400">
                                            {edu.graduation_year}
                                            {edu.is_primary && <span className="text-blue-500 ml-2">(Primary)</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Roles Section */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Active Roles
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {profileData.roles.filter(r => r.is_active).map((role, index) => (
                                    <span key={index}
                                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                                        {role.role}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Conflict of Interest */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Conflict of Interest Statement
                    </h4>
                    <div className="flex justify-between text-sm mt-2">
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {profileData.conflict_of_interest_statement}
                    </p>
                </div>

                {/* Tabs */}
                {/* Tabs Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-block p-4 font-medium border-b-2 ${
                                    activeTab === tab.id
                                        ? "text-blue-500 border-blue-500"
                                        : "text-gray-500 hover:text-blue-500 border-transparent"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tabs Content */}
                <div className="mt-4">
                    {activeTab === "activity" && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                some text
                            </p>
                            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-blue-500">Some Item:</span>{" "}
                                    Description
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    11 days ago
                                </p>
                            </div>
                        </div>
                    )}
                    {activeTab === "evidenceItems" && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Evidence Items: No new items to display.
                            </p>
                        </div>
                    )}
                    {activeTab === "assertions" && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Assertions: Work in progress.
                            </p>
                        </div>
                    )}
                    {activeTab === "sourceSuggestions" && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Source Suggestions: Submit your ideas!
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Modal */}
            {/* Modal */}
            {isEditing && (() => {
                console.log("Rendering modal with organizations:", profileData.organizations);
                return true;
            })() && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] overflow-auto">
                    <div
                        className="bg-white dark:bg-gray-800 p-6 pb-20 rounded-lg shadow-lg w-3/4 max-h-[85vh] overflow-y-auto relative"
                        style={{zIndex: 10000}}>
                        <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>

                        {/* Basic Information */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Name Prefix</label>
                                <input
                                    type="text"
                                    name="name_prefix"
                                    value={profileData.name_prefix}
                                    onChange={handleInputChange}
                                    placeholder="Dr., Prof., etc."
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.name_prefix ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.name_prefix &&
                                    <p className="text-red-500 text-xs mt-1">{errors.name_prefix}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Name Suffix</label>
                                <input
                                    type="text"
                                    name="name_suffix"
                                    value={profileData.name_suffix}
                                    onChange={handleInputChange}
                                    placeholder="PhD, MD, Jr. etc."
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.name_suffix ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.name_suffix &&
                                    <p className="text-red-500 text-xs mt-1">{errors.name_suffix}</p>}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    readOnly={true}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">ORCID ID</label>
                                <input
                                    type="text"
                                    name="orcid_id"
                                    placeholder="0000-0000-0000-0000"
                                    value={profileData.orcid_id}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.orcid_id ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.orcid_id && <p className="text-red-500 text-xs mt-1">{errors.orcid_id}</p>}
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Website</label>
                                <input
                                    type="url"
                                    name="website"
                                    placeholder="https://example.com"
                                    value={profileData.website}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.website ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">LinkedIn</label>
                                <input
                                    type="url"
                                    name="linkedin"
                                    placeholder="https://linkedin.com/in/username"
                                    value={profileData.linkedin}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.linkedin ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.linkedin && <p className="text-red-500 text-xs mt-1">{errors.linkedin}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">GitHub</label>
                                <input
                                    type="text"
                                    name="github"
                                    placeholder="username"
                                    value={profileData.github}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.github ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.github && <p className="text-red-500 text-xs mt-1">{errors.github}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Google Scholar</label>
                                <input
                                    type="text"
                                    name="google_scholar"
                                    placeholder="Scholar ID"
                                    value={profileData.google_scholar}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.google_scholar ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.google_scholar &&
                                    <p className="text-red-500 text-xs mt-1">{errors.google_scholar}</p>}
                            </div>
                        </div>

                        {/* Countries Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Countries</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newCountries = [...profileData.countries, {
                                            country: "",
                                            is_primary: false
                                        }];
                                        setProfileData(prev => ({...prev, countries: newCountries}));
                                    }}
                                    className="text-blue-500 text-sm hover:text-blue-700"
                                >
                                    + Add Country
                                </button>
                            </div>
                            {profileData.countries.map((country, index) => (
                                <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search country..."
                                            value={country.country}
                                            onChange={(e) => {
                                                const newCountries = [...profileData.countries];
                                                newCountries[index].country = e.target.value;
                                                setProfileData(prev => ({...prev, countries: newCountries}));
                                            }}
                                            onFocus={(e) => {
                                                const dropdown = e.target.nextElementSibling as HTMLDivElement;
                                                if (dropdown) dropdown.style.display = 'block';
                                            }}
                                            onBlur={(e) => {
                                                setTimeout(() => {
                                                    const dropdown = e.target.nextElementSibling as HTMLDivElement;
                                                    if (dropdown) dropdown.style.display = 'none';
                                                }, 200);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <div
                                            className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 hidden max-h-48 overflow-y-auto">
                                            {countries
                                                .filter(c => c.toLowerCase().includes(country.country.toLowerCase()))
                                                .map((c) => (
                                                    <div
                                                        key={c}
                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => {
                                                            const newCountries = [...profileData.countries];
                                                            newCountries[index].country = c;
                                                            setProfileData(prev => ({
                                                                ...prev,
                                                                countries: newCountries
                                                            }));
                                                            const dropdown = document.querySelector(`[data-country-dropdown="${index}"]`) as HTMLDivElement;
                                                            if (dropdown) dropdown.style.display = 'none';
                                                        }}
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="primary_country"
                                            checked={country.is_primary}
                                            onChange={() => {
                                                const newCountries = profileData.countries.map((c, i) => ({
                                                    ...c,
                                                    is_primary: i === index
                                                }));
                                                setProfileData(prev => ({...prev, countries: newCountries}));
                                            }}
                                            className="mr-2"
                                        />
                                        Primary
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Prevent removing the last country
                                            if (profileData.countries.length <= 1) {
                                                showNotification('error', 'At least one country is required');
                                                return;
                                            }
                                            const newCountries = profileData.countries.filter((_, i) => i !== index);
                                            setProfileData(prev => ({...prev, countries: newCountries}));
                                        }}
                                        className="text-red-500 text-sm hover:text-red-700"
                                        disabled={profileData.countries.length <= 1}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {errors.countries && <p className="text-red-500 text-xs mt-1">{errors.countries}</p>}
                        </div>

                        {/* Organizations Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Organizations</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newOrgs = [...profileData.organizations, {
                                            organization: "",
                                            position: "",
                                            department: "",
                                            is_primary: false,
                                            start_date: new Date().toISOString().split('T')[0],
                                            end_date: null
                                        }];
                                        setProfileData(prev => ({...prev, organizations: newOrgs}));
                                    }}
                                    className="text-blue-500 text-sm hover:text-blue-700"
                                >
                                    + Add Organization
                                </button>
                            </div>
                            {profileData.organizations.map((org, index) => {
                                console.log(`Rendering organization ${index}:`, {
                                    name: org.organization,
                                    start_date: org.start_date,
                                    end_date: org.end_date,
                                    formatted_start: formatDateForInput(org.start_date),
                                    formatted_end: formatDateForInput(org.end_date)
                                });
                                return (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Organization Name"
                                            value={org.organization}
                                            onChange={(e) => {
                                                const newOrgs = [...profileData.organizations];
                                                newOrgs[index].organization = e.target.value;
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Position"
                                            value={org.position}
                                            onChange={(e) => {
                                                const newOrgs = [...profileData.organizations];
                                                newOrgs[index].position = e.target.value;
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={org.department}
                                            onChange={(e) => {
                                                const newOrgs = [...profileData.organizations];
                                                newOrgs[index].department = e.target.value;
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="date"
                                            value={formatDateForInput(org.start_date)}
                                            onChange={(e) => {
                                                const newOrgs = [...profileData.organizations];
                                                newOrgs[index].start_date = e.target.value;
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="date"
                                            value={formatDateForInput(org.end_date)}
                                            onChange={(e) => {
                                                const newOrgs = [...profileData.organizations];
                                                newOrgs[index].end_date = e.target.value || null;
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            placeholder="End Date (optional)"
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="primary_org"
                                                checked={org.is_primary}
                                                onChange={() => {
                                                    const newOrgs = profileData.organizations.map((o, i) => ({
                                                        ...o,
                                                        is_primary: i === index
                                                    }));
                                                    setProfileData(prev => ({...prev, organizations: newOrgs}));
                                                }}
                                                className="mr-2"
                                            />
                                            Primary Organization
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Prevent removing the last organization
                                                if (profileData.organizations.length <= 1) {
                                                    showNotification('error', 'At least one organization is required');
                                                    return;
                                                }
                                                const newOrgs = profileData.organizations.filter((_, i) => i !== index);
                                                setProfileData(prev => ({...prev, organizations: newOrgs}));
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700"
                                            disabled={profileData.organizations.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                            })}
                            {errors.organizations &&
                                <p className="text-red-500 text-xs mt-1">{errors.organizations}</p>}
                        </div>

                        {/* Education Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Education</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newEdu = [...profileData.education, {
                                            degree: "",
                                            field_of_study: "",
                                            institution: "",
                                            graduation_year: new Date().getFullYear(),
                                            is_primary: false
                                        }];
                                        setProfileData(prev => ({...prev, education: newEdu}));
                                    }}
                                    className="text-blue-500 text-sm hover:text-blue-700"
                                >
                                    + Add Education
                                </button>
                            </div>
                            {profileData.education.map((edu, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Degree"
                                            value={edu.degree}
                                            onChange={(e) => {
                                                const newEdu = [...profileData.education];
                                                newEdu[index].degree = e.target.value;
                                                setProfileData(prev => ({...prev, education: newEdu}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Field of Study"
                                            value={edu.field_of_study}
                                            onChange={(e) => {
                                                const newEdu = [...profileData.education];
                                                newEdu[index].field_of_study = e.target.value;
                                                setProfileData(prev => ({...prev, education: newEdu}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Institution"
                                            value={edu.institution}
                                            onChange={(e) => {
                                                const newEdu = [...profileData.education];
                                                newEdu[index].institution = e.target.value;
                                                setProfileData(prev => ({...prev, education: newEdu}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Graduation Year"
                                            value={edu.graduation_year}
                                            onChange={(e) => {
                                                const newEdu = [...profileData.education];
                                                newEdu[index].graduation_year = parseInt(e.target.value);
                                                setProfileData(prev => ({...prev, education: newEdu}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="primary_edu"
                                                checked={edu.is_primary}
                                                onChange={() => {
                                                    const newEdu = profileData.education.map((e, i) => ({
                                                        ...e,
                                                        is_primary: i === index
                                                    }));
                                                    setProfileData(prev => ({...prev, education: newEdu}));
                                                }}
                                                className="mr-2"
                                            />
                                            Primary Education
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Prevent removing the last education entry
                                                if (profileData.education.length <= 1) {
                                                    showNotification('error', 'At least one education entry is required');
                                                    return;
                                                }
                                                const newEdu = profileData.education.filter((_, i) => i !== index);
                                                setProfileData(prev => ({...prev, education: newEdu}));
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700"
                                            disabled={profileData.education.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
                        </div>

                        {/* Expertise Areas Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Areas of Expertise</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newExpertise = [...profileData.expertise_areas, {
                                            expertise_area: "",
                                            level: "",
                                            years_experience: 1
                                        }];
                                        setProfileData(prev => ({...prev, expertise_areas: newExpertise}));
                                    }}
                                    className="text-blue-500 text-sm hover:text-blue-700"
                                >
                                    + Add Expertise
                                </button>
                            </div>
                            {profileData.expertise_areas.map((expertise, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                                    <div className="grid grid-cols-3 gap-4 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Expertise Area"
                                            value={expertise.expertise_area}
                                            onChange={(e) => {
                                                const newExpertise = [...profileData.expertise_areas];
                                                newExpertise[index].expertise_area = e.target.value;
                                                setProfileData(prev => ({...prev, expertise_areas: newExpertise}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                        <select
                                            value={expertise.level}
                                            onChange={(e) => {
                                                const newExpertise = [...profileData.expertise_areas];
                                                newExpertise[index].level = e.target.value;
                                                setProfileData(prev => ({...prev, expertise_areas: newExpertise}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Years of Experience"
                                            value={expertise.years_experience}
                                            onChange={(e) => {
                                                const newExpertise = [...profileData.expertise_areas];
                                                newExpertise[index].years_experience = parseInt(e.target.value);
                                                setProfileData(prev => ({...prev, expertise_areas: newExpertise}));
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Prevent removing the last expertise area
                                                if (profileData.expertise_areas.length <= 1) {
                                                    showNotification('error', 'At least one expertise area is required');
                                                    return;
                                                }
                                                const newExpertise = profileData.expertise_areas.filter((_, i) => i !== index);
                                                setProfileData(prev => ({...prev, expertise_areas: newExpertise}));
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700"
                                            disabled={profileData.expertise_areas.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {errors.expertise_areas &&
                                <p className="text-red-500 text-xs mt-1">{errors.expertise_areas}</p>}
                        </div>

                        {/* Roles Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Roles</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newRoles = [...profileData.roles, {
                                            role: "",
                                            is_active: true
                                        }];
                                        setProfileData(prev => ({...prev, roles: newRoles}));
                                    }}
                                    className="text-blue-500 text-sm hover:text-blue-700"
                                >
                                    + Add Role
                                </button>
                            </div>
                            {profileData.roles.map((role, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search role..."
                                                value={role.role}
                                                onChange={(e) => {
                                                    const newRoles = [...profileData.roles];
                                                    newRoles[index].role = e.target.value;
                                                    setProfileData(prev => ({...prev, roles: newRoles}));
                                                }}
                                                onFocus={(e) => {
                                                    const dropdown = e.target.nextElementSibling as HTMLDivElement;
                                                    if (dropdown) dropdown.style.display = 'block';
                                                }}
                                                onBlur={(e) => {
                                                    setTimeout(() => {
                                                        const dropdown = e.target.nextElementSibling as HTMLDivElement;
                                                        if (dropdown) dropdown.style.display = 'none';
                                                    }, 200);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                            />
                                            <div
                                                className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 hidden max-h-48 overflow-y-auto">
                                                {Object.values(ROLES)
                                                    .filter(roleName => roleName.toLowerCase().includes(role.role.toLowerCase()))
                                                    .map((roleName) => (
                                                        <div
                                                            key={roleName}
                                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                            onClick={() => {
                                                                const newRoles = [...profileData.roles];
                                                                newRoles[index].role = roleName;
                                                                setProfileData(prev => ({...prev, roles: newRoles}));
                                                                const dropdown = document.querySelector(`[data-role-dropdown="${index}"]`) as HTMLDivElement;
                                                                if (dropdown) dropdown.style.display = 'none';
                                                            }}
                                                        >
                                                            {roleName}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={role.is_active}
                                                onChange={(e) => {
                                                    const newRoles = [...profileData.roles];
                                                    newRoles[index].is_active = e.target.checked;
                                                    setProfileData(prev => ({...prev, roles: newRoles}));
                                                }}
                                                className="mr-2"
                                            />
                                            Active Role
                                        </label>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Prevent removing the last role
                                                if (profileData.roles.length <= 1) {
                                                    showNotification('error', 'At least one role is required');
                                                    return;
                                                }
                                                const newRoles = profileData.roles.filter((_, i) => i !== index);
                                                setProfileData(prev => ({...prev, roles: newRoles}));
                                            }}
                                            className="text-red-500 text-sm hover:text-red-700"
                                            disabled={profileData.roles.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {errors.roles && <p className="text-red-500 text-xs mt-1">{errors.roles}</p>}
                        </div>

                        {/* Biography and Conflict of Interest */}
                        <div className="mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Biography</label>
                                <textarea
                                    name="biography"
                                    value={profileData.biography}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.biography ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                    rows={4}
                                    placeholder="Tell us about your background, research interests, and expertise..."
                                />
                                {errors.biography && <p className="text-red-500 text-xs mt-1">{errors.biography}</p>}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Conflict of Interest Statement</label>
                                <textarea
                                    name="conflict_of_interest_statement"
                                    value={profileData.conflict_of_interest_statement}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.conflict_of_interest_statement ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                    rows={3}
                                    placeholder="Declare any potential conflicts of interest..."
                                />
                                {errors.conflict_of_interest_statement &&
                                    <p className="text-red-500 text-xs mt-1">{errors.conflict_of_interest_statement}</p>}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end pt-6 pb-4">
                            <button
                                onClick={handleEditToggle}
                                className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/*    End model*/}
        </div>
    );
}
