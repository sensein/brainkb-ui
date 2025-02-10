import AWS from 'aws-sdk';
import {iterate} from "glob";

/**
 * Extracts predicate and object values from a JSON array and combines them in the format "predicate value: object value".
 * @param {Array} data - The JSON array to extract values from.
 * @returns {Array} - An array of objects with "predicate" and "object" keys.
 *
 * Input
 * [{"predicate":{"type":"uri","value":"https://w3id.org/biolink/vocab/category"},"object":{"type":"literal","value":"bican:LibraryAliquot","datatype":"http://www.w3.org/2001/XMLSchema#anyURI"}},{"predicate":{"type":"uri","value":"http://www.w3.org/ns/prov#wasDerivedFrom"},"object":{"type":"uri","value":"file:///Users/tekrajchhetri/Documents/rapid_release/new_la_data/LI-KOLOMQ518297"}},{"predicate":{"type":"uri","value":"http://www.w3.org/2000/01/rdf-schema#label"},"object":{"type":"literal","value":"NY-MX12053-7"}}]
 *
 * Output:
 * [{"predicate":"https://w3id.org/biolink/vocab/category","object":"bican:LibraryAliquot"},{"predicate":"http://www.w3.org/ns/prov#wasDerivedFrom","object":"file:///Users/tekrajchhetri/Documents/rapid_release/new_la_data/LI-KOLOMQ518297"},{"predicate":"http://www.w3.org/2000/01/rdf-schema#label","object":"NY-MX12053-7"}]
 */

export async function extractPredicateObjectPairs(data) {
    return data.map((item) => {
        return {
            predicate: item.predicate?.value || "N/A",
            object: item.object?.value || "N/A",
        };
    });
};


/**
 * Processes an array of objects with `predicate` and `object` keys, extracting specific parts of their values.
 * @param {Array<Object>} data - Array of objects containing `predicate` and `object` keys.
 * @returns {Object} - Processed key-value pairs based on the input rules.
 *
 * Input:
 * [{"predicate":"https://w3id.org/biolink/vocab/category","object":"bican:LibraryAliquot"},{"predicate":"http://www.w3.org/ns/prov#wasDerivedFrom","object":"file:///Users/tekrajchhetri/Documents/rapid_release/new_la_data/LI-KOLOMQ518297"},{"predicate":"http://www.w3.org/2000/01/rdf-schema#label","object":"NY-MX12053-7"}]
 *
 * Output:
 * {category: 'LibraryAliquot', wasDerivedFrom: 'LI-KOLOMQ518297', label: 'NY-MX12053-7'}
 */


export async function formatextractPredicateObjectPairs(data) {
    const result = {};

    data.forEach(({predicate, object}) => {

        let processedKey;
        if (predicate.includes("#")) {
            processedKey = predicate.split("#").pop(); // Extract part after '#'
        } else {
            processedKey = predicate.split("/").pop(); // Extract last part of URI
        }

        // Process the object
        let processedValue = object;
        if (typeof object === 'string' && object.includes("//")) {
            processedValue = object.split("/").pop(); // Extract part after ':'

        } else if (typeof object === 'string' && object.includes(":")) {
            processedValue = object.split(":").pop(); // Extract file name from file URI
        } else if (typeof object === 'string' && object.includes("/")) {
            processedValue = object.split("/").pop();
        } else {
            console.error("Unexpected format in object string");
        }

        result[processedKey] = processedValue;

    });

    return result;
};

/**
 * Formats a date string in the format "day_month_year" to "Day Month, Year".
 *
 * @param {string} date - The input date string in "DD_MM_YYYY" format.
 * @returns {string} - The formatted date in "Day Month, Year" format.
 * @throws {Error} - Throws an error if the input date is invalid or cannot be parsed.
 */
function format_date(date) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Validate input: Ensure the input is a string and matches the "DD_MM_YYYY" pattern
    if (typeof date !== "string" || !/^\d{2}_\d{2}_\d{4}$/.test(date)) {
        throw new Error("Invalid date format. Expected format is 'DD_MM_YYYY'.");
    }

    const [day, month, year] = date.split("_");

    // Validate day, month, and year components
    const dayNumber = parseInt(day, 10);
    const monthNumber = parseInt(month, 10);
    const yearNumber = parseInt(year, 10);

    if (isNaN(dayNumber) || isNaN(monthNumber) || isNaN(yearNumber)) {
        throw new Error("Invalid date components. Please ensure all parts are numeric.");
    }

    if (monthNumber < 1 || monthNumber > 12) {
        throw new Error(`Invalid month value: ${month}. Must be between 01 and 12.`);
    }

    if (dayNumber < 1 || dayNumber > 31) {
        throw new Error(`Invalid day value: ${day}. Must be between 01 and 31.`);
    }

    const monthName = months[monthNumber - 1]; // Convert month number to name

    return `${dayNumber} ${monthName}, ${yearNumber}`; // Format the output
}



/**
 * Helper function to process and format S3 file information.
 *
 * @param {String} bucketName - The S3 bucket name.
 * @param {Object} data - The S3 response object containing file metadata.
 * @param {Array} data.Contents - List of objects in the S3 bucket. Each object should have a 'Key' property.
 * @returns {Object} - - A list of dictionaries grouped by date, where each dictionary contains information about releases,
 *  *                    combined files, and individual file types, categorized by folder.
 *
 *
 * Output:
 * [
 *     {
 *         "date": "03_10_2024",
 *         "folders": {
 *             "bican-rapid-release": {
 *                 "release": "BICAN RAPID RELEASE",
 *                 "released_date": "3 October, 2024",
 *                 "combined": {
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/03_10_2024/combined/all_data.csv": "COMBINED"
 *                 },
 *                 "individualtypes": {
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/03_10_2024/individual/AmplifiedCdna.csv": "AMPLIFIEDCDNA",
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/03_10_2024/individual/BarcodedCellSample.csv": "BARCODEDCELLSAMPLE",
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/03_10_2024/individual/BrainSlab.csv": "BRAINSLAB",
 *                 }
 *             }
 *         }
 *     },
 *     {
 *         "date": "05_10_2024",
 *         "folders": {
 *             "bican-rapid-release": {
 *                 "release": "BICAN RAPID RELEASE",
 *                 "released_date": "5 October, 2024",
 *                 "combined": {},
 *                 "individualtypes": {
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/05_10_2024/Brain.json": "BRAIN"
 *                 }
 *             }
 *         }
 *     },
 *     {
 *         "date": "04_11_2024",
 *         "folders": {
 *             "brainkb-cell-data-test": {
 *                 "release": "BRAINKB CELL DATA TEST",
 *                 "released_date": "4 November, 2024",
 *                 "combined": {
 *                     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/brainkb-cell-data-test/04_11_2024/combined/Cell.json": "COMBINED"
 *                 },
 *                 "individualtypes": {}
 *             }
 *         }
 *     }
 * ]
 */
function helper_format_s3_files_information(bucketName, data) {
    const filePath = `https://${bucketName}.s3.us-east-2.amazonaws.com`;
    const datePattern = /\b(\d{2}_\d{2}_\d{4})\b/; // Matches dates in DD_MM_YYYY format
    const groupedFiles = {}; // Store grouped results

    data.Contents.forEach((item) => {
        const extractedFile = item.Key;
        const matchedDate = extractedFile.match(datePattern);

        if (!matchedDate) return; // Skip files without a matching date

        const date = matchedDate[0]; // Extract date (e.g., "03_10_2024")
        const folder = extractedFile.split("/")[1]; // Extract folder (e.g., "bican-rapid-release")
        const release = folder.split("-").map((word) => word.toUpperCase()).join(" ");

        // Ensure structure exists for the date
        if (!groupedFiles[date]) {
            groupedFiles[date] = {};
        }

        // Ensure structure exists for the folder
        if (!groupedFiles[date][folder]) {
            groupedFiles[date][folder] = {
                release,
                released_date: format_date(date),
                combined: {},
                individualtypes: {},
            };
        }

        // Process files with .csv or .json extensions
        if (extractedFile.endsWith("csv") || extractedFile.endsWith("json")) {
            if (extractedFile.includes("combined")) {
                // Handle combined files
                groupedFiles[date][folder].combined[`${filePath}/${extractedFile}`] = "COMBINED";
            } else {
                // Handle individual files
                const fileName = extractedFile.split("/").pop().split(".")[0]; // Extract the file name
                groupedFiles[date][folder].individualtypes[`${filePath}/${extractedFile}`] = fileName.toUpperCase();
            }
        }
    });

    // Convert grouped files into a list of dictionaries
    const groupedFilesList = Object.entries(groupedFiles).map(([date, folders]) => ({
        date,
        folders,
    }));

    return groupedFilesList;
}


/**
 * Fetches all file names from a public S3 bucket.
 *
 * @param {Object} data - An object containing bucket details.
 * @param {Object} data.bucketdetails - Bucket details including region and bucket name.
 * @param {string} data.bucketdetails.region - The region of the S3 bucket.
 * @param {string} data.bucketdetails.bucketname - The name of the S3 bucket.
 * @returns {Promise<Object>} A dictionary where keys are file paths, and values are formatted file identifiers.
 */
export async function get_rapid_release_file(data) {

    const REGION = data?.bucketdetails?.region;
    const BUCKET_NAME = data?.bucketdetails?.bucketname;

    if (!REGION || !BUCKET_NAME) {
        throw new Error('Bucket details (region and bucket name) must be provided.');
    }
    AWS.config.update({region: REGION});
    const s3 = new AWS.S3();
    return new Promise((resolve, reject) => {
        s3.makeUnauthenticatedRequest(
            'listObjectsV2',
            {Bucket: BUCKET_NAME},
            function (err, data) {
                if (err) {
                    console.error("Error fetching files:", err);
                    reject(err); // Reject the Promise if there is an error
                } else {
                    const releasedFiles = helper_format_s3_files_information(BUCKET_NAME, data);
                    resolve(releasedFiles); // Resolve the Promise with the formatted file information
                }
            }
        );
    });
}