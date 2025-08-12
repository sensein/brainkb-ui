"use client";
import {useState, useEffect, useCallback} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";

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
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

    const tabs = [
        { id: "activity", label: "Activity" },
        { id: "evidenceItems", label: "Evidence Items" },
        { id: "assertions", label: "Assertions" },
        { id: "sourceSuggestions", label: "Source Suggestions" },
    ];
    const [profileData, setProfileData] = useState({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        image: session?.user?.image || "",
        areaOfExpertise: "N/A",
        role: "Curator",
        websiteURL: "",
        linkedInID:"",
        githubID: "",
        googlescholarID:"",
        orcidID: "000-000-00",
        country: "N/A",
        organization: "N/A",
        biography: "N/A",
        conflict_of_interest:"I do not have any potential conflicts of interest."
    });

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
        };
    }, [validationTimeout]);

    const handleEditToggle = () => {
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
        const newErrors: {[key: string]: string} = {};
        
        // Validate required fields
        if (!profileData.name.trim()) {
            newErrors.name = "Name is required";
        }
        
        const emailError = validateEmail(profileData.email);
        if (emailError) newErrors.email = emailError;
        
        const orcidError = validateORCID(profileData.orcidID);
        if (orcidError) newErrors.orcidID = orcidError;
        
        if (!profileData.role.trim()) {
            newErrors.role = "Role is required";
        }
        
        if (!profileData.areaOfExpertise.trim()) {
            newErrors.areaOfExpertise = "Area of expertise is required";
        }
        
        if (!profileData.organization.trim()) {
            newErrors.organization = "Organization is required";
        }
        
        if (!profileData.country.trim() || profileData.country === "N/A") {
            newErrors.country = "Please select a country";
        }
        
        if (!profileData.biography.trim()) {
            newErrors.biography = "Biography is required";
        }
        
        if (!profileData.conflict_of_interest.trim()) {
            newErrors.conflict_of_interest = "Conflict of interest statement is required";
        }
        
        // Validate optional fields
        const websiteError = validateWebsite(profileData.websiteURL);
        if (websiteError) newErrors.websiteURL = websiteError;
        
        const linkedinError = validateLinkedIn(profileData.linkedInID);
        if (linkedinError) newErrors.linkedInID = linkedinError;
        
        const githubError = validateGitHub(profileData.githubID);
        if (githubError) newErrors.githubID = githubError;
        
        const scholarError = validateGoogleScholar(profileData.googlescholarID);
        if (scholarError) newErrors.googlescholarID = scholarError;
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    if (!session) {
        //until push back to login show loading
        return <p>Loading...</p>;
    }

    const handleSave = () => {
        if (validateForm()) {
            // Add save logic here, e.g., an API call
            setIsEditing(false);
            setErrors({});
        }
    };

    return (
        <div className="flex flex-col lg:flex-row max-w-6xl mx-auto p-4">
            {/* Sidebar */}
            <aside className="lg:w-1/3 w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md mb-6 lg:mb-0">
                <div className="text-center">
                    <img
                        src={profileData.image}
                        alt="Profile"
                        className="w-32 h-32 mx-auto rounded-full mb-4"
                    />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {profileData.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profileData.role}
                    </p>
                    <div className="flex justify-center mt-5 space-x-4">
                        <div className="relative group">
                            <a
                                href={profileData.websiteURL}
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
                                Visit <span className="text-white">{profileData.websiteURL}</span>
                            </div>


                        </div>
                        <div className="relative group">
                            <a
                                href={`https://orcid.org/${profileData.orcidID}`}
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
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                View ORCID profile
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
                                 href={`https://linkedin.com/in/${profileData.linkedInID}`}
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
                                Visit LinkedIn Profile {`https://linkedin.com/in/${profileData.linkedInID}`}
                            </div>
                        </div>
                        {/*github*/}
                        <div className="relative group">
                            <a
                                   href={`https://github.com/${profileData.githubID}`}
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
                                View GitHub {`https://github.com/${profileData.githubID}`}
                            </div>
                        </div>
                        {/*github end*/}
                        <div className="relative group">
                            <a
                                 href={`https://scholar.google.com/citations?user=${profileData.googlescholarID}`}
                                 target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 flex items-center"
                            >
                                Google Scholar
                            </a>
                            <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded-md shadow-lg px-3 py-1 opacity-1000 z-20"
                            >
                                View Google Scholar Profile {`https://scholar.google.com/citations?user=${profileData.googlescholarID}`}
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
                            Area of Expertise (E.g., Machine learning, Knowledge Graphs)
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {profileData.areaOfExpertise}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Country
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {profileData.country}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Organization (Provide in comma separated format if multiple.)
                        </h4>
                        <p className="text-sm text-blue-500 hover:underline">
                            {profileData.organization}
                        </p>

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
                        {profileData.conflict_of_interest}
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
            {isEditing && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
                    <div
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-1/2 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
                        <div className="grid grid-cols-2 gap-4">
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
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <input
                                    type="text"
                                    name="role"
                                    value={profileData.role}
                                    readOnly={true}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.role ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Website</label>
                                <input
                                    type="url"
                                    name="websiteURL"
                                    placeholder="https://example.com"
                                    value={profileData.websiteURL}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.websiteURL ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.websiteURL && <p className="text-red-500 text-xs mt-1">{errors.websiteURL}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">ORCID ID</label>
                                <input
                                    type="text"
                                    name="orcidID"
                                    placeholder="0000-0000-0000-0000"
                                    value={profileData.orcidID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.orcidID ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.orcidID && <p className="text-red-500 text-xs mt-1">{errors.orcidID}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">LinkedIn</label>
                                <input
                                    type="url"
                                    name="linkedInID"
                                    placeholder="https://linkedin.com/in/username"
                                    value={profileData.linkedInID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.linkedInID ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.linkedInID && <p className="text-red-500 text-xs mt-1">{errors.linkedInID}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">GitHub</label>
                                <input
                                    type="text"
                                    name="githubID"
                                    placeholder="username"
                                    value={profileData.githubID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.githubID ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.githubID && <p className="text-red-500 text-xs mt-1">{errors.githubID}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Google Scholar</label>
                                <input
                                    type="text"
                                    name="googlescholarID"
                                    placeholder="Scholar ID"
                                    value={profileData.googlescholarID}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.googlescholarID ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.googlescholarID && <p className="text-red-500 text-xs mt-1">{errors.googlescholarID}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Area of Expertise</label>
                                <input
                                    type="text"
                                    name="areaOfExpertise"
                                    value={profileData.areaOfExpertise}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.areaOfExpertise ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.areaOfExpertise && <p className="text-red-500 text-xs mt-1">{errors.areaOfExpertise}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Organization</label>
                                <input
                                    type="text"
                                    name="organization"
                                    value={profileData.organization}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.organization ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                />
                                {errors.organization && <p className="text-red-500 text-xs mt-1">{errors.organization}</p>}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Country</label>
                                <select
                                    name="country"
                                    value={profileData.country}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                        errors.country ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                    }`}
                                >
                                    {countries.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                            </div>
                        </div>
                        {/*conflict of interest*/}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Conflict of Interest Statement</label>
                            <textarea
                                name="conflict_of_interest"
                                value={profileData.conflict_of_interest || "I do not have any potential conflicts of interest."}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                    errors.conflict_of_interest ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                rows={5}
                            ></textarea>
                            {errors.conflict_of_interest && <p className="text-red-500 text-xs mt-1">{errors.conflict_of_interest}</p>}
                        </div>
                        {/* Biography section */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Biography</label>
                            <textarea
                                name="biography"
                                value={profileData.biography}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
                                    errors.biography ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                rows={5}
                            ></textarea>
                            {errors.biography && <p className="text-red-500 text-xs mt-1">{errors.biography}</p>}
                        </div>

                        <div className="flex justify-end">
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
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/*    End model*/}
        </div>
    );
}
