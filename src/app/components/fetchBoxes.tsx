import {getData} from "@/src/app/components/getData";
export async function fetchBoxes(query_parameter) {
   const formattedQueryParameter = {sparql_query: query_parameter};
   console.log("Fetch boxes: " + formattedQueryParameter);
   const response = await getData(formattedQueryParameter);
   console.log("Fetch boxes: " + response.message.results.bindings);
   return response;
};