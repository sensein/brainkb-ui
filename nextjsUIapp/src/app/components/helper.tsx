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


 export async  function formatextractPredicateObjectPairs(data) {
  const result = {};

  data.forEach(({ predicate, object }) => {

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

    }else if (object.includes(":")) {
      console.log(object)
     processedValue = object.split(":").pop(); // Extract file name from file URI
    }else{
      processedValue = object.split("/").pop();
    }

    result[processedKey] = processedValue;

  });

  return result;
};