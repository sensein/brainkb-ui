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
        if (object.includes("//")) {
            processedValue = object.split("/").pop(); // Extract part after ':'

        } else if (object.includes(":")) {
            processedValue = object.split(":").pop(); // Extract file name from file URI
        } else if (object.includes("/")) {
            processedValue = object.split("/").pop();
        } else {
            throw new Error("Unexpected format in object string");
        }

        result[processedKey] = processedValue;

    });

    return result;
};


/**
 * Helper function to process and format S3 file information.
 *
 * @param {String} bucketName - The S3 bucket name.
 * @param {Object} data - The S3 response object containing file metadata.
 * @param {Array} data.Contents - List of objects in the S3 bucket. Each object should have a 'Key' property.
 * @returns {Object} - A dictionary where keys are file paths, and values are formatted file identifiers.
 *
 * Output:
 * {
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/combined/all_data.csv": "COMBINED",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/AmplifiedCdna.csv": "AMPLIFIEDCDNA",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/BarcodedCellSample.csv": "BARCODEDCELLSAMPLE",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/BrainSlab.csv": "BRAINSLAB",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/DissectionRoiPolygon.csv": "DISSECTIONROIPOLYGON",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/DissociatedCellSample.csv": "DISSOCIATEDCELLSAMPLE",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/Donor.csv": "DONOR",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/EnrichedCellSample.csv": "ENRICHEDCELLSAMPLE",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/Library.csv": "LIBRARY",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/LibraryAliquot.csv": "LIBRARYALIQUOT",
 *     "https://brainkb-data-release.s3.us-east-2.amazonaws.com/data-release/bican-rapid-release/10_2024/individual/TissueSample.csv": "TISSUESAMPLE"
 * }
 */
function helper_format_s3_files_information(bucketName, data) {
    const files = {}; // Initialize an empty object to store the formatted file information.
    const filePath = `https://${bucketName}.s3.us-east-2.amazonaws.com`;

    // Iterate over the contents of the S3 response.
    data.Contents.map((item) => {
        const extractedFile = item.Key;

        // Process files that have a .csv or .json extension.
        if (extractedFile.endsWith("csv") || extractedFile.endsWith("json")) {
            // Check if the file name includes the word "combined".
            if (extractedFile.includes("combined")) {
                files[`${filePath}/${extractedFile}`] = "COMBINED"; // Assign a "COMBINED" label to such files.
            } else {
                // For other files, extract the file name and convert it to uppercase.
                const fileName = extractedFile.split("/").pop().split(".")[0];
                files[`${filePath}/${extractedFile}`] = fileName.toUpperCase();
            }
        }
    });
    return files; // Return the formatted file information as an object.
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

    let releasedFiles = {};
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
            { Bucket: BUCKET_NAME },
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