/**
 * AWS S3 helper utilities
 */
import AWS from 'aws-sdk';
import { formatDate } from '@/src/utils/formatting/date';

/**
 * Helper function to process and format S3 file information.
 *
 * @param bucketName - The S3 bucket name.
 * @param data - The S3 response object containing file metadata.
 * @param data.Contents - List of objects in the S3 bucket. Each object should have a 'Key' property.
 * @returns A list of dictionaries grouped by date, where each dictionary contains information about releases,
 *          combined files, and individual file types, categorized by folder.
 */
function helperFormatS3FilesInformation(
  bucketName: string,
  data: { Contents?: Array<{ Key: string }> }
): Array<{
  date: string;
  folders: Record<
    string,
    {
      release: string;
      released_date: string;
      combined: Record<string, string>;
      individualtypes: Record<string, string>;
    }
  >;
}> {
  const filePath = `https://${bucketName}.s3.us-east-2.amazonaws.com`;
  const datePattern = /\b(\d{2}_\d{2}_\d{4})\b/; // Matches dates in DD_MM_YYYY format
  const groupedFiles: Record<
    string,
    Record<
      string,
      {
        release: string;
        released_date: string;
        combined: Record<string, string>;
        individualtypes: Record<string, string>;
      }
    >
  > = {}; // Store grouped results

  if (!data.Contents) {
    return [];
  }

  data.Contents.forEach((item) => {
    const extractedFile = item.Key;
    const matchedDate = extractedFile.match(datePattern);

    if (!matchedDate) return; // Skip files without a matching date

    const date = matchedDate[0]; // Extract date (e.g., "03_10_2024")
    const folder = extractedFile.split('/')[1]; // Extract folder (e.g., "bican-rapid-release")
    const release = folder
      .split('-')
      .map((word) => word.toUpperCase())
      .join(' ');

    // Ensure structure exists for the date
    if (!groupedFiles[date]) {
      groupedFiles[date] = {};
    }

    // Ensure structure exists for the folder
    if (!groupedFiles[date][folder]) {
      groupedFiles[date][folder] = {
        release,
        released_date: formatDate(date),
        combined: {},
        individualtypes: {},
      };
    }

    // Process files with .csv or .json extensions
    if (extractedFile.endsWith('csv') || extractedFile.endsWith('json')) {
      if (extractedFile.includes('combined')) {
        // Handle combined files
        groupedFiles[date][folder].combined[
          `${filePath}/${extractedFile}`
        ] = 'COMBINED';
      } else {
        // Handle individual files
        const fileName = extractedFile.split('/').pop()?.split('.')[0] || ''; // Extract the file name
        groupedFiles[date][folder].individualtypes[
          `${filePath}/${extractedFile}`
        ] = fileName.toUpperCase();
      }
    }
  });

  // Convert grouped files into a list of dictionaries
  const groupedFilesList = Object.entries(groupedFiles).map(
    ([date, folders]) => ({
      date,
      folders,
    })
  );

  return groupedFilesList;
}

/**
 * Fetches all file names from a public S3 bucket.
 *
 * @param data - An object containing bucket details.
 * @param data.bucketdetails - Bucket details including region and bucket name.
 * @param string data.bucketdetails.region - The region of the S3 bucket.
 * @param string data.bucketdetails.bucketname - The name of the S3 bucket.
 * @returns A dictionary where keys are file paths, and values are formatted file identifiers.
 */
export async function getRapidReleaseFile(data: {
  bucketdetails?: { region?: string; bucketname?: string };
}): Promise<
  Array<{
    date: string;
    folders: Record<
      string,
      {
        release: string;
        released_date: string;
        combined: Record<string, string>;
        individualtypes: Record<string, string>;
      }
    >;
  }>
> {
  const REGION = data?.bucketdetails?.region;
  const BUCKET_NAME = data?.bucketdetails?.bucketname;

  if (!REGION || !BUCKET_NAME) {
    throw new Error(
      'Bucket details (region and bucket name) must be provided.'
    );
  }
  AWS.config.update({ region: REGION });
  const s3 = new AWS.S3();
  return new Promise((resolve, reject) => {
    s3.makeUnauthenticatedRequest(
      'listObjectsV2',
      { Bucket: BUCKET_NAME },
      function (err, data) {
        if (err) {
          console.error('Error fetching files:', err);
          reject(err);
        } else {
          const allfiles = helperFormatS3FilesInformation(BUCKET_NAME, data);
          resolve(allfiles);
        }
      }
    );
  });
}

