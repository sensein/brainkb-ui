import yaml from 'js-yaml';
import fs from 'fs';

const fetchYamlData = async (filePath, slug = null) => {
    try {

        // Read the file content
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Parse the YAML content
        const data = yaml.load(fileContent);

        // Apply the slug condition if provided
        if (slug) {
            const matchedPage = data.pages.find((page) => page.slug === slug);
            return matchedPage;
        }

        // Return the parsed data
        return data;
    } catch (error) {
        console.error('Error reading YAML file:', error);
        throw error;
    }
};
export default fetchYamlData;