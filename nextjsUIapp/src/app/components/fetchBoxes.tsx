import {getData} from "@/src/app/components/getData";
export async function fetchBoxes(query_parameter) {
   const baseurl = process.env.NEXT_PUBLIC_API_ADMIN_HOST || "https://queryservice.brainkb.org";
   const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql"; //default is "query/sparql"
   const formattedQueryParameter = {sparql_query: query_parameter};
   console.log("Fetch boxes: " + formattedQueryParameter);
   const response =  await getData(formattedQueryParameter, endpoint, baseurl);
   console.log("Fetch boxes: " + response.message.results.bindings);
   return response;
};